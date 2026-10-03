import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const mobile of [false,true])for(const id of ['resonanz','palimpsest']){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1414,height:820},deviceScaleFactor:1,reducedMotion:mobile?'reduce':'no-preference',isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.addInitScript(()=>{window.__audio=[];if(window.AudioContext){const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);window.__audio.push(this);}};}});
  await page.goto(`${base}/beispiele/${id}/?lang=de`);await page.waitForFunction(()=>document.documentElement.dataset.creativeReady==='true');
  assert.equal(await page.locator('canvas[data-engine]').getAttribute('data-model-ready'),'true','The authored Blender asset loaded, rather than the reading fallback');
  const rendering=await page.evaluate(()=>window.__creativeScene?{
   calls:__creativeScene.renderer.info.render.calls,triangles:__creativeScene.renderer.info.render.triangles,
   shadowPass:__creativeScene.renderer.shadowMap.enabled,
   authored:__creativeScene.scene.children.some(object=>object.userData.source?.endsWith('.blend'))
  }:null);
  if(rendering){
   assert(rendering.authored);assert.equal(rendering.shadowPass,false,'Lighting needs no runtime shadow pass');
   assert(rendering.calls<=(id==='resonanz'?2:8),'Small draw-call budget: instanced lamellae plus their strings; tram, instanced residents, birds and smoke');
   if(id==='resonanz'&&mobile)assert(rendering.triangles<85000,'Mobile uses the lighter Blender geometry');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
  assert.equal(await page.locator('html').getAttribute('lang'),'de');
  if(id==='resonanz'){
   assert.equal(await page.evaluate(()=>__audio.length),0,'No AudioContext before consent');
   assert(await page.locator('.sound-gate').isVisible(),'Opening asks clearly for sound');
   assert.equal(await page.evaluate(()=>document.activeElement?.className),'sound-gate__on','The sound choice has focus');
   await page.locator('.sound-gate__skip').click();assert(!await page.locator('.sound-gate').isVisible(),'Visitors may look without sound first');
   await page.evaluate(()=>__resonanz.strike(40,.8,{label:true}));assert(await page.locator('.sound-hint').isVisible(),'Striking without sound points to the sound button');
   assert.equal(await page.evaluate(()=>__audio.length),0,'Declining creates no AudioContext');
   assert.equal(await page.locator('#tone,#space,#save-sound,.dial-control').count(),0,'Knobs and sound export are removed');
   assert.equal(await page.locator('.creative-footer #sound').count(),1,'The primary sound button is in the footer');
   const soundBox=await page.locator('#sound').boundingBox();assert(Math.abs(soundBox.x+soundBox.width/2-(mobile?390:1414)/2)<2,'Sound button is centered');
   if(!mobile)assert.equal(await page.locator('#sound').evaluate(el=>getComputedStyle(el).animationName),'sound-invitation');
   const initialPitch=Number.parseFloat(await page.locator('#frequency').textContent());
   await page.locator('#sculpture').hover();await page.mouse.wheel(350,0);
   await page.waitForFunction(initial=>Number.parseFloat(document.querySelector('#frequency').textContent)>initial*2,initialPitch);
   await page.mouse.wheel(-700,0);
   await page.waitForFunction(initial=>Number.parseFloat(document.querySelector('#frequency').textContent)<initial*.55,initialPitch);
   await page.locator('#sound').click();await page.waitForFunction(()=>document.querySelector('#sound').getAttribute('aria-pressed')==='true');
   assert.equal(await page.evaluate(()=>__audio[0].state),'running');
   assert.equal(await page.locator('#sound').evaluate(el=>getComputedStyle(el).animationName),'none','Invitation stops when playing');
   await page.locator('[data-chapter="4"]').click();assert.equal(await page.locator('[data-chapter="4"]').getAttribute('aria-current'),'step');
   await page.locator('[data-room="85"]').click();assert.equal(await page.locator('[data-room="85"]').getAttribute('aria-pressed'),'true');
   await page.evaluate(()=>window.postMessage({type:'example:pause'},location.origin));
   await page.waitForFunction(()=>__audio[0].state==='suspended');assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
   const paused=await page.evaluate(()=>window.__creativeScene?{frame:__creativeScene.renderer.info.render.frame,pending:__creativeScene.pendingFrame}:null);
   if(paused){await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>__creativeScene.renderer.info.render.frame),paused.frame);assert.equal(paused.pending,0);}
   await page.evaluate(()=>window.postMessage({type:'example:visible'},location.origin));assert.equal(await page.evaluate(()=>__audio[0].state),'suspended','Returning never re-enables sound');
  }else{
   assert.equal(await page.locator('[data-era="1"]').getAttribute('aria-current'),'step');assert.match(await page.locator('.artifact-summary').textContent(),/1924/);
   await page.locator('[data-era="2"]').click();await page.waitForFunction(()=>document.querySelector('.ticket-year').textContent==='1643');
   await page.evaluate(()=>scrollTo(0,innerHeight*3));await page.waitForFunction(()=>document.querySelector('[data-era="3"]').getAttribute('aria-current')==='step');
   await page.locator('[data-era="1"]').click();await page.waitForFunction(()=>document.querySelector('.ticket-year').textContent==='1924');await page.locator('#open-story').click();assert(await page.locator('dialog').isVisible());await page.keyboard.press('Escape');assert(!await page.locator('dialog').isVisible());
  }
  await page.locator('[data-language]').click();assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'English has no overflow');
  await page.evaluate(()=>window.postMessage({type:'example:pause'},location.origin));
  await page.screenshot({path:`/tmp/creative-review/${id}-${mobile?'mobile':'desktop'}-tested.png`});
  assert.deepEqual(errors,[]);await page.close();console.log('PASS',id,mobile?'mobile':'desktop','language, controls, lifecycle and layout');
  if(id==='resonanz'&&!mobile){
   const fresh=await browser.newPage({viewport:{width:1414,height:820},deviceScaleFactor:1});
   await fresh.addInitScript(()=>{window.__audio=[];const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);window.__audio.push(this);}};});
   await fresh.goto(`${base}/beispiele/resonanz/?lang=en`,{waitUntil:'domcontentloaded',timeout:90000});await fresh.waitForFunction(()=>document.documentElement.dataset.creativeReady==='true',null,{timeout:90000});
   await fresh.locator('.sound-gate__on').click();await fresh.waitForFunction(()=>document.querySelector('#sound').getAttribute('aria-pressed')==='true');
   assert.equal(await fresh.evaluate(()=>__audio[0].state),'running','The dialog button turns sound on');assert(!await fresh.locator('.sound-gate').isVisible());
   await fresh.close();
  }
 }
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:get.call(this,type,...args);};});
 await fallback.goto(base+'/beispiele/palimpsest/?lang=en');await fallback.waitForFunction(()=>document.documentElement.dataset.creativeReady==='true');assert(await fallback.locator('.visual-fallback').isVisible());await fallback.locator('[data-era="2"]').click();assert.match(await fallback.locator('.ticket-year').textContent(),/1643/);await fallback.close();console.log('PASS no-WebGL reading and era navigation');
}finally{await browser.close();}
