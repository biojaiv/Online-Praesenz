"""Rebuild browser assets: blender --background --python scripts/sockel/export_blender.py.

Only the three pedestal assemblies are exported. Studio, cameras and lights stay
in the editable sources. Text and bevels become geometry; meshes are joined per
pedestal so glTF needs only one draw call per material, rather than per screw.
"""
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'Elemente' / 'Sockel'
KEYS = ('abschluss', 'projekte', 'lebenslauf')

for variant in ('de', 'eng', 'oben'):
    source = ASSETS / f'Sockel_{variant}.blend'
    bpy.ops.wm.open_mainfile(filepath=str(source))
    assemblies = []
    for index, key in enumerate(KEYS, 1):
        root = bpy.data.objects[f'SOCKEL {index:02}']
        root.location = (0, 0, 0)
        root.name = f'pedestal-{key}'
        root['source'] = source.name
        root['section'] = key
        children = list(root.children_recursive)
        root['inscription'] = root.users_collection[0].name.split(' / ', 1)[-1] if variant != 'oben' else ''
        bpy.ops.object.select_all(action='DESELECT')
        for obj in children:
            if obj.type in {'MESH', 'FONT', 'CURVE'}:
                obj.select_set(True)
        bpy.context.view_layer.objects.active = next(o for o in children if o.type == 'MESH')
        bpy.ops.object.convert(target='MESH')
        bpy.ops.object.join()
        mesh = bpy.context.object
        mesh.name = f'{key}-geometry'
        assemblies.extend((root, mesh))
    # Hidden default objects may retain selection in Blender. Remove every
    # non-assembly object from this in-memory export scene explicitly.
    for obj in list(bpy.data.objects):
        if obj not in assemblies:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in assemblies:
        obj.select_set(True)
    target = ASSETS / f'Sockel_{variant}_web.glb'
    bpy.ops.export_scene.gltf(
        filepath=str(target), export_format='GLB', use_selection=True,
        export_extras=True, export_cameras=False, export_lights=False,
        export_animations=False, export_yup=True, export_apply=True,
    )
    print(f'EXPORTED {target.name}: {target.stat().st_size:,} bytes')
