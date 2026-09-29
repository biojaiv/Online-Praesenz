import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: .7, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.addInitScript(() => {
    localStorage.setItem('vl-intro-seen', '1');
    localStorage.setItem('vl-language', 'de');
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
  });
  await page.route('**/*Hintergrund_web*.glb*', route => route.abort());
  await page.goto(`${process.env.SITE_URL || 'http://127.0.0.1:5173'}/#projekte/webseiten`);
  await page.waitForFunction(() => window.__stage && document.querySelector('#boot.is-done'));
  await page.waitForTimeout(1200);
  const panel = page.locator('.project-book-ui');
  const wing = section => page.locator(`[data-wing="${section}"]`);
  const settled = async () => {
    await page.waitForFunction(() => !__stage.isMoving);
    // Reduced motion updates the camera synchronously, but projected HTML corners
    // arrive on the next rendered frame (which can be slow with SwiftShader).
    await page.evaluate(() => new Promise(resolve => {
      let frames = 3;
      const tick = () => --frames ? requestAnimationFrame(tick) : resolve();
      requestAnimationFrame(tick);
    }));
  };
  await settled();
  for (const section of ['webseiten', 'systemintegration']) {
    const overview = await wing(section).boundingBox();
    // Click the sheet heading, outside any project link.
    await wing(section).locator('.wing-focus').click();
    await settled();
    await page.waitForFunction(({section,height}) => document.querySelector(`[data-wing="${section}"]`).getBoundingClientRect().height > height * 1.15, {section,height:overview.height});
    assert.equal(new URL(page.url()).hash, `#projekte/${section}/nahansicht`);
    const close = await wing(section).boundingBox();
    assert(close.height > overview.height * 1.15, `Selected wing must visibly enlarge: ${JSON.stringify({section,overview,close})}`);
    assert(Math.abs(close.x + close.width / 2 - 720) < 20, 'Selected wing must be centred');
    assert.equal(await page.locator('.example-projection[data-state="open"]').count(), 0);
    await page.keyboard.press('Escape');
    await settled();
    assert.equal(new URL(page.url()).hash, `#projekte/${section}`);
    await page.waitForFunction(({section,height}) => Math.abs(document.querySelector(`[data-wing="${section}"]`).getBoundingClientRect().height - height) < 2, {section,height:overview.height});
  }
  await wing('webseiten').locator('.wing-focus').focus();
  await page.keyboard.press('Enter');
  await settled();
  assert.equal(new URL(page.url()).hash, '#projekte/webseiten/nahansicht');
  await wing('webseiten').locator('[data-project-id="systems"]').click();
  await page.locator('.example-projection[data-state="open"]').waitFor();
  assert.match(await page.locator('.example-projection iframe').getAttribute('src'), /beispiel/);
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'visible' });
  await settled();
  assert.equal(new URL(page.url()).hash, '#projekte/webseiten/nahansicht', 'Project closes back to selected wing');
  await page.keyboard.press('Escape');
  await settled();
  await wing('systemintegration').locator('.wing-focus').click();
  await settled();
  await wing('systemintegration').locator('.wing-preview').click();
  await page.locator('.example-projection[data-state="open"]').waitFor();
  assert.match(await page.locator('.example-projection iframe').getAttribute('src'), /systemintegration/);
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'visible' });
  await page.locator('#language-switch').click();
  assert.match(await page.locator('#crumb').textContent(), /Close-up/);
  await page.setViewportSize({ width: 390, height: 844 });
  await settled();
  assert(await wing('systemintegration').locator('.wing-focus').isDisabled());
  assert(await wing('webseiten').isVisible());
  assert(await wing('systemintegration').isVisible());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await settled();
  assert(await wing('systemintegration').locator('.wing-focus').isEnabled());
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await settled();
  // A click on either actual 3D wing in the home view selects that wing directly.
  for (const section of ['webseiten', 'systemintegration']) {
    const point = await page.evaluate(section => {
      const s = __stage, mesh = s.cards.group.getObjectByName(section === 'webseiten' ? 'example-preview' : 'example-preview-systemintegration');
      mesh.updateWorldMatrix(true, false);
      const p = mesh.getWorldPosition(s.camera.position.clone()).project(s.camera);
      const rect = document.querySelector('#scene').getBoundingClientRect();
      return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 };
    }, section);
    await page.mouse.click(point.x, point.y);
    await settled();
    assert.equal(new URL(page.url()).hash, `#projekte/${section}/nahansicht`);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await settled();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: both wing close-ups, camera framing, Escape, keyboard, project links, DE/EN, resize and direct home clicks.');
} finally { await browser.close(); }
