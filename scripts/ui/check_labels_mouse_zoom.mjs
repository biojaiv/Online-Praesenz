import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const p=await b.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:.6,reducedMotion:'reduce'});const errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
 await p.addInitScript(()=>{localStorage.setItem('vl-language','de');localStorage.setItem('vl-intro-seen','1');Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});});await p.route('**/*Hintergrund_web*.glb*',r=>r.abort());
 await p.goto('http://127.0.0.1:5173/');await p.waitForFunction(()=>window.__stage&&document.querySelector('#boot.is-done')&&!document.querySelector('.frame.is-intro'),{timeout:60000});
 for(const key of ['projekte','abschluss','lebenslauf']){
  await p.evaluate(key=>location.hash=key==='projekte'?'projekte/webseiten':key,key);await p.waitForFunction(()=>!__stage.isMoving);await p.waitForTimeout(650);
  const labels=await p.evaluate(()=>__stage.cards.group.getObjectsByProperty('name','card-label').map(m=>{const r=document.querySelector('#scene').getBoundingClientRect();const v=m.getWorldPosition(__stage.camera.position.clone()).project(__stage.camera);return{key:m.userData.key,visible:m.visible&&m.parent.visible,opacity:m.material.opacity,x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2};}));
  console.log(key,'labels',labels);assert(labels.every(l=>l.visible&&l.opacity>.9));
  const stage=await p.locator('#scene').boundingBox();
  const selected=labels.find(l=>l.key===key);assert(selected.y<stage.y+stage.height-20,'Selected label stays above the lower viewport edge');
  if(key==='projekte'){assert(labels.every(l=>l.y<stage.y+stage.height-20));await p.evaluate(()=>__stage.setProjectionIdle(true));await p.screenshot({path:'/tmp/labels-restored.jpg',type:'jpeg',quality:90});await p.evaluate(()=>__stage.setProjectionIdle(false));}
  if(key==='projekte')await p.locator('[data-wing="webseiten"] .wing-preview').hover();
  else if(key==='abschluss')await p.locator('.ihk-hologram-film__play').hover();
  else {const r=await p.locator('#scene').boundingBox();await p.mouse.move(r.x+r.width*.5,r.y+r.height*.55);}
  const before=await p.evaluate(()=>({z:__stage.camera.position.z,scroll:__stage.cards.documentScroll}));
  await p.mouse.wheel(0,-180);await p.waitForFunction(z=>__stage.camera.position.z<z-.05,before.z);await p.waitForTimeout(300);
  const near=await p.evaluate(()=>__stage.camera.position.z);await p.mouse.wheel(0,180);await p.waitForFunction(z=>__stage.camera.position.z>z+.05,near);
  if(key!=='projekte'){
   await p.waitForTimeout(600);const r=await p.locator('#scene').boundingBox();await p.mouse.move(r.x+r.width*.57,r.y+r.height*.73);const old=await p.evaluate(()=>__stage.cards.documentScroll);await p.mouse.down();await p.mouse.wheel(0,220);await p.mouse.up();await p.waitForFunction(old=>__stage.cards.documentScroll>old+.001,old);
  }
  console.log('PASS',key,'mouse zoom and document scrolling');
 }
 assert(requests.some(x=>x.includes('CV_Projection_DE.webp')));assert(!requests.some(x=>x.includes('CV_Hologram')));
 await p.locator('#language-switch').click();await p.waitForFunction(()=>__stage.cards.group.getObjectsByProperty('name','resumeProjection').filter(m=>m.userData.key==='lebenslauf').every(m=>m.visible));assert(requests.some(x=>x.includes('CV_Projection_EN.webp')));assert.deepEqual(errors,[]);
 console.log('PASS: labels, original CV in DE/EN, wheel zoom on all three and held-button scrolling.');
}finally{await b.close();}
