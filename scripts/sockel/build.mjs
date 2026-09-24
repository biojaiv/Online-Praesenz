import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const root = fileURLToPath(new URL('../../', import.meta.url));
execFileSync(process.env.BLENDER_PATH || 'blender', ['--background', '--python', 'scripts/sockel/export_blender.py'], { cwd: root, stdio: 'inherit' });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(),
  'draco3d.decoder': await draco3d.createDecoderModule(),
});
for (const variant of ['de', 'eng', 'oben']) {
  const path = `${root}Elemente/Sockel/Sockel_${variant}_web.glb`;
  const document = await io.read(path);
  await document.transform(dedup(), draco({ quantizePosition: 16, quantizeNormal: 10, encodeSpeed: 5 }));
  await io.write(path, document);
  console.log(`${variant}: ${Math.round((await stat(path)).size / 1024)} KiB`);
}
