import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.EXAMPLE_URL || 'http://127.0.0.1:5173';
const output = '/tmp/project-preview-match';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const [width, height] of (process.env.PREVIEW_MOBILE_ONLY ? [[390, 844]] : [[1440, 900], [390, 844]])) for (const language of (process.env.PREVIEW_LANGUAGE ? [process.env.PREVIEW_LANGUAGE] : ['de', 'en'])) {
    const mobile = width < 600;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: .5,
      isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce', locale: language });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', message => { if (message.type() === 'error' && /Shader Error|VALIDATE_STATUS/.test(message.text())) errors.push(message.text()); });
    await page.addInitScript(lang => { localStorage.setItem('vl-intro-seen', '1'); localStorage.setItem('vl-language', lang); }, language);
    await page.route('**/*Hintergrund_web*.glb*', route => route.abort());
    await page.goto(`${base}/#home`);
    await page.locator('#boot.is-done').waitFor();
    if (mobile) await page.locator('.mobile-pedestals [data-pedestal="1"]').click();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    const texture = () => page.evaluate(() => {
      const m = __stage.cards.group.getObjectByName('example-preview');
      return { mesh: m.uuid, texture: m.material.map.uuid, pixels: m.material.map.image.toDataURL(), visible: m.parent.visible, opacity: m.material.opacity };
    });
    const before = await texture();
    assert(before.visible && before.opacity > .99);
    // Activate the actual centre pedestal's hologram, not the already-open gallery.
    const point = await page.evaluate(() => {
      const mesh = __stage.cards.group.getObjectByName('example-preview');
      const p = mesh.getWorldPosition(__stage.camera.position.clone()).project(__stage.camera);
      const r = document.querySelector('#scene').getBoundingClientRect();
      return { x: r.left + (p.x + 1) * r.width / 2, y: r.top + (1 - p.y) * r.height / 2 };
    });
    await page.mouse.click(point.x, point.y);
    await page.locator('.projects-browser:not([hidden]) .projects-panel--spatial').waitFor();
    await page.waitForFunction(() => !__stage.isMoving);
    assert.deepEqual(await texture(), before, 'Activating the pedestal must retain the SAME visible mesh, texture and every content pixel');
    assert.equal(await page.locator('.project-preview iframe').count(), 0, 'No replacement document is loaded on activation');
    assert.match(await page.locator('#projects-title').textContent(), language === 'de' ? /Interaktive Beispielwebseite/ : /Interactive example website/);
    await page.evaluate(() => {
      const shader = { uniforms: {}, fragmentShader: '#include <map_fragment>' };
      __stage.cards.group.getObjectByName('example-preview').material.onBeforeCompile(shader);
      window.previewColor = shader.uniforms.uPreviewColor;
    });
    const link = page.locator('.project-choice');
    await page.mouse.move(0, 0); await page.evaluate(() => document.activeElement?.blur());
    await page.waitForFunction(() => previewColor.value < .01);
    if (mobile) { await page.keyboard.press('Tab'); await link.focus(); } else await link.hover();
    await page.waitForFunction(() => previewColor.value > .99);
    await page.screenshot({ path: `${output}/${width}-${language}-activated.png` });
    const originalZ = await page.evaluate(() => __stage.camera.position.z);
    if (mobile) await page.locator('[data-cv-zoom="in"]').click();
    else await page.keyboard.press('ArrowUp');
    await page.waitForFunction(z => __stage.camera.position.z < z - .3, originalZ);
    const zoomedZ = await page.evaluate(() => __stage.camera.position.z);
    await link.hover(); await page.mouse.wheel(0, 180);
    await page.waitForFunction(z => __stage.camera.position.z > z + .3, zoomedZ);
    if (mobile) {
      const box = await link.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
      const cdp = await page.context().newCDPSession(page);
      const z = await page.evaluate(() => __stage.camera.position.z);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{x:x-15,y,id:1}, {x:x+15,y,id:2}] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{x:x-30,y,id:1}, {x:x+30,y,id:2}] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForFunction(previous => __stage.camera.position.z < previous - .3, z);
      assert.equal(await page.locator('.example-projection').evaluate(el => el.open), false, 'Pinch must not open the website');
      await page.locator('[data-cv-zoom="out"]').click();
    }
    assert.deepEqual(await texture(), before, 'Zoom changes the camera, never the preview content');
    if (language === 'de') await link.click(); else { await link.focus(); await page.keyboard.press('Enter'); }
    await page.locator('.example-projection[data-state="open"] iframe[data-ready="true"]').waitFor();
    assert(await page.evaluate(() => __stage.isRenderingPaused));
    assert.equal(await page.evaluate(() => __stage.cards.group.getObjectByName('example-preview').parent.visible), false, 'Hologram is hidden in the projected view');
    const frame = await page.evaluate(() => __stage.renderer.info.render.frame);
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => __stage.renderer.info.render.frame), frame);
    const opened = page.frameLocator('.example-projection iframe');
    assert.equal(await opened.locator('html').getAttribute('lang'), language);
    assert.match(await opened.locator('h1').textContent(), language === 'de' ? /Systeme/ : /Systems/);
    await opened.locator('h1').click(); await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.example-projection').open);
    await page.waitForFunction(() => __stage.cards.group.getObjectByName('example-preview').parent.visible);
    assert.deepEqual(await texture(), before, 'Return restores the same preview');
    assert.equal(await page.locator('.warp-tunnel').count(), 0);
    assert(await link.evaluate(element => document.activeElement === element));
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS ${width}px / ${language}: identical pedestal content, hover/focus, zoom, projection and return`);
  }
} finally { await browser.close(); }
