import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.SITE_URL || 'http://127.0.0.1:5173';
const output = '/tmp/portfolio-sockel-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const keys = ['abschluss', 'projekte', 'lebenslauf'];
async function waitLanguage(page, language) {
  await page.waitForFunction(language => window.__stage?.cards.group.children.every(card =>
    card.userData.pedestalLanguage === language && card.getObjectByName(`pedestal-upper-${card.name.slice(5)}`)), language);
}
async function state(page) {
  return page.evaluate(() => {
    const { cards } = window.__stage;
    return cards.group.children.map(holder => {
      const key = holder.name.slice(5);
      const lower = holder.getObjectByName(`pedestal-base-${key}`);
      const ceiling = holder.getObjectByName('pedestal-ceiling');
      const upper = ceiling.children[0];
      const meshes = []; lower?.traverse(node => { if (node.isMesh) meshes.push(node); });
      const bounds = cards.worldBounds(key);
      return {
        key, lower: lower?.userData, upper: upper.userData,
        lowerSource: lower?.children[0].userData.source,
        upperSource: upper.children[0]?.userData.source,
        inscription: lower?.children[0].userData.inscription,
        upperInscription: upper.children[0]?.userData.inscription,
        ceilingScale: ceiling.scale.y,
        bounds: [...bounds.min.toArray(), ...bounds.max.toArray()],
        documentHeight: cards.documentPickables.find(mesh => mesh.userData.key === key)?.scale.y,
        materialNames: meshes.flatMap(mesh => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(m => m.name)),
      };
    });
  });
}
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: .5, locale: 'de-DE', reducedMotion: 'reduce',
      ...(mobile ? { isMobile: true, hasTouch: true } : {}),
    });
    await context.addInitScript(() => localStorage.setItem('vl-intro-seen', '1'));
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/Sockel.*\.glb/.test(request.url())) requests.push(request.url()); });
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector('#boot.is-done'));
    await waitLanguage(page, 'de');
    assert.equal(await page.evaluate(() => window.__stage.cards.ready), 'loaded');
    const german = await state(page);
    assert.deepEqual(german.map(card => card.inscription), ['ABSCHLUSS', 'PROJEKTE', 'CURRICULUM VITAE']);
    for (const card of german) {
      assert.equal(card.lowerSource, 'Sockel_de.blend');
      assert.equal(card.upperSource, 'Sockel_oben.blend');
      assert.equal(card.upperInscription, '');
      assert.equal(card.ceilingScale, -1);
      assert(card.materialNames.includes('VL / Titan'));
      assert(card.bounds.every(Number.isFinite));
      assert.equal(card.upper.section, card.key);
    }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-de.png` });
    await page.locator('#language-switch').click();
    await waitLanguage(page, 'en');
    const english = await state(page);
    assert.deepEqual(english.map(card => card.inscription), ['QUALIFICATIONS', 'PROJECTS', 'CURRICULUM VITAE']);
    for (let i = 0; i < english.length; i++) {
      assert.equal(english[i].lowerSource, 'Sockel_eng.blend');
      assert.equal(english[i].upperSource, 'Sockel_oben.blend');
      if (german[i].documentHeight) assert(Math.abs(english[i].documentHeight - german[i].documentHeight) < .02, 'Projection size remains stable across localized page aspect ratios');
    }
    await page.locator('.site-method button').click();
    assert.match(await page.locator('#site-inspection-camera').textContent(), /Blender.*GLB.*GSAP/s);
    assert.match(await page.locator('#site-inspection-language').textContent(), /inscriptions/);
    await page.keyboard.press('Escape');
    await page.locator('#language-switch').click();
    await waitLanguage(page, 'de');
    assert.equal(requests.filter(url => /Sockel_de_web/.test(url)).length, 1, 'German variant is reused from cache');
    assert(!requests.some(url => /Sockel_V2/.test(url)), 'Legacy model is never requested');
    for (const key of keys) {
      await page.waitForFunction(() => !window.__stage.isMoving);
      // Camera completion and the rendered picking matrices settle on separate frames.
      await page.waitForTimeout(600);
      if (mobile) {
        await page.locator(`[data-target="${key}"]`).first().click();
        await page.keyboard.press('Escape'); // Close the navigation disclosure.
      } else {
        const point = await page.evaluate(key => {
          const { cards, camera } = window.__stage;
          const p = cards.worldBounds(key).getCenter(camera.position.clone()).project(camera);
          const rect = document.querySelector('#scene').getBoundingClientRect();
          return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 };
        }, key);
        console.log('PICK', key, point, await page.evaluate(({ x, y }) => ({ element: document.elementFromPoint(x, y)?.tagName, camera: window.__stage.camera.position.toArray(), route: location.hash }), point));
        await page.mouse.click(point.x, point.y);
        console.log('CLICKED', key, page.url());
      }
      await page.waitForURL(`**/#${key}`).catch(async error => {
        await page.screenshot({ path: `${output}/failed-${key}.png` });
        throw error;
      });
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(key => window.__stage.cards.group.getObjectByName(`card-${key}`).userData.active, key), true);
      await page.keyboard.press('Escape');
      await page.waitForURL(url => !url.hash || url.hash === '#home');
    }
    assert.deepEqual(errors, []);
    console.log(`PASS ${mobile ? 'mobile' : 'desktop'}: all six models, DE/EN/cache, materials, projections, navigation and descriptions`);
    await context.close();
  }
  // A slow English request must not overwrite a newer switch back to German.
  const context = await browser.newContext({ reducedMotion: 'reduce', locale: 'de-DE', deviceScaleFactor: .5 });
  await context.addInitScript(() => localStorage.setItem('vl-intro-seen', '1'));
  const page = await context.newPage();
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/*Sockel_eng_web*.glb*', async route => { await held; await route.continue(); });
  await page.goto(base);
  await page.waitForFunction(() => document.querySelector('#boot.is-done'));
  await waitLanguage(page, 'de');
  await page.locator('#language-switch').click();
  await page.locator('#language-switch').click();
  await waitLanguage(page, 'de');
  const response = page.waitForResponse(response => /Sockel_eng_web/.test(response.url()));
  release(); await response; await page.waitForTimeout(1000);
  assert((await state(page)).every(card => card.lower.variant === 'de'));
  console.log('PASS delayed language request: latest selection wins');
  await context.close();
  const fallback = await browser.newContext({ reducedMotion: 'reduce', deviceScaleFactor: .5 });
  await fallback.addInitScript(() => localStorage.setItem('vl-intro-seen', '1'));
  const failed = await fallback.newPage();
  await failed.route('**/*Sockel_*web*.glb*', route => route.abort());
  await failed.goto(base);
  await failed.waitForFunction(() => document.querySelector('#boot.is-done'));
  assert.equal(await failed.evaluate(() => window.__stage.cards.ready), 'fallback');
  await failed.locator('[data-target="lebenslauf"]').first().click();
  await failed.waitForURL('**/#lebenslauf');
  console.log('PASS unavailable assets: fallback navigation remains usable');
  await fallback.close();
} finally { await browser.close(); }
