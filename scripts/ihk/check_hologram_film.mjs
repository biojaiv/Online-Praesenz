import { openMenu } from '../ui/menu.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const output = process.env.IHK_TEST_OUTPUT || '/tmp/ihk-hologram-film';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ deviceScaleFactor: Number(process.env.TEST_DPR || 1), viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (/\.(mp4|pdf)(\?|$)/.test(r.url())) requests.push(r.url()); });
    await page.goto(`${process.env.IHK_DEV_URL || 'http://127.0.0.1:5173'}/#abschluss`);
    const film = page.locator('.ihk-hologram-film video');
    await page.locator('.ihk-hologram-film:not([hidden])').waitFor();
    await page.waitForFunction(() => document.querySelector('#boot').classList.contains('is-done'));
    assert.equal(requests.length, 0, 'No film or PDF preloaded');
    assert.equal(await page.locator('.ihk-film-toggle').count(), 0, 'No separate film action on the right');
    for (const language of ['de', 'en']) {
      if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#language-switch').click();
      await page.waitForFunction(() => {
        const mesh = window.__stage.cards.documentPickables.find(m => m.userData.key === 'abschluss');
        return mesh.visible && mesh.material.uniforms.uMap.value && !document.querySelector('.ihk-hologram-film').hidden;
      });
      assert.match(await film.getAttribute('src'), language === 'de' ? /Projektfilm_DE/ : /Project_Film_EN/);
      assert.equal(await film.getAttribute('preload'), 'none');
      assert.equal(await film.getAttribute('autoplay'), null);
      const bounds = await film.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize().width + 1);
      // Verify alignment against the actual world-space hologram, not a fixed screen rectangle.
      // A language switch can resize the header before ResizeObserver and
      // the next stage frame have updated the projected HTML matrix.
      // Wait for that frame; keep the same strict three-pixel tolerance.
      const alignedFrame = await page.waitForFunction(() => {
        const { camera, cards } = window.__stage;
        const mesh = cards.documentPickables.find(m => m.userData.key === 'abschluss');
        const u = mesh.material.uniforms, H = u.uWindow.value * 1920 * 6;
        const top = 210 - u.uOffset.value * 1920 * 6;
        const screen = document.querySelector('#scene').getBoundingClientRect();
        const corners = [[94, top], [1164, top], [94, top + 1070 * 9 / 16], [1164, top + 1070 * 9 / 16]].map(([x, y]) => {
          const p = camera.position.clone().set(x / 1258 - .5, .5 - y / H, 0).applyMatrix4(mesh.matrixWorld).project(camera);
          return [screen.left + (p.x + 1) * screen.width / 2, screen.top + (1 - p.y) * screen.height / 2];
        });
        const actual = document.querySelector('.ihk-hologram-film video').getBoundingClientRect();
        const error = Math.max(Math.abs(actual.left - Math.min(...corners.map(p => p[0]))), Math.abs(actual.top - Math.min(...corners.map(p => p[1]))), Math.abs(actual.right - Math.max(...corners.map(p => p[0]))), Math.abs(actual.bottom - Math.max(...corners.map(p => p[1]))));
        return error < 3 ? { error } : false;
      }, null, { timeout: 5000 });
      const { error: alignment } = await alignedFrame.jsonValue();
      await alignedFrame.dispose();
      assert(alignment < 3, `Native video alignment error: ${alignment}px`);
      // Native controls use actual screen dimensions, including on a phone.
      await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-${language}-before.png` });
      const playBox = await page.locator('.ihk-hologram-film__play').boundingBox();
      await page.mouse.click(playBox.x + playBox.width / 2, playBox.y + playBox.height / 2);
      await page.waitForFunction(() => {
        const v = document.querySelector('.ihk-hologram-film video');
        return !v.paused && v.currentTime > .2 && v.videoWidth === 1280;
      }, null, { timeout: 20000 }).catch(async error => {
        console.error(await film.evaluate(v => ({ paused: v.paused, time: v.currentTime, source: v.currentSrc, ready: v.readyState, error: v.error?.message, rect: v.getBoundingClientRect().toJSON(), opacity: getComputedStyle(v).opacity })));
        await page.screenshot({ path: `${output}/playback-failure.png` });
        throw error;
      });
      assert.equal(await film.evaluate(v => v.duration), 52.5);
      assert.equal(await film.evaluate(v => v.playbackRate), 1, 'Encoded normal speed is already 20% slower');
      assert.equal(await film.evaluate(v => getComputedStyle(v).opacity), '1');
      assert.equal(await page.locator('.ihk-project').isVisible(), false, 'Playback stays in the hologram');
      await film.evaluate(v => { v.pause(); v.currentTime = 30; });
      await page.waitForFunction(() => !document.querySelector('.ihk-hologram-film video').seeking);
      await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-${language}-playing.png` });
      const before = await page.evaluate(() => window.__stage.cards.documentScroll);
      await film.focus();
      await page.keyboard.press('Space');
      assert.equal(await page.evaluate(() => window.__stage.cards.documentScroll), before, 'Space controls the video, not document scrolling');
      await film.evaluate(v => v.pause());
      await openMenu(page, 'abschluss');
      await page.locator('.ihk-reader-toggle').click();
      await page.locator('.ihk-project:not([hidden])').waitFor();
      assert.equal(await film.getAttribute('src'), null, 'Release hologram source before reader playback');
      assert.match(await page.locator('.ihk-summary').textContent(), language === 'de' ? /wartungsintensiv/ : /substantial maintenance/);
      assert.equal(await page.locator('video[src]').count(), 1);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => {
        const mesh = window.__stage.cards.documentPickables.find(m => m.userData.key === 'abschluss');
        return mesh.visible && mesh.material.uniforms.uMap.value && !document.querySelector('.ihk-hologram-film').hidden;
      });
      results.push({ mobile, language, alignment, opaque: true, duration: 52.5 });
    }
    await page.locator('.nav__link[data-target="abschluss"]').click();
    await page.locator('#nav-sub-abschluss [data-target="abschluss/clients"]').click();
    await page.waitForFunction(() => document.querySelector('.ihk-hologram-film').hidden);
    assert.equal(await film.getAttribute('src'), null, 'No hidden video playback on detail pages');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS: ${mobile ? 'mobile' : 'desktop'} native hologram video, DE/EN, opacity, alignment, keyboard, source lifecycle`);
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
