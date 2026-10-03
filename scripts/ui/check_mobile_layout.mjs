import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const base = process.env.SITE_URL || 'http://127.0.0.1:5173';
try {
  for (const fallback of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(fallback => {
      localStorage.setItem('vl-intro-seen', '1');
      localStorage.setItem('vl-language', 'de');
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
      if (fallback) {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
          return /webgl/.test(type) ? null : original.call(this, type, ...args);
        };
      }
    }, fallback);
    await page.route('**/*Hintergrund_web*.glb*', route => route.abort());
    await page.goto(`${base}/#projekte/webseiten`);
    await page.locator('.project-book-ui:not([hidden])').waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const language of ['de', 'en']) {
      if (language === 'en') await page.locator('#language-switch').tap();
      for (const width of [320, 360, 390, 412, 600, 650]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.evaluate(() => window.__stage?.setProjectionIdle(true));
        for (const zoom of [.7, 1, 1.7]) {
          const issues = await page.evaluate(zoom => {
            const panel = document.querySelector('.project-book-ui');
            panel.style.setProperty('--sheet-zoom', zoom);
            const selectors = '.project-book-sheets,.project-wing,.gallery-card,.gallery-copy,.wing-heading,.foot,.head';
            return [...document.querySelectorAll(selectors)].flatMap(el => {
              const rect = el.getBoundingClientRect();
              const issues = [];
              if (el.scrollWidth > el.clientWidth + 1) issues.push(`${el.className}: horizontal overflow ${el.scrollWidth}/${el.clientWidth}`);
              if (rect.left < -1 || rect.right > innerWidth + 1) issues.push(`${el.className}: outside viewport`);
              return issues;
            });
          }, zoom);
          assert.deepEqual(issues, [], JSON.stringify({ fallback, language, width, zoom, issues }));
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(() => { document.querySelector('.project-book-ui').style.setProperty('--sheet-zoom', 1); window.__stage?.setProjectionIdle(false); });
    for (const id of ['systems', 'passung', 'resonanz', 'recovery']) {
      const link = page.locator(`.project-book-ui .wing-preview[data-project-id="${id}"]`);
      const target = new URL(await link.getAttribute('href'), base);
      await link.scrollIntoViewIfNeeded();
      await link.tap();
      if (fallback) {
        await page.waitForURL(url => url.pathname === target.pathname);
        await page.goBack();
      } else {
        await page.locator('.example-projection[data-state="open"]').waitFor();
        await page.locator('[data-example-back]').tap();
      }
      await page.locator('.project-book-ui:not([hidden])').waitFor();
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert(await page.locator('.foot').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight + 1), 'Landscape footer stays on screen');
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS: mobile layout, DE/EN, six widths, three zoom levels, project links, landscape; WebGL fallback=${fallback}`);
  }
} finally { await browser.close(); }
