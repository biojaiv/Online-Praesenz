import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
await mkdir('/tmp/passung-rotation-review',{recursive:true});
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1536,height:1024},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/beispiele/passung/?lang=de');
  const canvas=page.locator('#machine');await page.locator('#machine[data-rotatable=true]').waitFor();
  // Isolate manual input from the independently tested automatic orbit.
  await page.evaluate(()=>__passungMachine.setRotationPaused('manual-test',true));
  const angle=()=>canvas.evaluate(el=>Number(el.dataset.angle));
  const progress=()=>canvas.evaluate(el=>Number(el.dataset.progress));
  const waitForAngle=expected=>page.waitForFunction(value=>{
   const delta=Number(document.querySelector('#machine').dataset.angle)-value;
   return Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))<.001;
  },expected);
  const reset=async()=>{await page.locator('[data-reset-view]').click();await page.waitForFunction(()=>document.querySelector('#machine').dataset.angle==='0.0000');};
  const rect=await canvas.boundingBox(),x=rect.x+rect.width*.5,y=rect.y+rect.height*.44;
  const scrollBefore=await page.evaluate(()=>scrollY);
  if(mobile){
   const cdp=await page.context().newCDPSession(page);
   const swipe=async(dx,dy)=>{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/10,y:y+dy*i/10}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   };
   await swipe(115,0);await page.waitForFunction(()=>Math.abs(Number(document.querySelector('#machine').dataset.angle))>.8);
   assert.equal(await page.evaluate(()=>scrollY),scrollBefore,'Horizontal touch turns the model without scrolling the chapter');
   const turned=await angle();
   await swipe(0,-150);await page.waitForFunction(()=>scrollY>60);
   assert(Math.abs(await angle()-turned)<.001,'Vertical touch scrolls the page without turning the model');
   assert(!await canvas.evaluate(el=>el.classList.contains('is-dragging')),'Native touch cancellation releases the rotation gesture');
  }else{
   await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+180,y,{steps:12});await page.mouse.up();
   await page.waitForFunction(()=>Math.abs(Number(document.querySelector('#machine').dataset.angle))>.8);
   assert.equal(await progress(),0,'Dragging preserves the assembly chapter');
   const before=await angle();await page.locator('[data-language]').click();assert.equal(await angle(),before,'Language changes preserve the angle');
   assert.equal(await page.locator('[data-reset-view]').getAttribute('aria-label'),'Reset view');
   await page.locator('[data-language]').click();
   await page.mouse.wheel(0,800);await page.waitForFunction(()=>Number(document.querySelector('#machine').dataset.progress)>.08);
  }
  await reset();await page.emulateMedia({reducedMotion:'reduce'});
  // Manual rotation remains available with reduced motion, across CAD,
  // exploded screws and the fully assembled component.
  for(const chapter of [0,1,3]){
   await page.locator(`.chapter-buttons [data-jump="${chapter}"]`).click();
   await page.waitForFunction(p=>Number(document.querySelector('#machine').dataset.progress)===p,chapter);
   await canvas.focus();await page.keyboard.press('Home');await waitForAngle(0);
   for(const expected of [-Math.PI/2,-Math.PI,Math.PI/2,0]){
    for(let i=0;i<9;i++)await page.keyboard.press('ArrowRight');
    await waitForAngle(expected);
    if(await page.evaluate(()=>Boolean(window.__passungMachine))){
     const fits=await page.evaluate(()=>{
      const {camera}=__creativeScene,p=camera.position.clone();let inside=true;
      for(const part of __passungMachine.parts)part.traverse(mesh=>{
       if(!mesh.isMesh)return;const positions=mesh.geometry.attributes.position;
       for(let i=0;i<positions.count;i++){
        p.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera);
        if(Math.abs(p.x)>1||Math.abs(p.y)>1)inside=false;
       }
      });return inside;
     });assert(fits,'The complete rotated assembly, including screws, fits the canvas');
    }
   }
   assert(Math.abs(await angle())<.001,'A full revolution returns to the initial orientation');
   for(let i=0;i<14;i++)await page.keyboard.press('ArrowLeft');
   await waitForAngle(14*Math.PI/18);
   await page.screenshot({path:`/tmp/passung-rotation-review/${mobile?'mobile':'desktop'}-${chapter}.png`});
   await reset();
  }
  if(await page.evaluate(()=>Boolean(window.__creativeScene))){
   await page.waitForTimeout(180);const frame=await page.evaluate(()=>__creativeScene.renderer.info.render.frame);
   await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>__creativeScene.renderer.info.render.frame),frame,'Rotation spends no frames while idle');
  }
  assert.deepEqual(errors,[]);await page.close();
  console.log('PASS',mobile?'touch':'mouse','rotation, native scroll, full revolution, reset, keyboard, reduced motion and framing');
 }
}finally{await browser.close();}
