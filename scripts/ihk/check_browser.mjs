import { openMenu } from '../ui/menu.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Run against `npm run preview`; evidence goes outside the repository by default.
const base = process.env.IHK_TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.IHK_TEST_OUTPUT || '/tmp/ihk-browser-check';
// Allow bounded runs on machines that render the 3D scene in software.
const viewports = [[1920, 1080], [1440, 900], [1366, 768], [768, 1024], [390, 844]];
const selectedWidths = process.env.IHK_TEST_WIDTHS?.split(',').map(Number);
assert(!selectedWidths || selectedWidths.every((width) => viewports.some(([value]) => value === width)), 'Unknown IHK_TEST_WIDTHS');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];
const errors = [];
try {
  for (const [width, height] of viewports.filter(([width]) => !selectedWidths || selectedWidths.includes(width))) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', acceptDownloads: true });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    const requests = [];
    page.on('request', (request) => { if (/\.(mp4|pdf)(\?|$)/.test(request.url()) && request.url().includes('/ihk/')) requests.push(request.url()); });
    await page.addInitScript(() => localStorage.setItem('vl-language', 'de'));
    await page.goto(`${base}/#abschluss`);
    assert.equal(await page.locator('.ihk-project').isVisible(), false);
    await openMenu(page, 'abschluss');
    await page.locator('.ihk-reader-toggle').click();
    await page.locator('.ihk-project:not([hidden])').waitFor();
    await page.waitForFunction(() => document.querySelector('#boot').classList.contains('is-done'));
    assert.equal(await page.locator('.ihk-project video').getAttribute('preload'), 'none');
    assert.equal(await page.locator('.ihk-project video').getAttribute('autoplay'), null);
    assert.equal(requests.length, 0, 'No PDF or film should preload');
    assert.equal(await page.locator('.ihk-body > :first-child > section:first-child').getAttribute('id'), 'ihk-film');
    assert.equal(await page.locator('.ihk-areas a svg').count(), 4);
    assert.equal(await page.locator('.ihk-metrics svg').count(), 4);

    for (const lang of ['de', 'en']) {
      if (lang === 'en') await page.locator('#language-switch').click();
      assert.equal(await page.locator('html').getAttribute('lang'), lang);
      assert.match(await page.locator('.ihk-project video').getAttribute('src'), lang === 'de' ? /Projektfilm_DE/ : /Project_Film_EN/);
      assert.equal(await page.locator('.ihk-project video').count(), 1);
      await page.locator('.ihk-body').evaluate((el) => { el.scrollTop = 0; });
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.ihk-panel')).opacity) > 0.99);
      const filmPosition = await page.locator('.ihk-project video').evaluate((video) => {
        const body = video.closest('.ihk-body').getBoundingClientRect();
        const film = video.getBoundingClientRect();
        const title = document.querySelector('#ihk-title').getBoundingClientRect();
        return film.top >= body.top && film.top < body.bottom && film.bottom < title.top;
      });
      assert(filmPosition, 'Film starts visibly at the top, before the project text');
      await page.screenshot({ path: `${output}/${width}-${lang}-overview.png` });
      const overflow = await page.evaluate(() => {
        const elements = [document.documentElement, document.querySelector('.ihk-body'), document.querySelector('.ihk-panel'), document.querySelector('.head__brand'), document.querySelector('.foot__crumb')];
        return elements.map((el) => ({ name: el.className || el.tagName, client: el.clientWidth, scroll: el.scrollWidth }));
      });
      assert(overflow.every((el) => el.scroll <= el.client + 1), JSON.stringify(overflow));
      await page.locator('.ihk-downloads').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${width}-${lang}-downloads-video.png` });
      for (const file of ['IHK_Projektarbeit_DE.pdf', 'IHK_Project_Report_EN.pdf']) {
        const downloadEvent = page.waitForEvent('download');
        await page.locator(`.ihk-downloads a[href="/ihk/${file}"]`).click();
        const download = await downloadEvent;
        assert.equal(download.suggestedFilename(), file);
        assert.equal(await download.failure(), null);
      }
      const video = page.locator('.ihk-project video');
      await video.scrollIntoViewIfNeeded();
      // Click the native browser play control, then verify actual decoded playback.
      const box = await video.boundingBox();
      await page.mouse.click(box.x + 24, box.y + box.height - 48);
      await page.waitForFunction(() => {
        const v = document.querySelector('.ihk-project video');
        return !v.paused && v.currentTime > 0.2 && v.videoWidth === 1280;
      }, null, { timeout: 20000 });
      await video.evaluate((el) => { el.pause(); el.currentTime = 12; });
      await page.waitForFunction(() => !document.querySelector('.ihk-project video').seeking);
      await page.screenshot({ path: `${output}/${width}-${lang}-playing.png` });
      results.push({ width, height, lang, overflow, playback: 'decoded H.264', downloads: 2 });
    }

    for (const section of ['server', 'uem', 'clients', 'migration']) {
      await page.locator(`.ihk-nav [data-ihk-route="abschluss/${section}"]`).click();
      assert.equal(new URL(page.url()).hash, `#abschluss/${section}`);
      assert.equal(await page.locator('.ihk-project video').count(), 0);
      assert.equal(await page.locator('.ihk-nav [aria-current="page"]').textContent(), section === 'uem' ? 'UEM' : section[0].toUpperCase() + section.slice(1));
      await page.screenshot({ path: `${output}/${width}-${section}.png` });
    }
    await page.goBack();
    await page.waitForURL('**/#abschluss/clients');
    assert.equal(await page.locator('.ihk-nav [aria-current="page"]').textContent(), 'Clients');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.ihk-project').isVisible(), false);
    // Verify route access using a real keyboard interaction from the existing navigation.
    await page.locator('.nav__link[data-target="abschluss"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('.ihk-reader-toggle').focus();
    await page.keyboard.press('Enter');
    await page.locator('#ihk-title').waitFor();
    assert.equal(await page.locator('#ihk-title').evaluate((el) => el === document.activeElement), true);
    await page.keyboard.press('Shift+Tab');
    const focus = await page.evaluate(() => ({ tag: document.activeElement.tagName, outline: getComputedStyle(document.activeElement).outlineStyle }));
    assert.notEqual(focus.outline, 'none');
    // Existing CV and its reader must still be reachable.
    await page.locator('.nav__link[data-target="lebenslauf"]').click();
    assert.equal(await page.locator('.ihk-project').isVisible(), false);
    await openMenu(page, 'lebenslauf');
    await page.locator('.cv-reader-toggle').click();
    await page.waitForFunction(() => document.querySelector('.cv-reader-toggle').getAttribute('aria-expanded') === 'true');
    await page.locator('.nav__link[data-target="abschluss"]').click();
    await openMenu(page, 'abschluss');
    await page.locator('.ihk-reader-toggle').click();
    await page.locator('.ihk-project:not([hidden])').waitFor();
    await page.locator('.cv-reader').waitFor({ state: 'hidden' });
    await context.close();
    console.log(`PASS: ${width} × ${height}, DE/EN, downloads, playback and navigation`);
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('vl-language', 'en'));
  await page.goto(`${base}/#abschluss/server`);
  await openMenu(page, 'abschluss');
  await page.locator('.ihk-reader-toggle').click();
  await page.locator('#ihk-title').waitFor();
  assert.match(await page.locator('#ihk-title').textContent(), /foundation/);
  for (const file of ['IHK_Projektarbeit_DE.pdf', 'IHK_Project_Report_EN.pdf', 'IHK_Projektfilm_DE.mp4', 'IHK_Project_Film_EN.mp4']) {
    const response = await page.request.get(`${base}/ihk/${file}`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], file.endsWith('.pdf') ? /application\/pdf/ : /video\/mp4/);
    assert((await response.body()).length > 1000);
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/results.json`, JSON.stringify({ results, errors, http: '4 × 200', deepLink: true, keyboard: true }, null, 2));
  console.log(`PASS: ${results.length} viewport/language combinations; downloads, playback, routes, keyboard and HTTP. Evidence: ${output}`);
} finally {
  await browser.close();
}
