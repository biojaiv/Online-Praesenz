"""Build the shared portal machine: a satellite orrery that unfolds into a frame.

Run: blender --background --python scripts/portal/build_portal.py

The closed state follows the distant NEBENMASCHINE discs; frame 72 is the open
portal. Corner arcs and side rails keep their topology and morph between the
two states through a single shape key ("Offen"), so the glTF export carries
one animation clip with node transforms and morph weights. Materials are
appended from Hintergrund.blend to match the Orrery exactly.
"""

import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'Elemente/Orrery/Hintergrund.blend'
TARGET = ROOT / 'Elemente/Orrery/Portal_Nebenmaschine.blend'

# Open frame (Blender units): outer 8.0 x 5.0, inner aperture 7.6 x 4.6.
R_OUT, R_IN = 0.95, 0.75            # corner radii of the outer and inner rail
CX, CY = 4.0 - R_OUT, 2.5 - R_OUT   # corner arc centres
# Closed disc radii.
CORNER_RING = (2.0, 1.86)           # outer double rail -> corners
SIDE_RING = (1.62, 1.50)            # inner double rail -> sides
RAIL = 0.034                        # rail tube radius, closed disc (matches the Orrery wire)
RAIL_OPEN = 0.056                   # the open frame grows into a solid border
RUNG = 0.011
RUNG_OPEN = 0.017
GIMBAL_RADIUS = 1.08
GEAR_INNER, GEAR_OUTER, GEAR_TOOTH = 0.21, 0.42, 0.06
CORNER_ORNAMENT = 0.85              # diagonal offset of gear and gimbal: on the rail band, clear of the aperture

F_START, F_OPEN, F_END = 1, 60, 72
TITAN, MESSING, GRAPHIT, GLOW = range(4)


# --------------------------------------------------------------------------- scene
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = F_START, F_END
    scene.render.fps = 24
    return scene


def materials():
    names = ['V2 / Titan', 'V2 / Messing', 'V2 / Graphit']
    with bpy.data.libraries.load(str(SOURCE), link=False) as (src, dst):
        dst.materials = [name for name in src.materials if name in names]
    mats = [bpy.data.materials[name] for name in names]
    glow = bpy.data.materials.new('PORTAL / Innenleuchten')
    glow.use_nodes = True
    nodes = glow.node_tree.nodes
    bsdf = nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.0, 0.0, 0.0, 1.0)
    bsdf.inputs['Emission Color'].default_value = (0.30, 0.78, 1.0, 1.0)
    bsdf.inputs['Emission Strength'].default_value = 2.5
    return mats + [glow]


def collection(name, parent=None):
    col = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(col)
    return col


# --------------------------------------------------------------------------- mesh building
class Builder:
    """Collects matching basis/open vertex positions for one morphing mesh."""

    def __init__(self):
        self.basis, self.open, self.faces, self.mats = [], [], [], []

    def _vert(self, b, o):
        self.basis.append(Vector(b))
        self.open.append(Vector(o if o is not None else b))
        return len(self.basis) - 1

    def tube(self, path, n, radius, mat, sides=10, t0=0.0, t1=1.0, caps=True):
        """Sweep a circle along path(t) -> (pos_b, nrm_b, pos_o, nrm_o) in the XZ plane.

        `radius` may be a (closed, open) pair so the tube thickens while unfolding.
        """
        rb, ro = radius if isinstance(radius, tuple) else (radius, radius)
        rings = []
        for i in range(n + 1):
            t = t0 + (t1 - t0) * i / n
            pb, nb, po, no = path(t)
            ring = []
            for k in range(sides):
                phi = 2 * math.pi * k / sides
                c, s = math.cos(phi), math.sin(phi)
                ring.append(self._vert(
                    (pb[0] + nb[0] * c * rb, s * rb, pb[1] + nb[1] * c * rb),
                    (po[0] + no[0] * c * ro, s * ro, po[1] + no[1] * c * ro)))
            rings.append(ring)
        for a, b in zip(rings, rings[1:]):
            for k in range(sides):
                self._face((a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k]), mat)
        if caps:
            self._face(tuple(reversed(rings[0])), mat)
            self._face(tuple(rings[-1]), mat)

    def sphere(self, cb, co, radius, mat, seg=12, rings=8, y=0.0):
        """UV sphere centred at cb (basis) and co (open), both (x, z)."""
        co = co if co is not None else cb
        verts = []
        for j in range(1, rings):
            theta = math.pi * j / rings
            row = []
            for k in range(seg):
                phi = 2 * math.pi * k / seg
                d = (math.sin(theta) * math.cos(phi), math.cos(theta), math.sin(theta) * math.sin(phi))
                row.append(self._vert(
                    (cb[0] + d[0] * radius, y + d[1] * radius, cb[1] + d[2] * radius),
                    (co[0] + d[0] * radius, y + d[1] * radius, co[1] + d[2] * radius)))
            verts.append(row)
        top = self._vert((cb[0], y + radius, cb[1]), (co[0], y + radius, co[1]))
        bottom = self._vert((cb[0], y - radius, cb[1]), (co[0], y - radius, co[1]))
        for k in range(seg):
            k2 = (k + 1) % seg
            self._face((top, verts[0][k2], verts[0][k]), mat)
            self._face((bottom, verts[-1][k], verts[-1][k2]), mat)
        for a, b in zip(verts, verts[1:]):
            for k in range(seg):
                k2 = (k + 1) % seg
                self._face((a[k], a[k2], b[k2], b[k]), mat)

    def prism(self, outline, depth, mat, y=0.0):
        """Extrude a 2D (x, z) outline along Y; no morph."""
        front = [self._vert((x, y - depth / 2, z), None) for x, z in outline]
        back = [self._vert((x, y + depth / 2, z), None) for x, z in outline]
        self._face(tuple(reversed(front)), mat)
        self._face(tuple(back), mat)
        n = len(outline)
        for k in range(n):
            k2 = (k + 1) % n
            self._face((front[k], front[k2], back[k2], back[k]), mat)

    def _face(self, idx, mat):
        self.faces.append(idx)
        self.mats.append(mat)

    def build(self, name, mats, col, morph=True, parent=None):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata([tuple(v) for v in self.basis], [], self.faces)
        for mat in mats:
            mesh.materials.append(mat)
        for poly, mat in zip(mesh.polygons, self.mats):
            poly.material_index = mat
            poly.use_smooth = True
        mesh.validate()
        obj = bpy.data.objects.new(name, mesh)
        col.objects.link(obj)
        obj.parent = parent
        if morph:
            obj.shape_key_add(name='Basis')
            key = obj.shape_key_add(name='Offen')
            for point, co in zip(key.data, self.open):
                point.co = co
        return obj


def polar(r, a):
    return (r * math.cos(a), r * math.sin(a))


def arc_path(r_basis, r_open, a0, a1):
    def path(t):
        a = a0 + (a1 - a0) * t
        n = (math.cos(a), math.sin(a))
        return polar(r_basis, a), n, polar(r_open, a), n
    return path


def side_path(r_basis, phi, offset, half, rail_offset):
    """Quarter arc centred on angle phi that straightens into one frame side."""
    n_open = (math.cos(phi), math.sin(phi))
    tangent = (math.sin(phi), -math.cos(phi))

    def path(t):
        a = phi + math.pi / 4 - math.pi / 2 * t
        n = (math.cos(a), math.sin(a))
        s = -half + 2 * half * t
        dist = offset + rail_offset
        pos_open = (n_open[0] * dist + tangent[0] * s, n_open[1] * dist + tangent[1] * s)
        return polar(r_basis, a), n, pos_open, n_open
    return path


def rung_path(a_basis, r_inner_b, r_outer_b, p_inner_o, p_outer_o, n_open_tangent):
    """Short radial rung; in the open state it spans p_inner_o -> p_outer_o."""
    def path(t):
        r = r_inner_b + (r_outer_b - r_inner_b) * t
        po = (p_inner_o[0] + (p_outer_o[0] - p_inner_o[0]) * t, p_inner_o[1] + (p_outer_o[1] - p_inner_o[1]) * t)
        return polar(r, a_basis), (-math.sin(a_basis), math.cos(a_basis)), po, n_open_tangent
    return path


# --------------------------------------------------------------------------- parts
def corner(q, mats, col):
    """One corner: double rail with ladder, rotating gear quarter and gimbal."""
    a0, a1 = q * math.pi / 2 + math.radians(0.6), (q + 1) * math.pi / 2 - math.radians(0.6)
    sign = ((1, 1), (-1, 1), (-1, -1), (1, -1))[q]
    label = ('NO', 'NW', 'SW', 'SO')[q]
    pivot = bpy.data.objects.new(f'PORTAL / Ecke {label}', None)
    pivot.empty_display_size = 0.3
    col.objects.link(pivot)

    rails = Builder()
    rails.tube(arc_path(CORNER_RING[0], R_OUT, a0, a1), 40, (RAIL, RAIL_OPEN), TITAN)
    rails.tube(arc_path(CORNER_RING[1], R_IN, a0, a1), 40, (RAIL, RAIL_OPEN), TITAN)
    for i in range(1, 12):
        a = a0 + (a1 - a0) * i / 12
        n = (math.cos(a), math.sin(a))
        rails.tube(rung_path(a, CORNER_RING[1], CORNER_RING[0], polar(R_IN, a), polar(R_OUT, a), (-n[1], n[0])),
                   1, (RUNG, RUNG_OPEN), MESSING, sides=6)
    for i in (3, 9):  # brass beads on the outer rail
        a = a0 + (a1 - a0) * i / 12
        rails.sphere(polar(CORNER_RING[0], a), polar(R_OUT, a), 0.045, MESSING)
    rails.build(f'PORTAL / Ecke {label} / Doppelschiene', mats, col, parent=pivot)

    # Gear quarter: part of the closed core, turns once while travelling out.
    gear = Builder()
    outline, teeth = [], 7
    g0, g1 = q * math.pi / 2 + math.radians(2.5), (q + 1) * math.pi / 2 - math.radians(2.5)
    steps = teeth * 4
    for i in range(steps + 1):
        a = g0 + (g1 - g0) * i / steps
        r = GEAR_OUTER + (GEAR_TOOTH if (i % 4) in (1, 2) else 0.0)
        outline.append(polar(r, a))
    for i in range(12, -1, -1):
        outline.append(polar(GEAR_INNER, g0 + (g1 - g0) * i / 12))
    gear.prism(outline, 0.05, MESSING, y=-0.07)
    mid = (g0 + g1) / 2
    for f in (0.3, 0.7):  # rivets
        gear.sphere(polar((GEAR_INNER + GEAR_OUTER) / 2, g0 + (g1 - g0) * f), None, 0.025, TITAN, 8, 6, y=-0.1)
    gear_obj = gear.build(f'PORTAL / Ecke {label} / Zahnkranzviertel', mats, col, morph=False, parent=pivot)

    # Gimbal: small armillary sphere from the closed cross.
    gimbal = Builder()
    gimbal.sphere((0, 0), None, 0.07, MESSING)
    for tilt in (0.0, math.pi / 3, -math.pi / 3):
        def ring(t, tilt=tilt):
            a = 2 * math.pi * t
            p = (0.17 * math.cos(a), 0.17 * math.sin(a))
            return p, (math.cos(a), math.sin(a)), p, (math.cos(a), math.sin(a))
        start = len(gimbal.basis)
        gimbal.tube(ring, 32, 0.009, TITAN, sides=6, caps=False)
        for idx in range(start, len(gimbal.basis)):  # tilt ring about the vertical axis
            v = gimbal.basis[idx]
            x, y = v.x * math.cos(tilt) - v.y * math.sin(tilt), v.x * math.sin(tilt) + v.y * math.cos(tilt)
            gimbal.basis[idx] = gimbal.open[idx] = Vector((x, y, v.z))
    gimbal_obj = gimbal.build(f'PORTAL / Ecke {label} / Kardankugel', mats, col, morph=False, parent=pivot)

    diag = (CORNER_ORNAMENT * sign[0] / math.sqrt(2), CORNER_ORNAMENT * sign[1] / math.sqrt(2))
    cardinal = polar(GIMBAL_RADIUS, q * math.pi / 2)
    key_loc(pivot, [(F_START + 7, (0, 0)), (F_OPEN, (CX * sign[0], CY * sign[1]))])
    key_loc(gear_obj, [(F_START + 7, (0, 0)), (F_OPEN, diag)])
    key_rot(gear_obj, [(F_START + 7, 0.0), (F_OPEN, -2 * math.pi)])
    key_scale(gear_obj, [(F_START + 7, 1.0), (F_OPEN, 0.58)])  # compact corner cap on the rail band
    key_loc(gimbal_obj, [(F_START, cardinal), (F_START + 7, cardinal), (F_OPEN, diag)], y=-0.07)
    key_shape(bpy.data.objects[f'PORTAL / Ecke {label} / Doppelschiene'], F_START + 7, F_OPEN)


def side(k, mats, col):
    """Inner double rail quarter centred on a cardinal axis -> straight frame side."""
    phi = k * math.pi / 2
    label = ('rechts', 'oben', 'links', 'unten')[k]
    horizontal = k in (1, 3)
    offset, half = (CY, CX) if horizontal else (CX, CY)
    half -= 0.01
    n_open = (math.cos(phi), math.sin(phi))
    tangent = (math.sin(phi), -math.cos(phi))

    b = Builder()
    outer = side_path(SIDE_RING[0], phi, offset, half, R_OUT)
    inner = side_path(SIDE_RING[1], phi, offset, half, R_IN)
    b.tube(outer, 48, (RAIL, RAIL_OPEN), TITAN)
    b.tube(inner, 48, (RAIL, RAIL_OPEN), TITAN)
    rungs = 26 if horizontal else 14
    for i in range(1, rungs):
        t = i / rungs
        a = phi + math.pi / 4 - math.pi / 2 * t
        s = -half + 2 * half * t
        p_in = (n_open[0] * (offset + R_IN) + tangent[0] * s, n_open[1] * (offset + R_IN) + tangent[1] * s)
        p_out = (n_open[0] * (offset + R_OUT) + tangent[0] * s, n_open[1] * (offset + R_OUT) + tangent[1] * s)
        b.tube(rung_path(a, SIDE_RING[1], SIDE_RING[0], p_in, p_out, tangent), 1, (RUNG, RUNG_OPEN), MESSING, sides=6)
    # Brass collar at the middle, beads towards the ends.
    b.tube(outer, 3, (RAIL * 1.9, RAIL_OPEN * 1.7), MESSING, t0=0.47, t1=0.53)
    b.tube(inner, 3, (RAIL * 1.9, RAIL_OPEN * 1.7), MESSING, t0=0.47, t1=0.53)
    for t in (0.2, 0.8):
        pb, _, po, _ = outer(t)
        b.sphere(pb, po, 0.045, MESSING)
    obj = b.build(f'PORTAL / Seite {label} / Doppelschiene', mats, col)
    key_shape(obj, F_START + 7, F_OPEN)


def core(mats, col):
    """Parts that only exist in the closed machine: hub, spokes and orbits."""
    hub = Builder()
    hub.sphere((0, 0), None, 0.16, MESSING, 20, 12)
    hub_obj = hub.build('PORTAL / Kern / Nabe', mats, col, morph=False)
    key_scale(hub_obj, [(F_START + 24, 1.0), (F_START + 46, 0.001)])

    spokes = Builder()
    for q in range(4):
        a = q * math.pi / 2
        def path(t, a=a):
            p = polar(0.2 + (GIMBAL_RADIUS - 0.37) * t, a)
            n = (-math.sin(a), math.cos(a))
            return p, n, p, n
        spokes.tube(path, 1, 0.012, TITAN, sides=8)
    spokes_obj = spokes.build('PORTAL / Kern / Speichen', mats, col, morph=False)
    key_scale(spokes_obj, [(F_START, 1.0), (F_START + 12, 0.001)])

    for i, tilt in enumerate((math.radians(28), math.radians(-32))):
        orbit = Builder()
        def ellipse(t):
            a = 2 * math.pi * t
            p = (1.32 * math.cos(a), 0.52 * math.sin(a))
            n = Vector((0.52 * math.cos(a), 1.32 * math.sin(a))).normalized()
            return p, (n.x, n.y), p, (n.x, n.y)
        orbit.tube(ellipse, 96, 0.014, TITAN, sides=8, caps=False)
        obj = orbit.build(f'PORTAL / Kern / Umlaufbahn {i}', mats, col, morph=False)
        obj.rotation_mode = 'XYZ'
        obj.rotation_euler = (math.radians(18 if i else -14), tilt, 0.0)
        obj.keyframe_insert('rotation_euler', frame=F_START)
        obj.rotation_euler = (0.0, tilt * 3, 0.0)
        obj.keyframe_insert('rotation_euler', frame=F_START + 26)
        key_scale(obj, [(F_START + 14, 1.0), (F_START + 34, 0.001)])


def glow(mats, col):
    """Flat emissive strip just inside the aperture; the web layer fades it."""
    b = Builder()
    inner = R_IN - RAIL_OPEN - 0.005
    width = 0.05
    pts = []
    for q, (sx, sz) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
        for i in range(9):
            a = q * math.pi / 2 + math.pi / 2 * i / 8
            pts.append(((CX * sx, CY * sz), (math.cos(a), math.sin(a))))
    outer_ids, inner_ids = [], []
    for centre, n in pts:
        outer_ids.append(b._vert((centre[0] + n[0] * inner, -0.01, centre[1] + n[1] * inner), None))
        inner_ids.append(b._vert((centre[0] + n[0] * (inner - width), -0.01, centre[1] + n[1] * (inner - width)), None))
    count = len(pts)
    for i in range(count):
        j = (i + 1) % count
        b._face((outer_ids[i], inner_ids[i], inner_ids[j], outer_ids[j]), GLOW)
    obj = b.build('PORTAL / Innenleuchten', mats, col, morph=False)
    obj['portal_fade'] = 'opacity controlled by the web layer'
    return obj


# --------------------------------------------------------------------------- keys
def key_loc(obj, keys, y=0.0):
    for frame, (x, z) in keys:
        obj.location = (x, y, z)
        obj.keyframe_insert('location', frame=frame)


def key_rot(obj, keys):
    obj.rotation_mode = 'XYZ'
    for frame, angle in keys:
        obj.rotation_euler = (0.0, angle, 0.0)
        obj.keyframe_insert('rotation_euler', frame=frame)


def key_scale(obj, keys):
    for frame, s in keys:
        obj.scale = (s, s, s)
        obj.keyframe_insert('scale', frame=frame)


def key_shape(obj, f0, f1):
    key = obj.data.shape_keys.key_blocks['Offen']
    key.value = 0.0
    key.keyframe_insert('value', frame=f0)
    key.value = 1.0
    key.keyframe_insert('value', frame=f1)


# --------------------------------------------------------------------------- main
def studio(parent):
    col = collection('STUDIO / nicht exportieren', parent)
    world = bpy.data.worlds.new('Studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.006, 0.010, 0.018, 1.0)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    bpy.context.scene.world = world
    cam = bpy.data.objects.new('Studio / Kamera', bpy.data.cameras.new('Studio / Kamera'))
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 9.2
    cam.location = (0, -20, 0)
    cam.rotation_euler = (math.pi / 2, 0, 0)
    col.objects.link(cam)
    bpy.context.scene.camera = cam
    for name, loc, energy, size, color in (
        ('Studio / Schluessel', (-7, -9, 7), 2600, 6, (1.0, 0.93, 0.84)),
        ('Studio / Kontur', (8, 6, 5), 1800, 4, (0.72, 0.86, 1.0)),
        ('Studio / Fuellung', (4, -12, -5), 900, 9, (0.75, 0.82, 1.0)),
    ):
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA'))
        light.data.energy, light.data.size, light.data.color = energy, size, color
        light.location = loc
        light.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        col.objects.link(light)


def main():
    scene = reset()
    mats = materials()
    col = collection('PORTAL / Nebenmaschine')
    for q in range(4):
        corner(q, mats, col)
    for k in range(4):
        side(k, mats, col)
    core(mats, col)
    glow(mats, col)
    marker = bpy.data.objects.new('PORTAL / Inhalt', None)
    marker.empty_display_type = 'CUBE'
    marker.scale = (2 * (CX + R_IN) / 2, 0.01, 2 * (CY + R_IN) / 2)
    marker['breite'] = round(2 * (CX + R_IN), 4)
    marker['hoehe'] = round(2 * (CY + R_IN), 4)
    marker['eckradius'] = R_IN
    col.objects.link(marker)
    studio(None)
    for action in bpy.data.actions:
        for curve in action.fcurves:
            for point in curve.keyframe_points:
                point.interpolation = 'BEZIER'
                point.easing = 'AUTO'
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.frame_set(F_START)
    bpy.ops.wm.save_as_mainfile(filepath=str(TARGET), compress=True)
    print('saved', TARGET)


main()
