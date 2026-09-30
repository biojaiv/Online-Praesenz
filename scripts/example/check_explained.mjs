import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base=process.env.EXAMPLE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({args:['--no-sandbox']});
try {
  for(const width of [1440,390,320]) for(const lang of ['de','en']) {
    const page=await browser.newPage({viewport:{width,height:1000},javaScriptEnabled:false});
    const path=`/beispiel/erklaert/${lang==='en'?'en/':''}`;
    const response=await page.goto(base+path);assert.equal(response.status(),200);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    assert(await page.locator('.tiefgang-frame').isVisible());
    assert.equal(await page.locator('[data-tiefgang-start]').getAttribute('href'),`/beispiel/?lang=${lang}`);
    assert.equal(await page.locator('[data-tiefgang-hologram]').getAttribute('href'),`/?lang=${lang}#projekte/webseiten`);
    await page.locator('#glossary').scrollIntoViewIfNeeded();
    const returns=await page.locator('.tiefgang-navigation a').evaluateAll(links=>links.every(link=>{
      const box=link.getBoundingClientRect();
      return box.top>=0&&box.bottom<=innerHeight&&link.contains(document.elementFromPoint(box.left+box.width/2,box.top+box.height/2));
    }));
    assert(returns,'Both return destinations stay reachable at the glossary, even without JavaScript');
    assert.match(await page.locator('h1').innerText(),lang==='de'?/Karton.*Arbeitsplatz/:/cardboard box.*workstation/);
    assert.equal(await page.locator('.step-card').count(),8);
    assert.equal(await page.locator('.depth-examples article').count(),3);
    assert.equal(await page.locator('.glossary-grid>div').count(),15);
    assert.match(await page.locator('.model-section').innerText(),/40/);
    assert.match(await page.locator('.model-section').innerText(),lang==='de'?/keine vollständige Produktionsmigration/:/not a complete production migration/);
    const geometry=await page.evaluate(()=>{
      const labels=[...document.querySelectorAll('.hero-figure .diagram-label')].map(e=>e.getBoundingClientRect());
      return {overflow:document.documentElement.scrollWidth>innerWidth,overlap:labels.some((b,i)=>i&&labels[i-1].bottom>b.top+1),spill:labels.at(-1).bottom>document.querySelector('.diagram-plate').getBoundingClientRect().bottom,small:[...document.querySelectorAll('.hero-figure .diagram-label *')].some(e=>parseFloat(getComputedStyle(e).fontSize)<12)};
    });
    assert(!geometry.overflow,'No horizontal scrolling');assert(!geometry.overlap,'Localized labels never overlap');assert(!geometry.spill,'Labels stay in illustration');assert(!geometry.small,'Actual HTML labels at least12px');
    for(const link of await page.locator('.diagram-label').evaluateAll(els=>els.map(e=>e.getAttribute('href')))) assert.equal(await page.locator(link).count(),1);
    assert.equal(await page.locator('.start-button').getAttribute('href'),`/beispiel/?lang=${lang}`);
    await page.locator('.locale-switch').click();assert.equal(await page.locator('html').getAttribute('lang'),lang==='de'?'en':'de');
    await page.emulateMedia({media:'print'});assert(!await page.locator('.explained-masthead nav').isVisible());assert.equal(await page.locator('.step-card').count(),8);
    await page.close();console.log(`PASS explainer ${width}px / ${lang}: no-JS language routes, steps, glossary, real labels, print`);
  }
} finally {await browser.close();}
