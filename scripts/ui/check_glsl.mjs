import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const output=process.env.SHADER_OUTPUT||'/tmp/glsl-review';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
 const errors=[];let forcingFailure=false;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'||(!forcingFailure&&/shader unavailable|program not valid/i.test(m.text())))errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('vl-intro-seen','1');localStorage.setItem('vl-language','de');Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});});
 await page.goto(base+'/');
 await page.waitForFunction(()=>window.__stage&&document.querySelector('#boot.is-done')&&!document.querySelector('.frame.is-intro'),{timeout:60000});
 await page.waitForTimeout(1500);
 await page.waitForFunction(()=>__stage.cards.documentPickables.every(o=>o.material.uniforms.uMap.value&&o.material.uniforms.uOpacity.value>.999));
 await page.evaluate(()=>__stage.setProjectionIdle(true));
 const setup=await page.evaluate(()=>{
  const stage=__stage,materials=new Map();
  stage.scene.traverse(o=>{if(o.material?.userData.shaderRole)materials.set(o.material.uuid,o.material);});
  window.__shaderMaterials=[...materials.values()];
  window.__shaderSnapshot=()=>__shaderMaterials.map(m=>({role:m.userData.shaderRole,clock:m.uniforms.uTime.value,motion:m.uniforms.uMotion.value,quality:m.uniforms.uQuality.value,activation:m.uniforms.uActivation.value,version:m.version}));
  return {roles:__shaderSnapshot(),programs:stage.renderer.info.programs.length};
 });
 assert.equal(setup.roles.filter(m=>m.role==='ring-jet').length,3);
 assert.equal(setup.roles.filter(m=>m.role==='hologram-edge').length,2);
 assert(setup.roles.every(m=>m.motion===0&&m.quality===0),'Low quality uses steady particles');

 const states=await page.evaluate(()=>{
  const s=__stage;s.cards.setShaderQuality('full');s.cards.setHover(null);s.cards.setHover('abschluss');s.cards.update(12,.1);
  const first=__shaderSnapshot();
  const a=s.cards.group.getObjectByName('card-abschluss'),b=s.cards.group.getObjectByName('card-lebenslauf');
  const jet=o=>o.children.find(n=>n.userData.kind==='ring-jet').children[0];
  const independent=jet(a).material.uniforms!==jet(b).material.uniforms;
  const mirrored=jet(a).material===a.getObjectByName('pedestal-ceiling').children.find(n=>n.userData.kind==='ring-jet').children[0].material;
  for(let i=0;i<8;i++)s.cards.update(12,.1);
  const finished=__shaderSnapshot();
  s.cards.setShaderQuality('low');s.cards.update(12,.1);const low=__shaderSnapshot();
  s.cards.setShaderQuality('balanced');s.cards.update(12,.1);const balanced=__shaderSnapshot();
  s.cards.setShaderQuality('full');
  return {first,finished,low,balanced,independent,mirrored};
 });
 assert(states.independent&&states.mirrored,'Separate pedestals have independent uniforms; a mirrored jet deliberately shares its material');
 assert.equal(states.first.filter(m=>m.activation>=0).length,2,'Only the hovered pedestal gets its edge and jet activation');
 assert(states.finished.every(m=>m.activation===-1),'Activation completes instead of flickering forever');
 assert(states.low.every((m,i)=>m.clock===states.finished[i].clock&&m.motion===0));
 assert(states.balanced.every((m,i)=>m.clock>states.low[i].clock));
 assert(states.balanced.every((m,i)=>m.version===states.first[i].version),'Quality changes do not recompile shaders');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>__shaderSnapshot().every(m=>m.motion===0));
 const still=await page.evaluate(()=>{const before=__shaderSnapshot();__stage.cards.update(12,.1);__stage.cards.setHover('lebenslauf');__stage.cards.update(12,.1);return {before,after:__shaderSnapshot()};});
 assert(still.after.every((m,i)=>m.clock===still.before[i].clock&&m.activation===-1),'Reduced motion is respected live, without jumping the clock');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(()=>__shaderSnapshot().every(m=>m.motion===1));
 const paused=await page.evaluate(()=>__shaderSnapshot());await page.waitForTimeout(180);
 assert.deepEqual(await page.evaluate(()=>__shaderSnapshot()),paused,'The existing paused scene also pauses the shader clock');

 // Compare actual rendered document pixels in an isolated render target using
 // the real document material and contour shader. No text shader is mocked.
 const pixels=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const s=__stage,r=s.renderer,scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2,2,4,-4,.1,10);
  camera.position.z=5;
  const original=s.cards.group.getObjectByName('card-lebenslauf'),doc=original.getObjectByName('resumeProjection').clone();
  doc.position.set(0,0,0);doc.rotation.set(0,0,0);doc.scale.set(3,6,1);doc.visible=true;scene.add(doc);
  const edge=original.children.find(o=>o.userData.kind==='resume-frame').children[0].clone();
  edge.material=edge.material.clone();edge.position.set(0,0,.01);edge.rotation.set(0,0,0);edge.scale.setScalar(1);scene.add(edge);
  const u=edge.material.uniforms;u.uHalfWidth.value=1.5;u.uHalfHeight.value=3;u.uOpacity.value=.8;u.uPixelRatio.value=1;u.uActivation.value=.45;u.uTime.value=0;
  const target=new THREE.WebGLRenderTarget(320,400),beforeTarget=r.getRenderTarget();
  const a=new Uint8Array(320*400*4),b=new Uint8Array(a.length),c=new Uint8Array(a.length);
  const draw=buffer=>{r.setRenderTarget(target);r.clear(true,true,true);r.render(scene,camera);r.readRenderTargetPixels(target,0,0,320,400,buffer);};
  edge.visible=false;draw(a);draw(a);edge.visible=true;draw(b);
  let inner=0,outer=0;const innerChanges=[];
  for(let y=0;y<400;y++)for(let x=0;x<320;x++)for(let k=0;k<3;k++){
   const i=(y*320+x)*4+k,d=Math.abs(a[i]-b[i]);
   if(x>55&&x<265&&y>65&&y<335){inner+=d;if(d&&innerChanges.length<12)innerChanges.push([x,y,k,a[i],b[i]]);}else outer+=d;
  }
  u.uActivation.value=-1;u.uTime.value=0;draw(a);u.uTime.value=1024;draw(b);
  let wrap=0;for(let i=0;i<a.length;i++)wrap+=Math.abs(a[i]-b[i]);
  edge.rotation.y=Math.PI*.34;u.uTime.value=1;u.uEnhanced.value=0;draw(a);u.uEnhanced.value=1;draw(c);
  let grazing=0;for(let i=0;i<a.length;i++)grazing+=Math.abs(a[i]-c[i]);
  edge.material.dispose();target.dispose();r.setRenderTarget(beforeTarget);
  return {inner,outer,wrapMean:wrap/a.length,grazing,innerChanges};
 });
 console.log('Pixel comparison',pixels);
 assert.equal(pixels.inner,0,'Interior document pixels are unchanged');
 assert(pixels.outer>0,'The contour was actually drawn');
 assert(pixels.wrapMean<.015,'The bounded clock wraps continuously');
 assert(pixels.grazing>0,'The enhanced edge responds at grazing angles');

 const resources=await page.evaluate(()=>{
  const s=__stage,r=s.renderer;
  const render=()=>{r.info.autoReset=false;r.info.reset();s.composer.render(0);return {calls:r.info.render.calls,points:r.info.render.points,geometries:r.info.memory.geometries,textures:r.info.memory.textures,programs:r.info.programs.length};};
  s.cards.setHover(null);s.cards.setOpened(null);s.cards.update(12,.1);
  render();const before=render();s.cards.setShaderEffects(false);const off=render();s.cards.setShaderEffects(true);const on=render();
  for(let i=0;i<10;i++){
   for(const key of ['abschluss','lebenslauf','projekte',null]){s.cards.setOpened(key);s.cards.update(12,.1);render();}
  }
  const after=render();return {before,off,on,after};
 });
 assert.equal(resources.off.calls,resources.on.calls,'Enhancements add no draw passes');
 assert.equal(resources.off.points,resources.on.points,'No extra particles');
 for(const key of ['geometries','textures','programs'])assert.equal(resources.after[key],resources.before[key],'No resource growth after ten cycles: '+key);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:output+'/after-home.png'});

 // Deliberately fail each new program. Test the real public WebGL error hook,
 // not a simulated exception in JavaScript. Opaque documents must survive.
 forcingFailure=true;
 for(const role of ['hologram-edge','ring-jet']){
  await page.evaluate(role=>{
   const material=__shaderMaterials.find(m=>m.userData.shaderRole===role);
   material.vertexShader+='\nforced_shader_failure';material.needsUpdate=true;
   __stage.composer.render(0);
  },role);
  await page.waitForFunction(role=>{
   const nodes=[];__stage.scene.traverse(o=>{if(o.material?.userData.shaderRole===role)nodes.push(o);});return nodes.length===0;
  },role);
 }
 const fallback=await page.evaluate(()=>{
  const s=__stage,nodes=[];s.scene.traverse(o=>{if(o.userData.shaderFallback)nodes.push(o);});
  s.composer.render(0);
  return {count:nodes.length,positions:nodes.every(o=>[...o.geometry.attributes.position.array].every(Number.isFinite)),
   restored:s.renderer.debug.onShaderError===null,documents:s.cards.documentPickables.every(o=>o.material.uniforms.uMap.value&&o.material.uniforms.uOpacity.value>.99)};
 });
 assert.equal(fallback.count,8,'Both mirrored jets and both document contours use the fallback');
 assert(fallback.positions&&fallback.restored&&fallback.documents);
 assert.deepEqual(errors,[]);
 await writeFile(output+'/checks.json',JSON.stringify({setup,states,pixels,resources,fallback},null,2));
 console.log('PASS GLSL compile, independent states, mirrored jets, activation, quality, reduced motion, pause, document pixels, clock wrapping, no additional passes, resource lifecycle and real compile-failure fallback');
 console.log(JSON.stringify({pixels,resources,fallback}));
}finally{await browser.close();}
