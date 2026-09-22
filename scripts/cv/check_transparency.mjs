import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.CV_URL||'http://127.0.0.1:5176';
const output=process.env.CV_TEST_OUTPUT||'/tmp/cv-transparency-check';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:.5,reducedMotion:'reduce',isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('vl-language','de'));
  await page.goto(`${base}/#lebenslauf`);
  await page.waitForFunction(()=>window.__stage?.cards.documentPickables.find(m=>m.userData.key==='lebenslauf')?.material.uniforms.uMap.value&&document.querySelector('#boot.is-done'));
  for(const language of ['de','en']){
   await page.evaluate(async language=>{const {setLanguage}=await import('/src/i18n.js');setLanguage(language);},language);
   await page.waitForFunction(()=>window.__stage.cards.documentPickables.find(m=>m.userData.key==='lebenslauf').visible);
   await page.locator('.nav__link[data-target="lebenslauf"]').click();
   const stats=await page.evaluate(()=>{
    const canvas=window.__stage.cards.documentPickables.find(m=>m.userData.key==='lebenslauf').material.uniforms.uMap.value.image;
    const ctx=canvas.getContext('2d');const stats=[];
    for(let p=0;p<2;p++){
     const top=Math.floor(p*canvas.height/2),height=Math.floor((p+1)*canvas.height/2)-top;
     const data=ctx.getImageData(0,top,canvas.width,height).data;let transparent=0,ink=0;
     for(let i=0;i<data.length;i+=4){if(data[i+3]<10)transparent++;if(Math.max(data[i],data[i+1],data[i+2])>140&&data[i+3]>180)ink++;}
     stats.push({page:p+1,transparent:transparent/(data.length/4),ink});
    }return stats;
   });
   for(const s of stats){assert(s.transparent>.5,`${language} page ${s.page}: background opaque`);assert(s.ink>1000,`${language}: content lost`);}
   for(const end of [false,true]){
    await page.keyboard.press(end?'End':'Home');
    await page.waitForFunction(end=>window.__stage.cards.documentScroll===(end?1:0),end);
    await page.waitForTimeout(400);await page.screenshot({path:`${output}/${mobile?'mobile':'desktop'}-${language}-${end?2:1}.png`});
   }
   results.push({mobile,language,stats});
  }
  await page.locator('.nav__link[data-target="projekte"]').click();
  assert.equal(await page.locator('.project-choice').count(),1);
  assert.equal(await page.locator('[data-project-id="knallblau"]').count(),0);
  assert(!await page.locator('.projects-browser').innerText().then(t=>/knallblau/i.test(t)));
  assert.deepEqual(errors,[]);await page.close();
 }
 await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
