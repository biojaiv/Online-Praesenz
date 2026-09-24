import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const root = fileURLToPath(new URL('../../', import.meta.url));
execFileSync(process.env.BLENDER_PATH || 'blender', ['--background', '--python', 'scripts/background/export_blender.py'], { cwd: root, stdio: 'inherit' });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
const path = `${root}Elemente/Orrery/Hintergrund_web.glb`;
const document = await io.read(path);
await document.transform(dedup(), draco({ quantizePosition: 16, quantizeNormal: 10, encodeSpeed: 5 }));
await io.write(path, document);
console.log(`Hintergrund_web.glb: ${Math.round((await stat(path)).size / 1024)} KiB`);
