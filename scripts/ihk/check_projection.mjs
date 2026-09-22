import { openMenu } from '../ui/menu.mjs';
/** Exercise actual 3D controls against the Vite development server's existing stage inspector. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.IHK_DEV_URL || 'http://127.0.0.1:5173';
const output = process.env.IHK_TEST_OUTPUT || '/tmp/ihk-projection-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, reducedMotion: mobile ? 'reduce' : 'no-preference', hasTouch: mobile, isMobile: mobile });
    const page = await context.newPage();
    const waitForProjectFocus = () => page.waitForFunction(() => {
      const { cards, camera } = window.__stage;
      const mesh = cards.documentPickables.find((item) => item.userData.key === 'abschluss');
      return mesh?.visible && Math.abs(mesh.getWorldPosition(camera.position.clone()).project(camera).x) < 0.08;
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('vl-language', 'de'));
    await page.goto(`${base}/#home`);
    await page.waitForFunction(() => window.__stage?.cards.documentPickables.length === 2 && window.__stage.cards.documentPickables.every((mesh) => mesh.visible && mesh.material.uniforms.uMap.value));
    await page.waitForFunction(() => document.querySelector('#boot').classList.contains('is-done') && !document.querySelector('.frame.is-intro'));
    await page.waitForTimeout(1200);
    const effects = await page.evaluate(() => {
      let jets = 0, tallVolumes = 0;
      window.__stage.cards.group.traverse((node) => {
        if (node.userData.kind === 'ring-jet') jets += 1;
        if (node.name === 'pedestal-hologram-volume' || node.name === 'pedestal-hologram-particles') tallVolumes += 1;
      });
      return { jets, tallVolumes };
    });
    assert.deepEqual(effects, { jets: 6, tallVolumes: 0 });
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-home.png` });
    // Click the real world-space document above the left pedestal.
    const centre = await page.evaluate(() => {
      const { cards, camera } = window.__stage;
      const mesh = cards.documentPickables.find((item) => item.userData.key === 'abschluss');
      const point = mesh.getWorldPosition(camera.position.clone()).project(camera);
      const rect = document.querySelector('#scene').getBoundingClientRect();
      return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 };
    });
    const homeCamera = await page.evaluate(() => window.__stage.camera.position.toArray());
    await page.mouse.click(centre.x, centre.y);
    await page.waitForURL('**/#abschluss');
    assert.equal(await page.locator('.ihk-project').isVisible(), false);
    await page.waitForTimeout(2100);
    await waitForProjectFocus();
    assert.notDeepEqual(await page.evaluate(() => window.__stage.camera.position.toArray()), homeCamera, 'Click zooms into the document');
    const canvas = await page.locator('#scene').boundingBox();
    const x = canvas.x + canvas.width / 2, y = canvas.y + canvas.height * .72;
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, 650);
    await page.waitForFunction(() => window.__stage.cards.documentScroll > 0.01);
    const scroll = await page.evaluate(() => window.__stage.cards.documentScroll);
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => window.__stage.cards.documentScroll), 1);
    await page.keyboard.press('Home');
    assert.equal(await page.evaluate(() => window.__stage.cards.documentScroll), 0);
    const cameraBefore = await page.evaluate(() => window.__stage.camera.position.toArray());
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction((before) => Math.abs(window.__stage.camera.position.z - before[2]) > 0.01, cameraBefore);
    const cameraAfter = await page.evaluate(() => window.__stage.camera.position.toArray());
    assert.notDeepEqual(cameraAfter, cameraBefore);
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 65, y, { steps: 8 }); await page.mouse.up();
    assert(Math.abs(await page.evaluate(() => window.__stage.cards.documentRotation)) > 0.05);
    if (mobile) {
      const session = await context.newCDPSession(page);
      const z = await page.evaluate(() => window.__stage.camera.position.z);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 35, y, id: 1 }, { x: x + 35, y, id: 2 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 70, y, id: 1 }, { x: x + 70, y, id: 2 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(550);
      assert.notEqual(await page.evaluate(() => window.__stage.camera.position.z), z);
    }
    await page.locator('.nav__link[data-target="lebenslauf"]').click();
    assert.equal(await page.evaluate(() => window.__stage.cards.documentScroll), 0);
    await openMenu(page, 'lebenslauf');
    await page.locator('.cv-reader-toggle').click();
    await page.locator('.cv-reader:not([hidden])').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.cv-reader').waitFor({ state: 'hidden' });
    await page.locator('.nav__link[data-target="abschluss"]').click();
    for (const language of ['de', 'en']) {
      if (language === 'en') await page.locator('#language-switch').click();
      await page.waitForFunction(() => window.__stage.cards.documentPickables.every((mesh) => mesh.visible && mesh.material.uniforms.uMap.value));
      await waitForProjectFocus();
      await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-${language}-projection.png` });
      await openMenu(page, 'abschluss');
      await page.locator('.ihk-reader-toggle').click();
      await page.locator('.ihk-project:not([hidden])').waitFor();
      await page.waitForFunction(() => !window.__stage.cards.documentPickables.find((mesh) => mesh.userData.key === 'abschluss').visible).catch(async error => {
        console.error(await page.evaluate(() => ({ route: location.hash, panels: [...document.querySelectorAll('.cv-reader, .ihk-project')].map(el => ({ class: el.className, hidden: el.hidden })), projections: window.__stage.cards.documentPickables.map(mesh => ({ key: mesh.userData.key, visible: mesh.visible, opacity: mesh.material.uniforms.uOpacity.value })) })));
        throw error;
      });
      await page.keyboard.press('Escape');
      await page.locator('.ihk-project').waitFor({ state: 'hidden' });
      assert(page.url().endsWith('#abschluss'));
      await page.waitForFunction(() => window.__stage.cards.documentPickables.find((mesh) => mesh.userData.key === 'abschluss').visible);
    }
    // A fresh deep link must survive asynchronous image loading.
    await page.goto(`${base}/#abschluss/clients`);
    await page.reload();
    await page.waitForFunction(() => {
      const mesh = window.__stage?.cards.documentPickables.find((item) => item.userData.key === 'abschluss');
      return mesh?.visible && Math.abs(mesh.material.uniforms.uOffset.value - 4 / 6) < 0.001;
    });
    await page.keyboard.press('Escape');
    await page.waitForURL('**/#');
    await page.locator('.nav__link[data-target="abschluss"]').click();
    assert.equal(await page.locator('.ihk-film-toggle').count(), 0);
    await openMenu(page, 'abschluss');
    await page.locator('.ihk-reader-toggle').click();
    await page.locator('.ihk-project:not([hidden])').waitFor();
    assert.equal(await page.locator('.ihk-body > :first-child > section:first-child').getAttribute('id'), 'ihk-film');
    assert.equal(await page.locator('.ihk-downloads a[download]').count(), 2);
    assert.deepEqual(errors, []);
    results.push({ mobile, scroll, projectionClick: true, zoom: true, rotation: true, pinch: mobile, readerToggle: true, cvRegression: true, deepLink: true, errors });
    console.log(`PASS: ${mobile ? 'mobile + pinch' : 'desktop'} projection controls, DE/EN and CV regression`);
    await context.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
