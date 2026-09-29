import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base = process.env.SITE_URL || 'http://127.0.0.1:5176';
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
const page=await browser.newPage({reducedMotion:'reduce'}), errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${base}/?lang=de`);
await page.locator('[data-info-focus=start-profile]').click();
await page.locator('[data-info-focus=profile-project]').click();
await page.locator('[data-info-term=pxe] summary').click();
await page.keyboard.press('Escape');
assert.equal(new URL(page.url()).hash,'#projekt/abschluss');
await page.locator('[data-info-focus=project-contact-top]').click();
await page.locator('[data-info-focus=contact-inspect]').click();
await page.keyboard.press('Escape');
await page.waitForFunction(()=>document.activeElement.dataset.infoFocus==='contact-inspect');
assert.equal(new URL(page.url()).hash,'#kontakt');
assert.equal(await page.locator('[data-info-focus=contact-cv]').getAttribute('href'),'/cv/CV_DE.pdf');
assert.deepEqual(errors,[]);
const staticPage=await browser.newPage({javaScriptEnabled:false}); await staticPage.goto(base);
assert(await staticPage.locator('#reading-de-info-contact-title').isVisible());
assert(await staticPage.locator('#info-project-title').isVisible());
console.log('PASS: built production routes, glossary, focus return, German documents, no-JavaScript content and no page errors.');
}finally{await browser.close()}
