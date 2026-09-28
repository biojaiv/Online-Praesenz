import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,stat} from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
await mkdir('/tmp/passung-review',{recursive:true});
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1536,height:1024},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,reducedMotion:'no-preference'});
  const errors=[],sent=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{if(request.method()==='POST')sent.push(request.url());});
  await page.goto(base+'/beispiele/passung/?lang=de');
  await page.waitForFunction(()=>document.documentElement.dataset.creativeReady==='true');
  assert.equal(await page.locator('#machine').getAttribute('data-model-ready'),'true','Blender model loaded');
  assert.equal(await page.locator('html').getAttribute('lang'),'de');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
  const snapshot=()=>page.evaluate(()=>window.__passungMachine?.parts.map(part=>({name:part.userData.part,offset:part.userData.explodeX,withdraw:part.userData.withdrawX||0,x:part.position.x,y:part.position.y,z:part.position.z})));
  const initial=await snapshot();
  if(initial)assert.equal(initial.length,9,'Nine authored assembly groups');
  const go=async(index)=>{
   await page.locator(`.chapter-buttons [data-jump="${index}"]`).click();
   await page.waitForFunction(index=>Math.abs(Number(document.querySelector('#machine').dataset.progress)-index)<.005,index);
   assert.equal(await page.locator(`.chapter-buttons [data-jump="${index}"]`).getAttribute('aria-current'),'step');
  };
  await page.screenshot({path:`/tmp/passung-review/${mobile?'mobile':'desktop'}-de-idea.png`});
  // Real wheel input moves the components continuously through an intermediate pose.
  await page.locator('#machine').hover({force:true});await page.mouse.wheel(0,240);
  await page.waitForFunction(()=>Number(document.querySelector('#machine').dataset.progress)>.08);
  const intermediate=Number(await page.locator('#machine').getAttribute('data-expansion'));
  assert(intermediate>.70&&intermediate<1,'Intermediate native-scroll assembly pose');
  await go(1);const exploded=await snapshot();
  if(exploded)for(const part of exploded){
   assert(Math.abs(part.x-part.offset-part.withdraw)<.01,'Maximum separation uses the authored axis and screw withdrawal distances');
   const before=initial.find(p=>p.name===part.name);assert.equal(part.y,before.y);assert.equal(part.z,before.z);
  }
  if(exploded){
   const screws=await page.evaluate(()=>{
    const part=__passungMachine.parts.find(p=>p.userData.part==='fasteners');
    const camera=__creativeScene.camera,point=camera.position.clone();
    let inside=true;
    part.traverse(mesh=>{if(!mesh.isMesh)return;const positions=mesh.geometry.attributes.position;
     for(let i=0;i<positions.count;i++){
      point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera);
      if(Math.abs(point.x)>.99||Math.abs(point.y)>.99)inside=false;
     }
    });
    return {count:part.userData.screwCount,inside};
   });
   assert.equal(screws.count,6,'The six front-cover screws are present in the exported Blender model');
   assert(screws.inside,'All withdrawn screws remain inside the desktop or phone viewport');
  }
  await page.screenshot({path:`/tmp/passung-review/${mobile?'mobile':'desktop'}-de-exploded.png`});
  await go(2);assert.match(await page.locator('.step-title').textContent(),/Qualität/);
  await go(3);const assembled=await snapshot();
  if(assembled)assert(assembled.every(part=>Math.abs(part.x)<.01),'All components return to the Blender assembly positions');
  await page.screenshot({path:`/tmp/passung-review/${mobile?'mobile':'desktop'}-de-assembled.png`});
  await go(1);assert(Number(await page.locator('#machine').getAttribute('data-expansion'))>.99,'Reverse scrolling opens the assembly again');
  await page.locator('[data-language]').click();assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('.chapter-buttons [aria-current=step]').getAttribute('data-jump'),'1','Language changes preserve the current chapter');
  await page.screenshot({path:`/tmp/passung-review/${mobile?'mobile':'desktop'}-en.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'English has no overflow');
  // The detail hotspot gives way to the nine labels at full separation.
  await go(3);
  await page.evaluate(()=>__passungMachine.setRotationPaused('browser-check',true));
  await page.locator('#machine').focus();await page.keyboard.press('Home');
  await page.locator('.part-hotspot:visible').waitFor();
  await page.locator('.part-hotspot').click();await page.locator('.info-dialog').waitFor({state:'visible'});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.info-dialog').isVisible(),false);
  assert.equal(await page.locator('.part-hotspot').evaluate(el=>document.activeElement===el),true,'Dialog restores focus');
  await page.locator('.header-actions [data-inquiry]').click();
  await page.locator('#project-idea').fill('A housing for our inspection module.');
  await page.locator('#project-material').selectOption('1');await page.locator('#project-quantity').selectOption('2');
  await page.locator('#inquiry-form [type=submit]').click();
  assert.match(await page.locator('#draft-text').inputValue(),/A housing for our inspection module\./);
  assert.match(await page.locator('#draft-text').inputValue(),/Aluminium/);
  const downloadPromise=page.waitForEvent('download');await page.locator('#download-draft').click();
  const download=await downloadPromise;assert.match(download.suggestedFilename(),/PASSUNG-enquiry-draft\.txt/);
  const stream=await download.createReadStream();let text='';for await(const chunk of stream)text+=chunk.toString();assert.match(text,/Small batch/);
  await page.keyboard.press('Escape');assert.deepEqual(sent,[],'The demo enquiry sends no user data');
  await page.mouse.move(1,1);
  await page.evaluate(()=>__passungMachine.setRotationPaused('browser-check',false));
  await page.locator('.motion-toggle').click();assert.equal(await page.locator('.motion-toggle').getAttribute('aria-pressed'),'true');
  await go(3);await page.waitForTimeout(200);
  const idle=await page.evaluate(()=>window.__creativeScene?{angle:Number(document.querySelector('#machine').dataset.angle),calls:__creativeScene.renderer.info.render.calls,triangles:__creativeScene.renderer.info.render.triangles,pending:__creativeScene.pendingFrame}:null);
  if(idle){
   await page.waitForFunction(before=>Number(document.querySelector('#machine').dataset.angle)>before+.006,idle.angle);
   assert(idle.calls<=85&&idle.triangles<280000,'Bounded drawing budget including screws and the limited-resolution reflection pass');
  }
  await page.evaluate(()=>window.postMessage({type:'example:pause'},location.origin));
  const paused=await page.evaluate(()=>window.__creativeScene?.renderer.info.render.frame);await page.waitForTimeout(180);
  if(paused!==undefined)assert.equal(await page.evaluate(()=>__creativeScene.renderer.info.render.frame),paused);
  await page.evaluate(()=>window.postMessage({type:'example:visible'},location.origin));
  assert.deepEqual(errors,[]);await page.close();
  console.log('PASS',mobile?'mobile':'desktop','Blender parts, native scroll/reverse, languages, draft, keyboard, motion and lifecycle');
 }
 for(const [width,height] of [[1366,768],[1280,800],[1024,768]]){
  const reduced=await browser.newPage({reducedMotion:'reduce',viewport:{width,height}});
  await reduced.goto(base+'/beispiele/passung/?lang=en');await reduced.waitForFunction(()=>document.documentElement.dataset.creativeReady==='true');
  assert(await reduced.locator('.motion-toggle').isDisabled());await reduced.locator('.chapter-buttons [data-jump="2"]').click();
  await reduced.waitForFunction(()=>document.querySelector('#machine').dataset.progress==='2.000');
  assert(await reduced.evaluate(()=>document.querySelector('.step-context').getBoundingClientRect().bottom<document.querySelector('.chapter-rail').getBoundingClientRect().top-8),'Laptop copy stays above the chapter rail');
  if(width===1366)await reduced.screenshot({path:'/tmp/passung-review/laptop-en.png'});
  await reduced.close();
 }
 const fallback=await browser.newPage({viewport:{width:390,height:844}});
 await fallback.addInitScript(()=>{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:native.call(this,type,...args);};});
 await fallback.goto(base+'/beispiele/passung/?lang=de');await fallback.waitForFunction(()=>document.documentElement.dataset.creativeReady==='true');
 assert(await fallback.locator('.machine-poster').isVisible());assert(await fallback.locator('.machine-poster').evaluate(image=>image.naturalWidth>0));
 await fallback.locator('.chapter-buttons [data-jump="2"]').click();await fallback.waitForFunction(()=>document.documentElement.dataset.chapter==='2');
 assert.match(await fallback.locator('.model-status').textContent(),/Standbild/);await fallback.close();
 const reading=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
 await reading.goto(base+'/beispiele/passung/?lang=en');assert(await reading.locator('.reading-chapters').isVisible());assert.equal(await reading.locator('.reading-chapters article').count(),4);
 assert.equal(await reading.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await reading.screenshot({path:'/tmp/passung-review/no-js.png',fullPage:true});await reading.close();
 assert((await stat('Elemente/Beispiele/PASSUNG_web.glb')).size<650000,'Compressed machine stays below 650 KB');
 console.log('PASS system reduced motion, no-WebGL still and no-JavaScript reading view');
}finally{await browser.close();}
