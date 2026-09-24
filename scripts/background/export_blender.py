"""Export the authored background assembly without changing the Blender source."""
from pathlib import Path
import bpy
import json
from mathutils import Vector

root_path = Path(__file__).resolve().parents[2]
source = root_path / 'Elemente/Orrery/Hintergrund.blend'
bpy.ops.wm.open_mainfile(filepath=str(source))
bpy.context.scene.frame_set(1)
root = bpy.data.objects['V2 GESAMTMODELL']
root['source'] = 'Elemente/Orrery/Hintergrund.blend'
# The author built the entire world in web coordinates (Y up). Only this
# presentation root converts it to Blender's Z up and a 0.16 studio scale.
root.rotation_euler = (0, 0, 0)
root.scale = (1, 1, 1)
assembly = {root, *root.children_recursive}
# Keep the separate pivots: the browser animates the actual authored rings.
for obj in list(bpy.data.objects):
    if obj not in assembly:
        bpy.data.objects.remove(obj, do_unlink=True)
for scene in list(bpy.data.scenes):
    if scene != bpy.context.scene:
        bpy.data.scenes.remove(scene)
for obj in assembly:
    obj['sourceName'] = obj.name
    obj['sourceType'] = obj.type
    if obj.type == 'MESH' and obj.name.endswith('Tragwerk mit Knoten'):
        # The authored bars are disconnected cuboids. Preserve their actual
        # centre lines as navigation rails instead of inventing light paths.
        mesh = obj.data
        neighbours = [set() for _ in mesh.vertices]
        for edge in mesh.edges:
            a, b = edge.vertices
            neighbours[a].add(b)
            neighbours[b].add(a)
        remaining = set(range(len(mesh.vertices)))
        rails = []
        while remaining:
            pending = [remaining.pop()]
            component = []
            while pending:
                vertex = pending.pop()
                component.append(vertex)
                for neighbour in neighbours[vertex]:
                    if neighbour in remaining:
                        remaining.remove(neighbour)
                        pending.append(neighbour)
            if len(component) != 8:
                continue
            component.sort()
            start = sum((mesh.vertices[i].co for i in component[:4]), Vector()) / 4
            end = sum((mesh.vertices[i].co for i in component[4:]), Vector()) / 4
            if (end - start).length > 3:
                rails.append([*start, *end])
        obj['lightRailsJSON'] = json.dumps(rails)
    obj.animation_data_clear()
    obj.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=str(source.with_name('Hintergrund_web.glb')),
    export_format='GLB', use_selection=True, export_extras=True,
    export_cameras=False, export_lights=False, export_animations=False,
    export_yup=False, export_apply=True, export_materials='EXPORT',
)
