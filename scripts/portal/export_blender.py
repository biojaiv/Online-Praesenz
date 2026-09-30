"""Export the portal machine collection to glTF (one scene, morphs and animation).

Run through `npm run build:portal`, which rebuilds the .blend first.
"""

from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'Elemente/Orrery/Portal_Nebenmaschine.blend'
TARGET = ROOT / 'Elemente/Orrery/Portal_Nebenmaschine_web.glb'

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
collection = bpy.data.collections['PORTAL / Nebenmaschine']
for obj in bpy.context.scene.objects:
    obj.select_set(obj.name in collection.all_objects)
bpy.context.scene.frame_set(1)
bpy.ops.export_scene.gltf(
    filepath=str(TARGET), export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='SCENE', export_morph=True,
    export_morph_normal=True, export_extras=True, export_apply=False,
    export_yup=True, export_force_sampling=True, export_frame_range=True,
)
print('exported', TARGET)
