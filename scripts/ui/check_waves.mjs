import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.HARMONY_URL || 'http://127.0.0.1:5173';
const output = '/tmp/portfolio-waves-check'; await mkdir(output, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const reduced of [false, true]) {
    const context = await browser.newContext({ deviceScaleFactor: Number(process.env.TEST_DPR || 1), viewport: reduced ? { width: 390, height: 844 } : { width: 1440, height: 900 }, locale: 'de-DE', reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await context.addInitScript(() => localStorage.setItem('vl-intro-seen', '1'));
    const page = await context.newPage(); const errors = [];
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /Shader Error|VALIDATE_STATUS|gl\.getProgramInfoLog/.test(message.text())) errors.push(message.text()); });
    await page.goto(base);
    await page.waitForFunction(() => window.__stage?.cards.group.getObjectByName('pedestal-base-projekte') && document.querySelector('#boot.is-done'));
    await page.waitForTimeout(1800);
    const state = () => page.evaluate(() => {
      const root = window.__stage.cards.group, nodes = [];
      root.traverse(n => { if (n.userData.kind === 'ring-jet') nodes.push(n); });
      const card = root.getObjectByName('card-projekte');
      return { jets: nodes.length, lower: card.getObjectByName('pedestal-base-projekte').rotation.y, upper: card.getObjectByName('pedestal-ceiling').children[0].rotation.y, motion: nodes[0].children[0].material.uniforms.uMotion.value };
    });
    const first = await state();
    if (reduced) await page.waitForTimeout(1500);
    else await page.waitForFunction(start => window.__stage.cards.group.getObjectByName('pedestal-base-projekte').rotation.y > start + .02, first.lower);
    const last = await state();
    assert.equal(last.jets, 6); assert(Math.abs(last.lower - last.upper) < .001);
    assert.equal(last.motion, reduced ? 0 : 1);
    assert(reduced ? first.lower === last.lower : last.lower > first.lower + .02, `Slow paired rotation respects reduced motion: ${JSON.stringify({reduced,first,last})}`);
    if (!reduced) {
      await page.locator('.head-calibration-marker').hover();
      assert.equal(await page.locator('.head-calibration-marker__point').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(232, 164, 90)');

    }
    await page.locator('[data-target="projekte"]').click();
    await page.locator('.projects-browser:not([hidden])').waitFor();
    assert.equal(await page.locator('#nav-sub-projekte [data-target]').count(), 2);
    await page.locator('[data-project-route="projekte/privat"]').click();
    await page.locator('.projects-soon').waitFor();
    assert.equal(await page.locator('.project-choice[data-project-id="systems"]').count(), 0, 'No invented private projects');
    await page.locator('[data-project-route="projekte/webseiten"]').click();
    const preview = await page.evaluate(() => {
      const panel = document.querySelector('.projects-panel'), choice = panel.querySelector('.project-choice');
      const texture = window.__stage.cards.group.getObjectByName('example-preview').material.map.image.getContext('2d');
      return {
        panel: getComputedStyle(panel).backgroundColor, choice: getComputedStyle(choice).backgroundColor,
        image: getComputedStyle(choice.querySelector('img')).opacity,
        outsideAlpha: texture.getImageData(20, 20, 1, 1).data[3], imageAlpha: texture.getImageData(100, 400, 1, 1).data[3],
      };
    });
    assert.deepEqual(preview, { panel: 'rgba(0, 0, 0, 0)', choice: 'rgba(0, 0, 0, 0)', image: '1', outsideAlpha: 0, imageAlpha: 255 }, 'Only preview images are opaque');
    await page.screenshot({ path: `${output}/${reduced ? 'mobile' : 'desktop'}-gallery.png` });
    await page.locator('.project-choice[data-project-id="systems"]').click();
    await page.locator('.example-projection[data-state="open"] iframe[data-ready="true"]').waitFor();
    const wave = () => page.locator('.warp-tunnel').evaluate(canvas => canvas.toDataURL());
    const field = await page.locator('.warp-tunnel').evaluate(canvas => {
      const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
      const ctx = copy.getContext('2d'); ctx.drawImage(canvas, 0, 0);
      return { marginAlpha: ctx.getImageData(1, Math.floor(copy.height / 2), 1, 1).data[3],
        centerAlpha: ctx.getImageData(Math.floor(copy.width / 2), Math.floor(copy.height / 2), 1, 1).data[3] };
    });
    assert(field.marginAlpha > 70, 'Waves cover the surrounding area as a filled surface');
    assert.equal(field.centerAlpha, 0, 'Waves leave the readable page clear');
    const a = await wave(); await page.waitForTimeout(1200); const b = await wave();
    assert(reduced ? a === b : a !== b, 'Tunnel waves animate only when motion is permitted');
    await page.screenshot({ path: `${output}/${reduced ? 'mobile' : 'desktop'}-tunnel.png` });
    const embedded = page.frameLocator('.example-projection iframe');
    await embedded.locator('a[href="#projekte"]').first().click();
    await embedded.locator('.reading-progress').evaluate(el => new Promise((resolve, reject) => {
      const started = performance.now();
      function check() {
        const expected = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
        const actual = Number(getComputedStyle(el).transform.split('(')[1].split(',')[0]);
        if (expected > .1 && Math.abs(actual - expected) < .01 && getComputedStyle(document.querySelector('#projekte')).opacity === '1') resolve();
        else if (performance.now() - started > 10000) reject(new Error(`Scroll/reveal not complete: ${JSON.stringify({scrollY, expected, actual})}`));
        else requestAnimationFrame(check);
      }
      check();
    }));
    if (reduced) assert.equal(await embedded.locator('.hardware').evaluate(el => getComputedStyle(el).transform), 'none');
    await page.locator('[data-example-back]').click();
    await page.waitForFunction(() => !document.querySelector('.example-projection').open);
    assert(await page.locator('.project-choice[data-project-id="systems"]').isVisible());
    assert.equal(await page.locator('.project-choice[data-project-id="systems"]').evaluate(el => document.activeElement === el), true);
    assert.deepEqual(errors, []);
    await context.close(); console.log(`PASS waves: ${reduced ? 'mobile/reduced' : 'desktop/animated'}, rotation, jets, categories, tunnel, page scrolling, focus`);
  }
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  await context.addInitScript(() => { localStorage.setItem('vl-intro-seen','1'); const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type,...args) { return /webgl/.test(type) ? null : get.call(this,type,...args); }; });
  const page = await context.newPage(); await page.goto(base); await page.locator('.stage.is-fallback').waitFor();
  await page.locator('#hint').evaluate(el => el.addEventListener('animationstart', event => { if(event.animationName === 'control-signal') el.dataset.rippleSeen = 'true'; }));
  await page.locator('#hint').hover();
  await page.waitForFunction(() => document.querySelector('#hint').dataset.rippleSeen === 'true');
  await context.close(); console.log('PASS footer CSS distortion with WebGL fallback');
} finally { await browser.close(); }
