import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const run=(command,args)=>execFileSync(command,args,{cwd:root,stdio:'inherit'});
// Explicit authoring operation; the ordinary Vite build uses the existing web exports.
run(process.env.BLENDER_PATH||'blender',['-b','--factory-startup','--python-exit-code','1','--python','scripts/creative/blender/build_assets.py','--','city','resonanz','ticket']);
run(process.execPath,['scripts/creative/optimize_models.mjs']);
for(const language of ['de','en'])run('magick',[`Elemente/Beispiele/ticket-1924-${language}.png`,'-resize','480x330','-quality','90',`public/creative/ticket-1924-${language}.webp`]);
