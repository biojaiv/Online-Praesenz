"""Render closed, unfolding and open portal states for review.

Run: blender --background Elemente/Orrery/Portal_Nebenmaschine.blend \
       --python scripts/portal/render_states.py -- <output-dir>
"""

import sys
from pathlib import Path

import bpy

out = Path(sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '.')
out.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
scene.render.resolution_x, scene.render.resolution_y = 1200, 900
scene.render.film_transparent = False
scene.eevee.taa_render_samples = 64
glow = bpy.data.objects['PORTAL / Innenleuchten']

for label, frame in (('1-geschlossen', 1), ('2-entfaltet', 32), ('3-offen', 72)):
    scene.frame_set(frame)
    glow.hide_render = frame < 60
    scene.render.filepath = str(out / f'portal-{label}.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', scene.render.filepath)
