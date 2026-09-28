import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { dedup, prune, draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { stat, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
 'draco3d.encoder': await draco3d.createEncoderModule(),
 'draco3d.decoder': await draco3d.createDecoderModule()
});
for (const name of ['PALIMPSEST', 'RESONANZ', 'RESONANZ_low']) {
 const path = new URL(`../../Elemente/Beispiele/${name}_web.glb`, import.meta.url);
 const doc = await io.read(path.pathname);
 if(name==='PALIMPSEST'){
  const atlas=new URL('../../Elemente/Beispiele/palimpsest-daylight-web.jpg',import.meta.url);
  execFileSync('magick',[new URL('../../Elemente/Beispiele/palimpsest-daylight.png',import.meta.url).pathname,'-sampling-factor','4:4:4','-quality','88',atlas.pathname]);
  doc.getRoot().listTextures()[0].setImage(await readFile(atlas)).setMimeType('image/jpeg');
  // Cycles has already evaluated the lighting. Use an unlit material, not an emissive PBR shader.
  const unlit=doc.createExtension(KHRMaterialsUnlit);
  for(const material of doc.getRoot().listMaterials())if(material.getName().startsWith('Baked daylight')){
   const texture=material.getEmissiveTexture()||material.getBaseColorTexture();
   material.setBaseColorTexture(texture).setBaseColorFactor([1,1,1,1]);
   material.setEmissiveTexture(null).setEmissiveFactor([0,0,0]);
   material.setExtension('KHR_materials_unlit',unlit.createUnlit());
   for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives())if(primitive.getMaterial()===material){
    primitive.setAttribute('NORMAL',null);primitive.setAttribute('TANGENT',null);
   }
  }
 }
 await doc.transform(dedup(),prune({keepLeaves:true,keepExtras:true}),draco({quantizePosition:16, quantizeNormal:12, quantizeTexcoord:14, encodeSpeed:5}));
 if(name==='PALIMPSEST')for(const year of ['2026','1924','1643','0244']){
  if(!doc.getRoot().listNodes().some(node=>node.getName()==='anchor_'+year))throw new Error(`Missing interactive year anchor: ${year}`);
 }
 if(name==='PALIMPSEST'){
  const route=doc.getRoot().listNodes().find(node=>node.getName()==='Timeline').getExtras();
  if(!route.pathPoints?.length||route.stationIndices?.length!==4)throw new Error('Missing exported timeline path');
  for(const name of ['Tram_1911_1964','Walking_figure']){
   const node=doc.getRoot().listNodes().find(node=>node.getName()===name);
   if(!node?.getMesh().listPrimitives()[0].getAttribute('COLOR_0'))throw new Error('Missing vertex colours: '+name);
  }
 }
 await io.write(path.pathname, doc);
 console.log(name, (await stat(path)).size, 'bytes;', doc.getRoot().listMeshes().length, 'shared meshes');
}
