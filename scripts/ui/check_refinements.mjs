import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.HARMONY_URL || 'http://127.0.0.1:5173';
const output = process.env.REFINEMENTS_OUTPUT || '/tmp/portfolio-refinements-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  const context = await browser.newContext({ deviceScaleFactor: Number(process.env.TEST_DPR || 1), viewport: { width: 1440, height: 900 }, locale: 'de-DE' });
  await context.addInitScript(() => {
    localStorage.setItem('vl-intro-seen', '1');
    window.__playedSounds = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function(...args) {
      if (this.volume > 0) window.__playedSounds.push({ src: this.src, volume: this.volume });
      return play.apply(this, args);
    };
  });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.waitForFunction(() => window.__stage?.cards.group.getObjectByName('pedestal-base-projekte') && document.querySelector('#boot.is-done'));
  await page.waitForTimeout(1800);
  assert.equal(await page.locator('html').getAttribute('lang'), 'de', 'Browser language is respected');
  assert.equal(await page.locator('.frame.is-intro').count(), 0, 'Seen intro does not repeat');
  assert.equal(await page.locator('.example-trigger').count(), 0);
  assert.equal(await page.locator('.head-calibration-marker').isVisible(), true);
  assert.equal(await page.locator('.foot__contact a[href^="mailto:"]').getAttribute('href'), 'mailto:vleicht@keemail.me');
  const heights = await page.evaluate(() => {
    const { cards } = window.__stage;
    const example = cards.group.getObjectByName('example-preview');
    return { ceilings: cards.group.getObjectsByProperty('name', 'pedestal-ceiling').length,
      heights: [example.geometry.parameters.height, ...cards.documentPickables.map(mesh => mesh.scale.y)] };
  });
  assert.equal(heights.ceilings, 3);
  assert(Math.max(...heights.heights) - Math.min(...heights.heights) < .02, 'Three holograms share the page height');
  async function point(key) {
    return page.evaluate(key => {
      const { cards, camera } = window.__stage;
      const mesh = key === 'projekte' ? cards.group.getObjectByName('example-preview') : cards.documentPickables.find(mesh => mesh.userData.key === key);
      const p = mesh.getWorldPosition(camera.position.clone()).project(camera);
      const rect = document.querySelector('#scene').getBoundingClientRect();
      return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 };
    }, key);
  }
  for (const key of ['abschluss', 'lebenslauf', 'projekte']) {
    const p = await point(key); await page.mouse.move(p.x, p.y);
    await page.waitForFunction(key => window.__stage.cards.group.getObjectByName(`card-${key}`).userData.hover > .9, key);
    const samples = await page.evaluate(key => new Promise(resolve => {
      const samples = [], start = performance.now();
      const timer = setInterval(() => {
        samples.push(window.__stage.cards.group.getObjectByName(`card-${key}`).getObjectByName('card-label').userData.orange);
        if (performance.now() - start > 5400) { clearInterval(timer); resolve(samples); }
      }, 100);
    }), key);
    assert(Math.max(...samples) > .8 && Math.min(...samples) < .15, `${key}: slow blue/amber hover cycle (${Math.min(...samples)} … ${Math.max(...samples)})`);
    const centre = await point(key); await page.mouse.click(centre.x, centre.y);
    await page.waitForURL(`**/#${key}`);
    await page.waitForTimeout(1800);
    assert.equal(await page.evaluate(key => window.__stage.cards.group.getObjectByName(`card-${key}`).getObjectByName('card-label').userData.orange, key), 1, 'Selected label stays amber');
    if (key === 'projekte') await page.screenshot({ path: `${output}/tunnel-desktop.png` });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.example-projection').open && window.__stage.exampleFlight.state === 'idle');
    await page.waitForTimeout(1500);
    await page.mouse.move(5, 5);
    await page.waitForFunction(key => window.__stage.cards.group.getObjectByName(`card-${key}`).getObjectByName('card-label').userData.orange < .02, key);
    results.push({ key, hoverCycle: true, activeAmber: true });
  }
  const sounds = await page.evaluate(() => window.__playedSounds);
  assert(sounds.filter(s => /tdrtra00/.test(s.src)).length >= 3, 'All three pedestals play the focus sound');
  assert(sounds.filter(s => /tdrtra01/.test(s.src)).length >= 3, 'All three pedestals play the return sound');
  await page.screenshot({ path: `${output}/home-desktop.png` });
  const download = page.waitForEvent('download');
  await page.locator('.foot__contact a[download]').click();
  assert.equal(await (await download).failure(), null);
  await page.locator('.site-method summary').click();
  assert.match(await page.locator('.site-method p').innerText(), /Playwright/);
  await page.locator('.site-method summary').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1600);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${output}/home-mobile.png` });
  assert.deepEqual(errors, []);
  await context.close();
  for (const [locale, expected] of [['en-GB', 'en'], ['fr-FR', 'en']]) {
    const c = await browser.newContext({ locale, reducedMotion: 'reduce' });
    await c.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/.test(type) ? null : original.call(this, type, ...args); };
    });
    const p = await c.newPage(); await p.goto(base);
    await p.locator('.stage.is-fallback').waitFor();
    assert.equal(await p.locator('html').getAttribute('lang'), expected);
    assert(await p.locator('.foot__contact a[download]').isVisible(), 'CV remains accessible without WebGL');
    await p.locator('#language-switch').click();
    const chosen = await p.locator('html').getAttribute('lang'); await p.reload();
    assert.equal(await p.locator('html').getAttribute('lang'), chosen, 'Manual language choice persists');
    await c.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify({ results, sounds: sounds.map(s => new URL(s.src).pathname), errors }, null, 2));
  console.log('PASS: three hover/active states, three focus/return sounds, framed holograms, no repeated intro, browser language, permanent contact/download and fallback.');
} finally { await browser.close(); }
