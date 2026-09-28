import {spawnSync,execFileSync} from 'node:child_process';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTTextureWebP} from '@gltf-transform/extensions';
import {dedup,prune,draco} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import {stat} from 'node:fs/promises';
const result=spawnSync('blender',['-b','--factory-startup','--python','scripts/creative/blender/build_passung.py'],{stdio:'inherit'});
if(result.status!==0)throw new Error('Blender construction failed');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.encoder':await draco3d.createEncoderModule(),'draco3d.decoder':await draco3d.createDecoderModule()});
const file='Elemente/Beispiele/PASSUNG_web.glb',doc=await io.read(file);
// Keep the normal-map pixels exact while reducing transfer size. The editable
// Blender source retains its packed PNGs; only the web export uses lossless WebP.
doc.createExtension(EXTTextureWebP).setRequired(true);
for(const texture of doc.getRoot().listTextures()){
 const bytes=execFileSync('magick',['png:-','-define','webp:lossless=true','-define','webp:method=6','webp:-'],{input:texture.getImage(),maxBuffer:8*1024*1024});
 texture.setImage(new Uint8Array(bytes)).setMimeType('image/webp');
}
await doc.transform(dedup(),prune({keepLeaves:true,keepExtras:true}),draco({quantizePosition:14,quantizeNormal:12,quantizeTexcoord:14,encodeSpeed:5}));
const parts=doc.getRoot().listNodes().filter(node=>node.getExtras().part);
if(parts.length!==9)throw new Error(`Expected nine independently movable components, found ${parts.length}`);
await io.write(file,doc);
console.log('PASSUNG:',parts.length,'components,',(await stat(file)).size,'bytes');
// Loading and gallery stills use the web renderer's camera and materials.
console.log('Refresh the matching loading image and gallery: npm run build:passung-previews (with the dev server running).');
