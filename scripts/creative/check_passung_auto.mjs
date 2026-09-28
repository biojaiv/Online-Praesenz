import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
await mkdir('/tmp/passung-hover-review',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/beispiele/passung/?lang=de');
 const canvas=page.locator('#machine');await page.locator('#machine[data-auto-rotating=true]').waitFor();
 const angle=()=>canvas.evaluate(el=>Number(el.dataset.angle));
 async function advancing(){
  const a=await angle();
  await page.waitForFunction(before=>{const d=Number(document.querySelector('#machine').dataset.angle)-before;return Math.atan2(Math.sin(d),Math.cos(d))>.012;},a);
 }
 await advancing();
 // All chapter buttons must leave automatic rotation running, including reduced
 // assembly motion. This also tests the OS setting reported in the previous issue.
 for(const reducedMotion of ['no-preference','reduce']){
  await page.emulateMedia({reducedMotion});
  for(const i of [1,2,3,0]){
   await page.locator(`.chapter-buttons [data-jump="${i}"]`).click();
   await page.waitForFunction(i=>Number(document.documentElement.dataset.chapter)===i,i);
   await advancing();
  }
 }
 await page.locator('.chapter-buttons [data-jump="1"]').click();
 await page.waitForFunction(()=>Number(document.querySelector('#machine').dataset.progress)===1);
 // Find a real visible surface, not empty canvas space or a reflected copy.
 async function surface(id){return page.evaluate(id=>{
  const {camera}=__creativeScene,part=__passungMachine.parts.find(p=>p.userData.part===id);
  const rect=document.querySelector('#machine').getBoundingClientRect();let found=null;
  part.traverse(mesh=>{
   if(found||!mesh.isMesh)return;
   const positions=mesh.geometry.attributes.position,indices=mesh.geometry.index;
   const count=indices?indices.count:positions.count,point=camera.position.clone(),vertex=point.clone();
   for(let i=0;i<count;i+=3*Math.max(1,Math.floor(count/600))){
    point.set(0,0,0);
    for(let k=0;k<3;k++)point.add(vertex.fromBufferAttribute(positions,indices?indices.getX(i+k):i+k));
    point.multiplyScalar(1/3).applyMatrix4(mesh.matrixWorld).project(camera);
    const x=(point.x+1)/2,y=(1-point.y)/2;
    if(x>0&&x<1&&y>0&&y<1&&[[0,0],[2,0],[-2,0],[0,2],[0,-2]].every(([dx,dy])=>__passungMachine.pickPart(x+dx/rect.width,y+dy/rect.height)===id)){
     found={x:rect.x+x*rect.width,y:rect.y+y*rect.height};break;
    }
   }
  });return found;
 },id);}
 for(const [id,de,en] of [['housing','Gehäuse','Housing'],['circlip','Haltering','Retaining ring'],['shaft','Antriebswelle','Drive shaft']]){
  const point=await surface(id);assert(point,`Visible surface for ${id}`);
  console.log('Checking hover',id,point);await page.mouse.move(point.x,point.y);
  await page.waitForFunction(id=>document.querySelector('#machine').dataset.hoveredPart===id,id);
  await page.locator('#machine[data-auto-rotating=false]').waitFor();
  assert.equal(await page.locator('.part-label').textContent(),de);
  await page.waitForTimeout(180);const before=await angle();
  await page.waitForTimeout(250);assert.equal(await angle(),before,'Hover holds the actual part still');
  // Language can change without moving the pointer away from the part.
  await page.evaluate(()=>window.postMessage({type:'example:language',language:'en'},location.origin));
  await page.waitForFunction(text=>document.querySelector('.part-label').textContent===text,en);
  if(id==='circlip')await page.screenshot({path:'/tmp/passung-hover-review/ring-label.png'});
  await page.evaluate(()=>window.postMessage({type:'example:language',language:'de'},location.origin));
  await page.mouse.move(20,20);await advancing();assert(await page.locator('.part-label').isHidden());
 }
 await canvas.focus();await page.keyboard.press('ArrowRight');await advancing();
 await page.evaluate(()=>window.postMessage({type:'example:pause'},location.origin));await page.waitForTimeout(180);
 const stopped=await angle();await page.waitForTimeout(250);assert.equal(await angle(),stopped);
 await page.evaluate(()=>window.postMessage({type:'example:visible'},location.origin));await advancing();
 const reflection=await page.evaluate(()=>{const {scene,camera}=__creativeScene,f=scene.getObjectByName('PASSUNG · reflective floor');return {size:f.getRenderTarget().width,layer:f.getReflectionCamera(camera).layers.mask};});
 assert.deepEqual(reflection,{size:512,layer:2});assert.deepEqual(errors,[]);
 await page.close();
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await phone.goto(base+'/beispiele/passung/?lang=en');await phone.locator('#machine[data-auto-rotating=true]').waitFor();
 await phone.locator('.chapter-buttons [data-jump="1"]').click();
 await phone.waitForFunction(()=>document.documentElement.dataset.chapter==='1');
 assert.equal(await phone.locator('#machine').getAttribute('data-auto-rotating'),'true');
 await phone.screenshot({path:'/tmp/passung-hover-review/phone.png'});await phone.close();
 const preview=await browser.newPage();await preview.goto(base+'/beispiele/passung/?preview=1');
 await preview.waitForFunction(()=>document.documentElement.dataset.creativeReady==='true');
 assert.equal(await preview.locator('#machine').getAttribute('data-auto-rotating'),'false');await preview.close();
 console.log('PASS clockwise start, every chapter, reduced assembly motion, mesh hover, DE/EN labels, keyboard resume, visibility, mirror, phone and still previews');
}finally{await browser.close();}
