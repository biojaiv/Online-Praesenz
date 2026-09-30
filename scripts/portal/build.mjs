import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const root = fileURLToPath(new URL('../../', import.meta.url));
const blender = process.env.BLENDER_PATH || 'blender';
execFileSync(blender, ['--background', '--python', 'scripts/portal/build_portal.py'], { cwd: root, stdio: 'inherit' });
execFileSync(blender, ['--background', '--python', 'scripts/portal/export_blender.py'], { cwd: root, stdio: 'inherit' });

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(),
  'draco3d.decoder': await draco3d.createDecoderModule(),
});
const path = `${root}Elemente/Orrery/Portal_Nebenmaschine_web.glb`;
const document = await io.read(path);

// Blender writes one animation per animated object; the web plays one clip.
const [clip, ...rest] = document.getRoot().listAnimations();
clip.setName('Entfalten');
for (const animation of rest) {
  for (const sampler of animation.listSamplers()) clip.addSampler(sampler);
  for (const channel of animation.listChannels()) clip.addChannel(channel);
  animation.dispose();
}
await document.transform(dedup(), draco({ quantizePosition: 16, quantizeNormal: 10, encodeSpeed: 5 }));
await io.write(path, document);
console.log(`Portal_Nebenmaschine_web.glb: ${Math.round((await stat(path)).size / 1024)} KiB, ${clip.listChannels().length} channels`);
