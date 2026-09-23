import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const base = process.env.SITE_URL || 'http://127.0.0.1:4176';
const output = process.env.SITE_TEST_OUTPUT || '/tmp/site-inspection-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];
const hash = data => createHash('sha256').update(data).digest('hex');
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: .5, locale: 'de-DE' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) console.log(`HTTP ${response.status()}: ${response.url()}`); });
  await page.addInitScript(() => localStorage.setItem('vl-intro-seen', '1'));
  await page.goto(`${base}/#home`);
  await page.waitForFunction(() => document.querySelector('#boot.is-done'));
  const initialInert = await page.locator('#frame [inert]').count();
  const trigger = page.locator('.site-method button');
  const overlay = page.locator('.site-inspection');
  await trigger.hover();
  await overlay.waitFor({ state: 'visible' });
  assert.match(await overlay.locator('h2').textContent(), /Wie diese Seite/);
  await page.waitForTimeout(250);
  const first = hash(await page.locator('#frame').screenshot());
  await page.waitForTimeout(6500);
  assert.equal(hash(await page.locator('#frame').screenshot()), first, 'Entire frame must stay still, including CSS effects');
  await page.screenshot({ path: `${output}/desktop-de.png` });
  await page.mouse.move(700, 350);
  await overlay.waitFor({ state: 'hidden' });
  const resumed = hash(await page.locator('#scene').screenshot());
  await page.waitForTimeout(600);
  assert.notEqual(hash(await page.locator('#scene').screenshot()), resumed, 'Scene must resume');
  await trigger.click();
  await page.mouse.move(700, 350);
  assert.equal(await trigger.getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.head__symbol-stage').evaluate(el => getComputedStyle(el).visibility), 'hidden');
  const closeBox = await overlay.locator('.site-inspection__close').boundingBox();
  const headerBox = await page.locator('.head').boundingBox();
  assert(Math.abs(closeBox.x + closeBox.width / 2 - headerBox.x - headerBox.width / 2) < 2, 'Close belongs at the geometry centre');
  assert.equal(await overlay.locator('.site-inspection__close').evaluate(el => getComputedStyle(el).animationDuration), '3.4s');
  const crossesNavigation = await overlay.locator('.site-inspection__diagram').evaluate(svg => {
    const links = [...document.querySelectorAll('.nav__link')].filter(el => el.getClientRects().length).map(el => el.getBoundingClientRect());
    return [...svg.querySelectorAll('g > path')].some(path => {
      const length = path.getTotalLength();
      for (let distance = 0; distance <= length; distance += 2) {
        const p = path.getPointAtLength(distance);
        if (links.some(r => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom)) return true;
      }
      return false;
    });
  });
  assert.equal(crossesNavigation, false, 'Leader lines must not strike through header controls');
  await page.keyboard.press('ArrowRight');
  assert.equal(new URL(page.url()).hash, '#home');
  await page.keyboard.press('Tab');
  assert(await overlay.locator('.site-inspection__close').evaluate(el => el === document.activeElement));
  await page.keyboard.press('Enter');
  await overlay.waitFor({ state: 'hidden' });
  assert(await trigger.evaluate(el => el === document.activeElement));
  assert.equal(await page.locator('.head__symbol-stage').evaluate(el => getComputedStyle(el).visibility), 'visible');
  await page.waitForTimeout(200);
  assert.equal(await overlay.isVisible(), false, 'Returning focus must not reopen the panel');
  // Use the real language switch: no separate module instance through a dev import.
  await page.locator('#language-switch').click();
  await trigger.click();
  assert.equal(await overlay.locator('h2').textContent(), 'How this site is built');
  await page.keyboard.press('Escape');
  await overlay.waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#frame [inert]').count(), initialInert);
  for (const [width, height] of [[1920,1080], [1366,768], [768,1024], [390,844], [844,390]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    await trigger.click();
    await overlay.waitFor({ state: 'visible' });
    const compact = width <= 900 || height <= 690;
    if (compact) {
      for (const button of await overlay.locator('.site-inspection__tabs button').all()) {
        await button.click();
        await page.waitForTimeout(30);
        assert.equal(await overlay.locator('.site-inspection__note:visible').count(), 1);
      }
    }
    const rectangles = await overlay.locator('.site-inspection__note:visible').evaluateAll(elements => elements.map(el => {
      const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom };
    }));
    for (const r of rectangles) assert(r.left >= 0 && r.right <= width + 1 && r.top >= 0 && r.bottom <= height, JSON.stringify({ width, height, r }));
    const toolbar = await overlay.locator('.site-inspection__toolbar').boundingBox();
    assert(toolbar.y >= 0 && toolbar.y + toolbar.height <= height, 'Heading and close control must remain visible');
    const closeRect = await overlay.locator('.site-inspection__close').boundingBox();
    assert(closeRect.x >= 0 && closeRect.y >= 0 && closeRect.x + closeRect.width <= width && closeRect.y + closeRect.height <= height, 'Close must remain reachable');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${output}/${width}-en.png` });
    await page.keyboard.press('Escape');
    await overlay.waitFor({ state: 'hidden' });
    results.push({ width, height, compact, passed:true });
  }
  assert.deepEqual(errors, []);
  await page.close();
  const filmPage = await browser.newPage({ viewport:{width:1440,height:900}, deviceScaleFactor:.5, reducedMotion:'reduce' });
  await filmPage.goto(`${base}/#abschluss`);
  await filmPage.waitForFunction(() => document.querySelector('#boot.is-done'));
  const video = filmPage.locator('.ihk-hologram-film video');
  await filmPage.locator('.ihk-hologram-film__play').click();
  await filmPage.waitForFunction(() => document.querySelector('.ihk-hologram-film video').currentTime > .3);
  await filmPage.locator('.site-method button').hover();
  assert(await video.evaluate(element => element.paused));
  const videoTime = await video.evaluate(element => element.currentTime);
  await filmPage.waitForTimeout(700);
  assert.equal(await video.evaluate(element => element.currentTime), videoTime);
  await filmPage.mouse.move(500,400);
  await filmPage.waitForFunction(time => document.querySelector('.ihk-hologram-film video').currentTime > time + .2, videoTime);
  results.push({ actualProjectFilmPausedAndResumed:true });
  await filmPage.close();
  for (const fallback of [false, true]) {
    const mobile = await browser.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor:.5, isMobile:true, hasTouch:true, locale:'en-GB', reducedMotion:'reduce' });
    if (fallback) await mobile.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/.test(type) ? null : get.call(this,type,...args); };
    });
    await mobile.goto(`${base}/#home`);
    await mobile.waitForFunction(() => document.querySelector('#boot.is-done'));
    const mobileInert = await mobile.locator('#frame [inert]').count();
    await mobile.locator('.site-method button').tap();
    await mobile.locator('.site-inspection.is-pinned').waitFor({ state:'visible' });
    assert.equal(await mobile.locator('.site-inspection__close').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await mobile.locator('.site-inspection h2').textContent(), 'How this site is built');
    await mobile.locator('.site-inspection__tabs button').nth(3).tap();
    await mobile.locator('.site-inspection__close').tap();
    await mobile.locator('.site-inspection').waitFor({ state:'hidden' });
    assert.equal(await mobile.locator('#frame [inert]').count(), mobileInert);
    results.push({ touch:true, reducedMotion:true, fallback, passed:true });
    await mobile.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results,null,2));
  console.log('Inspection: frozen frame, resume, pin, keyboard/ESC, DE/EN, five sizes, actual film playback, touch, reduced motion and WebGL fallback passed.');
} finally { await browser.close(); }
