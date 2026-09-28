import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('/tmp/creative-review',{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const mobile=process.env.TEST_DEVICE==='mobile';
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
try{
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce',isMobile:mobile,hasTouch:mobile});
 const errors=[],requests=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
 await page.addInitScript(()=>{localStorage.setItem('vl-intro-seen','1');localStorage.setItem('vl-language','de');Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});});
 await page.route('**/*Hintergrund_web*.glb*',route=>route.abort());
 await page.goto(base+'/#projekte/webseiten');await page.waitForFunction(()=>document.querySelector('#boot.is-done')&&!document.querySelector('.frame.is-intro'),{timeout:60000});
 await page.locator('.project-book-ui:not([hidden])').waitFor();await page.waitForTimeout(1300);
 assert.deepEqual(await page.locator('[data-project-card]').evaluateAll(cards=>cards.map(card=>card.dataset.projectId)),['systems','passung']);
 assert(!requests.some(url=>/creative\/resonanz-(mobile|desktop)-.*\.webp/.test(url)),'Archived sound preview is not requested by the gallery');
 assert(!requests.some(url=>/creative\/(resonanz|palimpsest|cityModel|resonanzAudio)\.js|passung\/(main|machine)\.js|assets\/(resonanz|palimpsest|passung)-.*\.js/.test(url)),'Examples are not loaded with the gallery');
 assert(!requests.some(url=>/(PALIMPSEST|RESONANZ|PASSUNG).*_web.*\.glb/.test(url)),'Blender example geometry is deferred until opening');
 if(await page.evaluate(()=>Boolean(window.__stage))){
  const labels=await page.evaluate(()=>__stage.cards.group.getObjectsByProperty('name','card-label').map(mesh=>{
   const p=mesh.geometry.attributes.position;const z=Array.from({length:p.count},(_,i)=>p.getZ(i));
   return {key:mesh.userData.key,radius:mesh.userData.labelRadius,depth:Math.max(...z)-Math.min(...z),visible:mesh.visible&&mesh.parent.visible,opacity:mesh.material.opacity};
  }));assert.equal(labels.length,3);assert(labels.every(label=>label.depth>.8&&label.visible&&label.opacity>.9),'All three descriptions are genuinely curved and visible');
  await page.evaluate(()=>__stage.setProjectionIdle(true));
 }
 await page.screenshot({path:`/tmp/creative-review/portfolio-gallery-${mobile?'mobile':'desktop'}.png`});
 if(await page.evaluate(()=>Boolean(window.__stage)))await page.evaluate(()=>__stage.setProjectionIdle(false));
 for(const id of ['passung']){
  const trigger=page.locator(`[data-project-card][data-project-id="${id}"]`),preview=await trigger.locator('img').evaluate(image=>image.currentSrc);if(mobile)await trigger.evaluate(el=>el.scrollIntoView({block:'nearest',behavior:'instant'}));const oldScroll=await page.locator('.project-book-sheets').evaluate(el=>el.scrollTop);await trigger.focus();await page.keyboard.press('Enter');
  await page.locator('.example-projection[data-state="open"]').waitFor();await page.waitForFunction(()=>document.querySelector('.example-projection iframe')?.dataset.revealed==='true');
  const iframe=page.locator('.example-projection iframe');assert.match(await iframe.getAttribute('src'),new RegExp(`/beispiele/${id}/`));
  assert.equal(await page.locator('.example-projection__preview').getAttribute('src'),preview,'Expansion uses the clicked card image');
  const child=page.frameLocator('.example-projection iframe');await child.locator('html[data-creative-ready="true"]').waitFor();
  assert.equal(await child.locator('canvas').getAttribute('data-model-ready'),'true','The fullscreen example uses its Blender model');
  if(id==='passung'){
   await child.locator('.part-hotspot').click();await page.keyboard.press('Escape');assert(await page.locator('.example-projection').isVisible(),'First ESC closes the component details, not the whole example');
   await child.locator('.chapter-buttons [data-jump="3"]').click();await child.locator('html[data-chapter="3"]').waitFor();
   await child.locator('#machine[data-expansion="0.000"]').waitFor();
  }
  await child.locator('[data-language]').click();assert.equal(await child.locator('html').getAttribute('lang'),'en');
  await child.locator('[data-language]').click();
  await page.screenshot({path:`/tmp/creative-review/portfolio-${id}.png`});
  await page.locator('[data-example-back]').click();await page.waitForFunction(()=>!document.querySelector('.example-projection').open);
  assert.equal(await page.locator('.example-projection iframe').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.dataset.projectId),id);if(mobile)assert(Math.abs(await page.locator('.project-book-sheets').evaluate(el=>el.scrollTop)-oldScroll)<3,'Mobile gallery retains its scroll position after language changes');
 }
 assert.deepEqual(errors,[]);console.log('PASS gallery, deferred resources, curved labels, matching previews, nested ESC, language and focus');
 await page.close();
}finally{await browser.close();}
