import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, quantize, reorder } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

const root = fileURLToPath(new URL('../../', import.meta.url));
const blender = process.env.BLENDER_PATH || 'blender';
// --compress-only re-packs the existing GLB without running Blender again.
if (!process.argv.includes('--compress-only')) {
  execFileSync(blender, ['--background', '--python', 'scripts/portal/build_portal.py'], { cwd: root, stdio: 'inherit' });
  execFileSync(blender, ['--background', '--python', 'scripts/portal/export_blender.py'], { cwd: root, stdio: 'inherit' });
}
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(),
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
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
// Meshopt instead of Draco: Draco leaves the 16 unfold morph targets as raw floats.
// Positions stay float (the page poses rail and corner nodes directly, which
// position quantization would move into node transforms); normals keep the
// 10 bits the Draco version used.
for (const extension of document.getRoot().listExtensionsUsed()) {
  if (extension.extensionName === 'KHR_draco_mesh_compression') extension.dispose();
}
await document.transform(dedup(), reorder({ encoder: MeshoptEncoder, target: 'size' }),
  quantize({ pattern: /^(NORMAL|TANGENT|TEXCOORD_\d+)$/, patternTargets: /^(NORMAL|TANGENT)$/, quantizeNormal: 10, quantizeTexcoord: 14 }));
document.createExtension(EXTMeshoptCompression).setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
await io.write(path, document);
console.log(`Portal_Nebenmaschine_web.glb: ${Math.round((await stat(path)).size / 1024)} KiB, ${clip.listChannels().length} channels`);
