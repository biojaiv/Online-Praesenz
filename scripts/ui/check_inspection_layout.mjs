import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Fast geometry regression independent of optional model rendering/freeze QA.
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: .4, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }));
  await page.route('**/*.glb*', request => request.abort());
  await page.goto(`${process.env.SITE_URL || 'http://127.0.0.1:5175'}/#home`);
  await page.waitForFunction(() => window.__stage && document.querySelector('#boot.is-done'));
  for (const language of ['de', 'en']) {
    if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#language-switch').click();
    for (const width of [1440, 1920, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('.site-method button').click();
      await page.locator('.site-inspection:not([hidden])').waitFor();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      for (const topic of ['access', 'delivery']) {
        if (await page.locator('.site-inspection').getAttribute('data-compact') === 'true') {
          await page.locator(`[aria-controls=site-inspection-${topic}]`).click();
        }
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        // ResizeObserver/font/model follow-ups can schedule another layout
        // after the first two frames. Wait for the functional anchor invariant,
        // not a guessed delay; a persistently wrong endpoint still fails.
        await page.waitForFunction(topic => {
          const visible = el => el?.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
          const target = topic === 'delivery' ? document.querySelector('.foot__contact a[download]')
            : [...document.querySelectorAll('.foot__tools .cv-keyboard-zoom-hint kbd, .foot__tools .cv-mobile-zoom__button, .site-inspection__zoom-cue kbd')].find(visible);
          const group = document.querySelector(`[data-topic=${topic}]`);
          if (!visible(group) || !target) return false;
          const dot = group.querySelector('circle:not(.site-inspection__orbit)');
          const rect = target.getBoundingClientRect();
          return Math.abs(Number(dot.getAttribute('cx')) - rect.left - rect.width / 2) <= 1
            && Math.abs(Number(dot.getAttribute('cy')) - rect.top - rect.height / 2) <= 1;
        }, topic, { timeout: 5000 });
        const failures = await page.evaluate(topic => {
          const failures = [];
          const panel = document.querySelector('.site-inspection');
          const card = document.querySelector(`#site-inspection-${topic}`);
          const rect = card.getBoundingClientRect();
          if (panel.dataset.compact !== 'true') {
            if (topic === 'access' && rect.left < innerWidth / 2) failures.push('Access must be on the right');
            if (topic === 'delivery' && rect.right > innerWidth / 2) failures.push('Delivery must be on the left');
            const above = document.querySelector(topic === 'access' ? '#site-inspection-html' : '#site-inspection-camera').getBoundingClientRect();
            if (rect.top <= above.top) failures.push('Moved notes belong in the bottom slots');
          }
          const visible = el => el?.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
          const target = topic === 'delivery' ? document.querySelector('.foot__contact a[download]')
            : [...document.querySelectorAll('.foot__tools .cv-keyboard-zoom-hint kbd, .foot__tools .cv-mobile-zoom__button, .site-inspection__zoom-cue kbd')].find(visible);
          const group = document.querySelector(`[data-topic=${topic}]`);
          if (getComputedStyle(group).display === 'none') return [`${topic} leader hidden; compact=${panel.dataset.compact}, cardHidden=${card.hidden}`];
          const path = group.querySelector('path');
          const dot = group.querySelector('circle:not(.site-inspection__orbit)');
          const end = target.getBoundingClientRect();
          if (Math.abs(Number(dot.getAttribute('cx')) - end.left - end.width / 2) > 1 || Math.abs(Number(dot.getAttribute('cy')) - end.top - end.height / 2) > 1) failures.push(`Leader must terminate at its actual control: ${dot.getAttribute('cx')},${dot.getAttribute('cy')} vs ${end.left + end.width / 2},${end.top + end.height / 2}; ${JSON.stringify({cue:document.querySelector('.site-inspection__zoom-cue').outerHTML,target:target.outerHTML,svg:group.parentElement.getAttribute('viewBox'),path:path.getAttribute('d'),card:[rect.left,rect.top]})}`);
          if (!path.getAttribute('d') || /NaN|Infinity/.test(path.getAttribute('d'))) failures.push('Invalid path');
          const obstacles = [...document.querySelectorAll('.site-inspection__note')].filter(el => el !== card && visible(el)).map(el => el.getBoundingClientRect());
          const footerText = [...document.querySelectorAll('.foot__contact a, .site-method button')].filter(el => el !== target && visible(el)).flatMap(el => {
            const range = document.createRange(); range.selectNodeContents(el); return [...range.getClientRects()];
          });
          const crumb = document.querySelector('.foot__crumb');
          if (crumb) {
            const walker = document.createTreeWalker(crumb, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              if (!walker.currentNode.textContent.trim()) continue;
              const range = document.createRange(); range.selectNodeContents(walker.currentNode);
              footerText.push(...range.getClientRects());
            }
          }
          const descent = rect.right + 16;
          const directDelivery = topic === 'delivery' && panel.dataset.compact !== 'true'
            && !footerText.some(r => descent >= r.left - 12 && descent <= r.right + 12 && r.bottom > rect.bottom && r.top < end.top);
          for (let distance = 2; distance <= path.getTotalLength(); distance += 2) {
            const p = path.getPointAtLength(distance);
            if (directDelivery && p.x > Math.max(rect.right + 32, end.right + 12)) { failures.push('Delivery takes an unnecessary right-edge detour despite a clear descent'); break; }
            if (p.x < 3 || p.x > innerWidth - 3 || p.y < 0 || p.y > innerHeight) { failures.push(`Leader escapes the viewport at ${p.x},${p.y}; viewport ${innerWidth}x${innerHeight}; path ${path.getAttribute('d')}; target ${end.left + end.width / 2},${end.top + end.height / 2}`); break; }
            if (obstacles.some(r => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom)) { failures.push('Leader crosses another note'); break; }
            if (footerText.some(r => p.x > r.left - 2 && p.x < r.right + 2 && p.y > r.top - 2 && p.y < r.bottom + 2)) { failures.push('Leader crosses unrelated footer text'); break; }
          }
          return failures;
        }, topic);
        assert.deepEqual(failures, [], `${language}, ${width}px, ${topic}; page errors: ${errors.join('; ')}`);
      }
      await page.keyboard.press('Escape');
      await page.locator('.site-inspection').waitFor({ state: 'hidden' });
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: swapped inspection slots, exact targets, no note/footer intersections; DE/EN at 1440, 1920 and 390px.');
} finally { await browser.close(); }
