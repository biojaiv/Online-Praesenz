import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const base = process.env.SITE_URL || 'http://127.0.0.1:5173';
try {
 for (const mobile of [false, true].filter(value=>!process.env.TEST_DEVICE||process.env.TEST_DEVICE===(value?'mobile':'desktop'))) {
  const page = await browser.newPage({ viewport: mobile ? {width:390,height:844} : {width:1440,height:900}, deviceScaleFactor:.7, reducedMotion:mobile?'reduce':'no-preference', isMobile:mobile, hasTouch:mobile });
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{ localStorage.setItem('vl-intro-seen','1'); localStorage.setItem('vl-language','de'); Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2}); });
  await page.route('**/*Hintergrund_web*.glb*',route=>route.abort());
  await page.goto(base+'/#projekte/webseiten');
  await page.waitForFunction(()=>window.__stage && document.querySelector('#boot.is-done') && !document.querySelector('.frame.is-intro'));
  await page.locator('.project-book-ui:not([hidden])').waitFor();
  await page.waitForTimeout(1400);
  for (const id of ['systems','recovery']) {
   const trigger = page.locator(`.wing-preview[data-project-id="${id}"]`);
   if(mobile)await trigger.evaluate(el=>el.scrollIntoView({block:'nearest',behavior:'instant'}));
   if(!mobile)await page.evaluate(()=>{window.__openingWidths=[];const sample=()=>{const dialog=document.querySelector('.example-projection');if(dialog.dataset.state==='opening')window.__openingWidths.push(dialog.querySelector('.example-projection__light').getBoundingClientRect().width);window.__openingFrame=requestAnimationFrame(sample);};sample();});
   const before=await page.evaluate(()=>({position:__stage.camera.position.toArray(),rotation:__stage.camera.quaternion.toArray()}));
   const box=await trigger.boundingBox();
   if(mobile)await trigger.click();else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
   await page.locator('.example-projection[data-state="open"]').waitFor();
   await page.waitForFunction(()=>document.querySelector('.example-projection iframe')?.dataset.ready==='true');
   assert.equal(await page.locator('.warp-tunnel').count(),0);
   assert.equal(await page.locator('.hologram-border').count(),1);
   const view=await page.evaluate(()=>({rect:document.querySelector('.example-projection iframe').getBoundingClientRect().toJSON(),width:innerWidth,height:innerHeight,position:__stage.camera.position.toArray(),rotation:__stage.camera.quaternion.toArray(),yaw:__stage.exampleFlight.yaw}));
   if(!mobile){const widths=await page.evaluate(()=>{cancelAnimationFrame(window.__openingFrame);return window.__openingWidths;});assert(widths.length>3,'Opening has visible intermediate frames');assert(Math.max(...widths)-Math.min(...widths)>100,'Preview expands continuously to viewport');}
   assert(view.rect.width>=view.width*.95,'Content uses full viewport width');
   assert(view.rect.height>=view.height*.88,'Content uses full viewport height');
   assert.equal(view.yaw,0,'No rotation');
   assert(Math.hypot(...view.position.map((v,i)=>v-before.position[i]))<.2,'No camera flight');
   assert(Math.hypot(...view.rotation.map((v,i)=>v-before.rotation[i]))<.02,'Viewing direction stays unchanged');
   const frame=page.frameLocator('.example-projection iframe');
   await frame.locator('h1').waitFor();
   if(id==='systems') {
    assert.equal(await frame.locator('[data-terminal],.terminal-dialog').count(),0);
    await frame.locator('#example-language').click();
    assert.equal(await frame.locator('html').getAttribute('lang'),'en');
    await frame.locator('.chapter-nav [data-jump="2"]').click();
    assert.equal(await page.evaluate(()=>scrollY),0,'Scroll stays inside the page');
    if(mobile)await frame.locator('.wordmark').evaluate(el=>el.scrollIntoView());
    await frame.locator('.vm-open').click();
    await page.keyboard.press('Escape');
    assert(await page.locator('.example-projection').isVisible(),'First Escape closes the VM');
    assert(!await frame.locator('.vm-card').isVisible());
   } else {
    assert.equal(await frame.locator('video').getAttribute('src'),'/recovery/recovery-en.mp4');
   }
   await page.screenshot({path:`/tmp/fullscreen-${mobile?'mobile':'desktop'}-${id}.png`});
   assert.equal(await page.evaluate(()=>__stage.exampleFlight.yaw),0);
   const back=page.locator('[data-example-back]');
   const backBox=await back.boundingBox();
   assert(backBox.y>view.rect.y+view.rect.height,'ESC control stays below the content');
   if(id==='systems')await page.keyboard.press('Escape');else await back.click();
   await page.waitForFunction(()=>!document.querySelector('.example-projection').open);
   assert.equal(await page.locator('.example-projection iframe').count(),0);
   assert.equal(await page.evaluate(()=>__stage.exampleFlight.active),false);
   assert.equal(await page.evaluate(()=>document.activeElement.dataset.projectId),id,'Focus returns to selected object');
  }
  if(!mobile){await page.locator('.wing-preview[data-project-id="systems"]').focus();await page.keyboard.press('Enter');await page.locator('.example-projection[data-state="opening"]').waitFor();await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.example-projection').open);assert.equal(await page.locator('.example-projection iframe').count(),0,'Early Escape cancels opening cleanly');}
  assert.deepEqual(errors,[]);
  await page.close(); console.log(`PASS ${mobile?'mobile / reduced motion':'desktop'}: full viewport, fixed camera, hologram border, bilingual content, ESC, focus and cleanup`);
 }
} finally { await browser.close(); }
