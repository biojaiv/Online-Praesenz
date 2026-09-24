import { openMenu } from './menu.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base=process.env.EXAMPLE_URL||'http://127.0.0.1:5173';
const output=process.env.EXAMPLE_TEST_OUTPUT||'/tmp/project-frame-check';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:.5,reducedMotion:'reduce',locale:'de-DE'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/#projekte`);
 await page.waitForFunction(()=>window.__stage&&document.querySelector('#boot.is-done')&&!window.__stage.isMoving);
 await page.locator('.projects-panel').waitFor({state:'visible'});
 for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[768,1024],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(400);
  await page.waitForFunction(()=>!window.__stage.isMoving);
  for(const language of ['de','en']){
   await page.evaluate(async lang=>{(await import('/src/i18n.js')).setLanguage(lang);},language);
   // ResizeObserver, language-dependent header layout and the stage share RAF.
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
   await page.waitForFunction(()=>{const canvas=document.querySelector('#scene').getBoundingClientRect();const panel=document.querySelector('.projects-panel').getBoundingClientRect();return Math.abs((panel.left+panel.right)/2-(canvas.left+canvas.width/2))<.5;});
   const measured=await page.evaluate(()=>{
    const stage=window.__stage,holder=stage.cards.group.getObjectByName('card-projekte');
    const frame=holder.children.find(n=>n.userData.kind==='resume-frame');
    const u=frame.children[0].material.uniforms,c=document.querySelector('#scene').getBoundingClientRect();
    const points=[];
    for(const x of [-u.uHalfWidth.value,u.uHalfWidth.value])for(const y of [-u.uHalfHeight.value,u.uHalfHeight.value]){
     const p=frame.localToWorld(stage.camera.position.clone().set(x,y,0)).project(stage.camera);
     points.push({x:c.left+(p.x+1)*c.width/2,y:c.top+(1-p.y)*c.height/2});
    }
    const projected={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
    const panel=document.querySelector('.projects-panel'),rect=panel.getBoundingClientRect();
    const delta=Object.fromEntries(Object.keys(projected).map(k=>[k,Math.abs(projected[k]-rect[k])]));
    return {delta,previewVisible:stage.cards.group.getObjectByName('example-preview').parent.visible,projectedHeight:rect.height,viewportFits:rect.left>=c.left-1&&rect.right<=c.right+1&&rect.top>=c.top-1&&rect.bottom<=c.bottom+1};
   });
   assert(Object.values(measured.delta).every(v=>v<1),JSON.stringify({width,height,language,...measured}));
   assert(measured.previewVisible);assert(measured.viewportFits);
   await page.screenshot({path:`${output}/${width}-${language}.png`});results.push({width,height,language,...measured});
  }
 }
 await openMenu(page, 'projekte');
    await page.locator('#nav-sub-projekte [data-target="projekte/privat"]').click();await page.locator('.projects-soon').waitFor();
 await page.locator('[data-project-route="projekte/webseiten"]').click();await page.locator('.project-choice').focus();await page.keyboard.press('Enter');
 await page.locator('.example-projection[data-state="open"] iframe[data-ready="true"]').waitFor();
 await page.frameLocator('.example-projection iframe').locator('h1').click();await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('.example-projection').open);
 assert(await page.locator('.project-choice').evaluate(e=>e===document.activeElement));
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log('10 DE/EN viewport checks: all four HTML/particle edges within 1px; original preview visible; categories, projection and ESC passed.');
}finally{await browser.close();}
