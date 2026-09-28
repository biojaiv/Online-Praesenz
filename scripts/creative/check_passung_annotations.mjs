import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
await mkdir('/tmp/passung-annotations',{recursive:true});
try{
 for(const [name,width,height] of [['desktop',1440,1000],['laptop',1366,768],['phone',390,844],['small',320,740]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/beispiele/passung/?lang=de');await page.locator('#machine[data-auto-rotating=true]').waitFor();
  assert(await page.locator('.parts-annotations').isHidden(),'No labels in the initial CAD view');
  await page.locator('.chapter-buttons [data-jump="1"]').click();await page.locator('.parts-annotations:not([hidden])').waitFor();
  const first=await page.locator('#machine').getAttribute('data-angle');
  await page.waitForFunction(a=>Number(document.querySelector('#machine').dataset.angle)>Number(a)+.01,first);
  await page.evaluate(()=>__passungMachine.setRotationPaused('verification',true));
  await page.locator('#machine').click({position:{x:10,y:120},force:true});
  assert.equal(await page.locator('#machine').evaluate(el=>getComputedStyle(el).outlineStyle),'none','Clicking the model does not draw a canvas border');
  await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('#machine').dataset.angle==='0.0000');
  for(const language of ['de','en']){
   if(language==='en')await page.locator('[data-language]').click();
   assert.equal(await page.locator('.part-callout:visible').count(),9);
   const layout=await page.locator('.part-callout').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:el.scrollWidth>el.clientWidth};}));
   for(const r of layout){assert(r.x>=0&&r.right<=width+1&&r.y>=0&&r.bottom<=height,'Callouts stay in the viewport');assert(!r.overflow,'Names wrap within their cells');}
   for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++){
    const a=layout[i],b=layout[j];assert(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,'Names never overlap');
   }
   await page.screenshot({path:`/tmp/passung-annotations/${name}-${language}.png`});
  }
  const before=await page.locator('.parts-annotations path').first().getAttribute('d');
  await page.locator('#machine').focus();await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(d=>document.querySelector('.parts-annotations path').getAttribute('d')!==d,before);
  assert.equal(await page.locator('.part-callout:visible').count(),9,'Annotations follow manual rotation');
  await page.locator('.chapter-buttons [data-jump="3"]').click();await page.locator('.parts-annotations').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);await page.close();console.log('PASS',name,'click focus, bilingual exploded labels, bounds, no overlap, rotation and collapse');
 }
}finally{await browser.close();}
