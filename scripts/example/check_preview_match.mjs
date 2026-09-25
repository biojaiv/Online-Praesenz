import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PROJECTS,getProjectUrl } from '../../src/data/projects.js';
const base=process.env.EXAMPLE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 // The accessible fallback uses the same descriptors and choices as the spatial sheets.
 await page.addInitScript(()=>{localStorage.setItem('vl-intro-seen','1');const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};});
 await page.goto(base);
 for(const lang of ['de','en']){
  await page.locator('#language-switch').waitFor();
  if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#language-switch').click();
  for(const section of ['webseiten','systemintegration']){
   await page.goto(`${base}/#projekte/${section}`);await page.locator('.project-book-ui:not([hidden])').waitFor();
   const list=PROJECTS.filter(p=>p.category===section);
   for(const project of list){
    const link=page.locator(`[data-wing="${section}"] .wing-projects [data-project-id="${project.id}"]`);
    assert.equal(await link.getAttribute('href'),getProjectUrl(project,lang));
    const response=await page.request.get(base+project.preview(lang));assert.equal(response.status(),200);assert.match(response.headers()['content-type'],/^image\//);
   }
   assert.equal(await page.locator(`[data-wing="${section}"] .wing-preview img`).getAttribute('src'),list[0].preview(lang));
  }
 }
 await page.locator('[data-wing="systemintegration"] .wing-preview').click();await page.waitForURL('**/systemintegration/**');assert.equal(await page.locator('video').getAttribute('src'),'/recovery/recovery-en.mp4');
 console.log('PASS: matching DE/EN preview assets, category project URLs and direct navigation without WebGL. Spatial activation/zoom is covered by test:project-wings.');
}finally{await browser.close();}
