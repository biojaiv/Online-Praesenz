import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.EXAMPLE_URL || 'http://127.0.0.1:5173';
const output = '/tmp/project-preview-match';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const describePage = () => {
  const rect = selector => {
    const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
    return { x, y, width, height };
  };
  return { url: location.pathname + location.search, language: document.documentElement.lang,
    viewport: [innerWidth, innerHeight], scroll: [scrollX, scrollY], headline: document.querySelector('h1').innerHTML,
    headlineBox: rect('h1'), hardwareBox: rect('.hardware'), hardware: document.querySelector('.hardware').currentSrc,
    textColor: getComputedStyle(document.querySelector('h1')).color, background: getComputedStyle(document.body).backgroundColor };
};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: .5, reducedMotion: 'reduce', locale: 'de-DE' });
  page.setDefaultTimeout(60000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('vl-intro-seen', '1'));
  // This test measures DOM projection parity; avoid spending software GPU time
  // on the independent background model.
  await page.route('**/*Hintergrund_web*.glb*', route => route.abort());
  await page.goto(`${base}/#projekte`);
  await page.locator('#boot.is-done').waitFor();
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const language of ['de', 'en']) {
      if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#language-switch').click();
      await page.locator('.projects-browser:not([hidden]) .project-preview iframe.is-ready').waitFor();
      const miniature = page.frameLocator('.project-preview iframe');
      await miniature.locator('.hardware').evaluate(image => image.decode());
      const before = await miniature.locator('html').evaluate(describePage);
      assert.equal(before.language, language);
      const chrome = await page.locator('.project-preview').evaluate(element => {
        const iframe = element.querySelector('iframe');
        return { filter: getComputedStyle(element.querySelector('img')).filter, frameOpacity: getComputedStyle(iframe).opacity,
          inert: iframe.inert, pointerEvents: getComputedStyle(iframe).pointerEvents,
          panelBackground: getComputedStyle(element.closest('.projects-panel')).backgroundColor };
      });
      assert.deepEqual(chrome, { filter: 'none', frameOpacity: '1', inert: true, pointerEvents: 'none', panelBackground: 'rgba(0, 0, 0, 0)' });
      await page.screenshot({ path: `${output}/${width}-${language}-preview.png` });
      if (language === 'de') await page.locator('.project-preview').click();
      else { await page.locator('.project-choice').focus(); await page.keyboard.press('Enter'); }
      await page.locator('.example-projection[data-state="open"] iframe[data-ready="true"]').waitFor();
      const opened = page.frameLocator('.example-projection iframe');
      await opened.locator('.hardware').evaluate(image => image.decode());
      const after = await opened.locator('html').evaluate(describePage);
      assert.deepEqual(after, before, 'Preview and opened page must share URL, language, viewport, crop, text, images and colours');
      await page.screenshot({ path: `${output}/${width}-${language}-opened.png` });
      await opened.locator('h1').click(); await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.example-projection').open);
      assert(await page.locator('.project-choice').evaluate(element => document.activeElement === element));
      console.log(`PASS ${width}px / ${language}: preview matches opened page, pointer/keyboard activation, ESC and focus`);
    }
  }
  assert.deepEqual(errors, []);
  await page.close();
} finally { await browser.close(); }
