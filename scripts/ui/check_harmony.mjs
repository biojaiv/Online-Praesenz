import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { openMenu } from './menu.mjs';
const base = process.env.HARMONY_URL || 'http://127.0.0.1:5173';
const output = process.env.HARMONY_OUTPUT || '/tmp/portfolio-harmony-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: mobile ? 'reduce' : 'no-preference' });
    await context.addInitScript(() => localStorage.setItem('vl-language', 'de'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/#home`);
    if (!mobile) {
      await page.locator('.frame.is-intro').waitFor();
      await page.waitForTimeout(500);
      assert.equal(await page.locator('.example-trigger').isVisible(), false, 'No button over intro name');
      assert.equal(await page.evaluate(() => window.__stage.cards.group.visible), false, 'Pedestals wait for warp');
      await page.screenshot({ path: `${output}/intro.png` });
    }
    await page.waitForFunction(() => document.querySelector('#boot.is-done') && !document.querySelector('.frame.is-intro') && window.__stage?.cards.documentPickables.every(m => m.visible && m.material.uniforms.uMap.value));
    await page.waitForTimeout(1800);
    const scene = await page.evaluate(async () => {
      const groups = [];
      window.__stage.cards.group.traverse(node => {
        if (['ring-jet', 'resume-frame'].includes(node.userData.kind)) groups.push({ kind: node.userData.kind, count: node.children[0].geometry.attributes.position.count, shader: node.children[0].material.fragmentShader });
      });
      const { SACRED_FIGURES } = await import('/src/scene/sacredGeometry.js');
      const { PRIMARY } = await import('/src/scene/runes.js');
      return { groups, motifs: SACRED_FIGURES.map(f => f.name), runes: PRIMARY };
    });
    assert(scene.groups.filter(g => g.kind === 'ring-jet').every(g => g.count === 1200));
    assert(scene.groups.filter(g => g.kind === 'resume-frame').every(g => g.count === 410));
    assert(scene.groups.every(g => !g.shader.includes('hue2rgb')));
    assert(!scene.motifs.some(name => /star tetrahedron/i.test(name)));
    assert(!scene.runes.includes('algiz'));
    if (mobile) {
      const selected = () => page.evaluate(() => window.__stage.cards.group.children.filter(n => n.name.startsWith('card-') && n.visible).map(n => n.name));
      assert.deepEqual(await selected(), ['card-abschluss']);
      assert.equal(await page.locator('.example-trigger').isVisible(), false);
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 320, y: 550 }] });
      for (let i = 1; i <= 8; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 320 - i * 30, y: 550 }] });
        await page.waitForTimeout(40);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(500);
      assert.deepEqual(await selected(), ['card-projekte'], 'Swipe selects exactly one pedestal');
      assert.equal(await page.locator('.example-trigger').count(), 0, 'The pedestal needs no floating open button');
      await page.locator('[data-pedestal="2"]').click();
      assert.deepEqual(await selected(), ['card-lebenslauf']);
      await page.locator('#scene').focus();
      await page.keyboard.press('ArrowLeft');
      assert.deepEqual(await selected(), ['card-projekte']);
      await page.locator('[data-pedestal="0"]').click();
      await cdp.detach();
    }
    await page.mouse.move(2, 2);
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-home.png` });
    for (const lang of ['de', 'en']) {
      if (lang === 'en') await page.locator('#language-switch').click();
      for (const key of ['lebenslauf', 'abschluss']) {
        await page.locator(`.nav__link[data-target="${key}"]`).click();
        await openMenu(page, key);
        await page.waitForTimeout(1200);
        const menu = page.locator(`#nav-sub-${key}`);
        assert.deepEqual(await menu.locator('[data-menu-action]').evaluateAll(nodes => nodes.map(n => n.dataset.menuAction)), ['reader', 'download']);
        const bounds = await menu.boundingBox();
        assert(bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize().width + 1);
        await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-${key}-${lang}.png` });
        const download = page.waitForEvent('download');
        await menu.locator('[data-menu-action="download"]').click();
        assert.equal(await (await download).failure(), null);
        await openMenu(page, key);
        await menu.locator('[data-menu-action="reader"]').click();
        const panel = page.locator(key === 'abschluss' ? '.ihk-project' : '.cv-reader');
        await panel.waitFor({ state: 'visible' });
        assert.equal(await page.locator('.nav__group.is-open').count(), 0);
        await page.waitForFunction(() => [...document.querySelectorAll('.cv-reader:not([hidden]) .cv-hologram, .ihk-project:not([hidden]) .cv-hologram')].every(el => Number(getComputedStyle(el).opacity) > .99 && el.getAnimations().every(a => a.playState !== 'running')) && !document.querySelector('.cv-action:disabled'));
        await page.waitForTimeout(800);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const tiny = await page.evaluate(() => [...document.querySelectorAll('.head *, .foot *, .cv-hologram *')].filter(el => el.getClientRects().length && el.textContent.trim() && getComputedStyle(el).visibility !== 'hidden' && parseFloat(getComputedStyle(el).fontSize) < 10).map(el => ({ tag: el.tagName, class: el.className, size: getComputedStyle(el).fontSize })));
        assert.deepEqual(tiny, [], 'Visible DOM typography has a 10px minimum');
        if (mobile) {
          assert(await panel.locator('.cv-nav button').evaluateAll(nodes => nodes.every(el => el.scrollWidth <= el.clientWidth + 1)), 'Reader tabs show complete labels');
          assert(await page.locator('.foot__hint').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Footer guidance is not clipped');
        }
        await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-${key}-${lang}-reader.png` });
        await page.keyboard.press('Escape');
        await panel.waitFor({ state: 'hidden' });
        assert.equal(await page.evaluate(() => document.activeElement.dataset.target), key);
        const hints = await page.locator('.foot__tools').boundingBox();
        const foot = await page.locator('.foot').boundingBox();
        assert(hints.y >= foot.y && hints.y + hints.height <= foot.y + foot.height + 1);
      }
    }
    if (!mobile) {
      await page.locator('.head__brand').click();
      await page.waitForTimeout(1800);
      const box = await page.locator('#scene').boundingBox();
      await page.mouse.move(box.x + box.width * .5, box.y + box.height * .85);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .65, box.y + box.height * .8, { steps: 10 });
      await page.mouse.up();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => {
        const stage = window.__stage;
        return Math.abs(stage.camera.getWorldDirection(stage.camera.position.clone()).x) < .02
          && stage.cards.group.children.filter(n => n.name.startsWith('card-') && n.visible).length === 1;
      });
    }
    assert.deepEqual(errors, []);
    results.push({ mobile, intro: !mobile, carousel: mobile, menus: true, downloads: true, languages: 2, palette: true, errors });
    await context.close();
    console.log(`PASS harmony: ${mobile ? 'mobile swipe + reduced motion' : 'desktop intro'}, menus, downloads, DE/EN, type and controls`);
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
