import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.EXAMPLE_PREVIEW_URL || 'http://127.0.0.1:4173';
const output = process.env.EXAMPLE_TEST_OUTPUT || '/tmp/example-production-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [width, height] of [[1920, 1080], [1440, 900], [1366, 768], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const lang of ['de', 'en']) {
      const response = await page.goto(`${base}/beispiel/?lang=${lang}`);
      assert.equal(response.status(), 200);
      await page.locator('.hardware').evaluate(image => image.decode());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('nav a').count(), 3);
      await page.screenshot({ path: `${output}/direct-${width}-${lang}.png` });
      await page.locator('nav a[href="#lebenslauf"]').click();
      await page.locator('#cv-title').waitFor();
      assert(await page.locator('.education').count() > 0);
      assert.match(await page.locator('a.contact').getAttribute('href'), /^mailto:/);
      results.push({ width, height, lang, passed: true });
    }
  }
  for (const path of ['/example/hardware.webp', '/example/preview.webp', '/ihk/IHK_Projektarbeit_DE.pdf', '/ihk/IHK_Project_Report_EN.pdf', '/ihk/IHK_Projektfilm_DE.mp4', '/ihk/IHK_Project_Film_EN.mp4']) {
    const response = await page.request.get(`${base}${path}`);
    assert.equal(response.status(), 200, path);
    assert(!response.headers()['content-type'].includes('text/html'), 'Asset must not resolve to a SPA fallback');
  }
  assert.deepEqual(errors, []);
  await page.close();

  // WebGL failure still leaves an ordinary, usable route link.
  const fallback = await browser.newContext();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return /webgl/.test(type) ? null : original.call(this, type, ...args);
    };
  });
  const fallbackPage = await fallback.newPage();
  await fallbackPage.goto(`${base}/#home`);
  await fallbackPage.locator('.stage.is-fallback').waitFor();
  await fallbackPage.locator('.nav__link[data-target="projekte"]').click();
  await fallbackPage.locator('.project-choice[data-project-id="systems"]').click();
  await fallbackPage.waitForURL(url => url.pathname === '/beispiel/' && ['de', 'en'].includes(url.searchParams.get('lang')));
  await fallbackPage.locator('h1').waitFor();
  results.push({ webglFallback: true });
  await fallback.close();

  const context = await browser.newContext({ deviceScaleFactor: Number(process.env.TEST_DPR || 1), viewport: { width: 1440, height: 900 } });
  const scene = await context.newPage();
  const sceneErrors = [];
  scene.on('pageerror', error => sceneErrors.push(error.message));
  await scene.goto(`${base}/#projekte`);
  await scene.waitForFunction(() => document.querySelector('#boot.is-done'));
  await scene.locator('.nav__link[data-target="projekte"]').click();
  await scene.locator('.project-choice[data-project-id="systems"]').click();
  await scene.locator('.example-projection[data-state="open"] iframe[data-ready="true"]').waitFor();
  const embedded = scene.frameLocator('.example-projection iframe');
  await embedded.locator('h1').click();
  await scene.keyboard.press('PageDown');
  await scene.waitForTimeout(1200);
  assert(await embedded.locator('body').evaluate(() => scrollY > 0), 'Keyboard scroll in production');
  assert.equal(await scene.locator('[data-example-separate]').count(), 0);
  assert.equal(await scene.locator('.head').isVisible(), false);
  assert.equal(await scene.locator('[data-example-back]').isVisible(), true);
  await embedded.locator('[data-portfolio="abschluss"]').click();
  await scene.waitForFunction(() => !document.querySelector('.example-projection').open);
  await scene.waitForURL('**/#abschluss');
  await scene.locator('.nav__link[data-target="abschluss"]').click();
  await scene.locator('.ihk-reader-toggle').waitFor({ state: 'visible' });
  assert.deepEqual(sceneErrors, []);
  results.push({ productionProjection: true, keyboardScroll: true, immersiveControls: true, portfolioLink: true });
  await context.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log('Production: 10 responsive views, static assets, WebGL fallback and interactive projection passed.');
} finally { await browser.close(); }
