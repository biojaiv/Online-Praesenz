import {spawnSync,execFileSync} from 'node:child_process';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTTextureWebP} from '@gltf-transform/extensions';
import {dedup,prune,draco} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import {stat,mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
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
// Render a genuine Blender still for loading, no-WebGL and no-JavaScript views.
const temporary=await mkdtemp(join(tmpdir(),'passung-render-'));
try{
 const png=join(temporary,'machine.png');
 const script=`import bpy; [(setattr(o.location,'x',o.location.x+o['explodeX']*.70)) for o in bpy.data.objects if 'explodeX' in o]; bpy.context.scene.cycles.use_denoising=False; bpy.context.scene.cycles.samples=96; bpy.context.scene.camera.data.ortho_scale=8.6; bpy.context.scene.render.filepath=${JSON.stringify(png)}; bpy.ops.render.render(write_still=True)`;
 const render=spawnSync('blender',['-b','Elemente/Beispiele/PASSUNG.blend','--python-expr',script],{stdio:'inherit'});
 if(render.status!==0)throw new Error('Blender fallback render failed');
 await mkdir('public/passung',{recursive:true});
 execFileSync('magick',[png,'-quality','91','public/passung/machine-still.webp']);
}finally{await rm(temporary,{recursive:true,force:true});}
