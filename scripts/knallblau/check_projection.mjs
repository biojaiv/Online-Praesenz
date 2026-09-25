import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const base=process.env.KNALLBLAU_URL||'http://127.0.0.1:5176';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
await mkdir('/tmp/knallblau-projection',{recursive:true});
try{
 for(const mobile of [false,true]){
 const page=await browser.newPage({locale:'de-DE',deviceScaleFactor:.5,viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,reducedMotion:mobile?'reduce':'no-preference'});
 page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('vl-language','de'));
 await page.goto(`${base}/#projekte`);
 await page.waitForFunction(()=>window.__stage&&document.querySelector('#boot.is-done')&&!document.querySelector('.frame.is-intro'));
 await page.locator('.nav__link[data-target="projekte"]').click();
 const choice=page.locator('[data-project-id="knallblau"].project-choice');await choice.waitFor({state:'visible'});
 assert.equal(await page.locator('.project-choice').count(),2);
 await page.screenshot({path:`/tmp/knallblau-projection/gallery-${mobile}.png`});
 await page.evaluate(()=>{window.__turn=[];window.__sampler=setInterval(()=>window.__turn.push(window.__stage.exampleFlight.yaw),30);});
 await choice.click();await choice.evaluate(e=>e.click());
 await page.locator('.example-projection[data-state="open"] iframe[data-ready="true"]').waitFor();
 const frame=page.frameLocator('.example-projection iframe');await frame.locator('h1').waitFor();
 assert.equal(await frame.locator('html').getAttribute('data-opening'),null);
 assert(await page.locator('[data-example-separate]').isVisible());assert.equal(await page.locator('.head').isVisible(),false);
 const turns=await page.evaluate(()=>{clearInterval(window.__sampler);return window.__turn;});
 if(!mobile){assert(turns.filter(y=>y>.1&&y<3).length>=3);assert(Math.abs(turns.at(-1)-Math.PI)<.001);}
 const pose=()=>page.evaluate(()=>[...window.__stage.camera.position.toArray(),...window.__stage.camera.quaternion.toArray()]);const before=await pose();
 await frame.locator('a[href*="#arbeit"]').first().click();await frame.locator('body').evaluate(()=>new Promise(resolve=>{const timer=setInterval(()=>{if(scrollY>0){clearInterval(timer);resolve();}},50);}));assert.deepEqual(await pose(),before);
 await frame.locator('.project-story a').first().click();await frame.locator('.case-heading').waitFor();
 await page.waitForFunction(()=>document.querySelector('[data-example-separate]').href.includes('arbeit/tischlerei'));
 assert.match(await page.locator('.example-projection iframe').evaluate(e=>e.contentWindow.location.search),/embed=1/);
 await page.screenshot({path:`/tmp/knallblau-projection/case-${mobile}.png`});
 await frame.locator('h1').click();await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('.example-projection').open);
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.projectId),'knallblau');
 await choice.click();await page.locator('.example-projection[data-state="open"] iframe[data-ready="true"]').waitFor();
 await page.locator('[data-example-back]').click();await page.waitForFunction(()=>!document.querySelector('.example-projection').open);
 assert.deepEqual(errors,[]);await page.close();console.log(`${mobile?'Mobile/reduced':'Desktop/180°'} projection, case navigation, scroll lock, ESC and reopen passed.`);
 }
}finally{await browser.close();}
