import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { profileResources } from '../../src/data/profileResources.js';
const base = process.env.SITE_URL || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const route = async (page, value) => { await page.evaluate(value => { location.hash = value; }, value); await page.waitForFunction(value => (document.documentElement.dataset.infoView || '') === value, ['start','kurzprofil','projekt/abschluss','kontakt'].includes(value) ? value : ''); };
const focused = page => page.evaluate(() => document.activeElement.dataset.infoFocus);
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', deviceScaleFactor: .7 });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('vl-language', 'en'); Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }); });
  // Hold optional models so the first interaction really happens before readiness.
  let releaseModels;
  const models = new Promise(resolve => { releaseModels = resolve; });
  await page.route('**/*.glb*', async request => { await models; await request.abort(); });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  const start = page.locator('[data-info-page="start"]');
  await start.locator('[data-info-focus="start-profile"]').click();
  await page.waitForFunction(() => document.activeElement.id === 'info-profile-title');
  assert(await page.locator('[data-info-page="kurzprofil"]').isVisible());
  assert.equal(await page.locator('.info-profile__field').count(), 4);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await focused(page), 'profile-contact');
  await page.keyboard.press('Tab');
  assert.equal(await focused(page), 'profile-lang-de');
  await page.locator('[data-info-focus="profile-lang-de"]').click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'de');
  assert.equal(await page.locator('html').getAttribute('data-info-view'), 'kurzprofil');
  assert.equal(await page.locator('[data-info-focus="contact-cv"]').getAttribute('href'), profileResources('de').cvUrl);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.documentElement.dataset.infoView === 'start');
  await page.waitForFunction(() => document.activeElement.dataset.infoFocus === 'start-profile');
  releaseModels();
  await page.waitForFunction(() => window.__stage && document.querySelector('#boot.is-done'));
  assert(await page.evaluate(() => __stage.isRenderingPaused), 'Reduced motion freezes entry scene');
  assert.equal(await page.evaluate(() => __stage.cards.group.children.filter(node => /^card-(abschluss|projekte|lebenslauf)$/.test(node.name)).length), 3);
  // A modal must neither reset the document camera nor release another pause reason.
  await route(page, 'lebenslauf/skills');
  await page.waitForFunction(() => !__stage.isMoving);
  await page.waitForTimeout(200);
  const camera = await page.evaluate(() => { __stage.setProjectionIdle(true); return __stage.camera.matrixWorld.toArray(); });
  await page.locator('[data-info-open="kurzprofil"]').click();
  await page.locator('[data-info-close]').click();
  await page.waitForFunction(() => !document.documentElement.dataset.infoView);
  assert.equal(new URL(page.url()).hash, '#lebenslauf/skills');
  assert(await page.evaluate(() => __stage.isRenderingPaused));
  assert.deepEqual(await page.evaluate(() => __stage.camera.matrixWorld.toArray()), camera);
  await page.evaluate(() => __stage.setProjectionIdle(false));
  await route(page, 'home');
  await page.locator('#nav > .nav__group > [data-target="abschluss"]').click();
  await page.waitForURL('**/#abschluss');
  assert.equal(await page.locator('#information-layer').isVisible(), false, 'The project opens its hologram first');
  assert.equal(await page.locator('.ihk-project').isVisible(), false, 'HTML reading is an explicit choice');
  await route(page, 'projekt/abschluss');
  assert.equal(await page.locator('.info-project__row').count(), 5);
  assert.equal(await page.locator('.info-project [data-info-route="kontakt"], .info-project a[href^="mailto:"]').count(), 0, 'No contact prompts in the project');
  assert.notEqual(await page.locator('[data-info-focus="project-report"]').getAttribute('download'), null);
  const firstPoint = page.locator('.info-project__row details').first();
  await firstPoint.locator('.info-project__number').click();
  await page.waitForFunction(() => document.querySelector('.info-project__row details').open);
  assert(await firstPoint.locator('.info-project__answer').isVisible(), 'Clicking the number reveals the project explanation');
  await page.locator('[data-info-focus="project-lang-en"]').click();
  assert.notEqual(await firstPoint.getAttribute('open'), null, 'Translation preserves the expanded point');
  await firstPoint.locator('summary').focus();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.info-project__row details').open);
  assert.equal(new URL(page.url()).hash, '#projekt/abschluss', 'Escape closes the point before leaving the project');
  await page.locator('[data-info-focus="project-lang-de"]').click();
  const term = page.locator('[data-info-term="pxe"]');
  await term.locator('summary').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => history.state?.infoTerm === 'pxe');
  const historyBeforeLanguage = await page.evaluate(() => history.length);
  await page.locator('[data-info-focus="project-lang-en"]').click();
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => history.length), historyBeforeLanguage);
  assert(await term.getAttribute('open') !== null);
  await page.goBack();
  await page.waitForFunction(() => !document.querySelector('[data-info-term="pxe"]').open);
  assert.equal(new URL(page.url()).hash, '#projekt/abschluss');
  await term.locator('summary').click();
  await page.waitForFunction(() => history.state?.infoTerm === 'pxe');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[data-info-term="pxe"]').open);
  assert.equal(new URL(page.url()).hash, '#projekt/abschluss');
  await term.locator('summary').click();
  await page.locator('[data-info-term="winpe"] summary').click();
  await page.waitForFunction(() => history.state?.infoTerm === 'winpe');
  const multipleTermHistory = await page.evaluate(() => history.length);
  await page.locator('[data-info-focus="project-lang-de"]').click();
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => history.length), multipleTermHistory);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => history.state?.infoTerm === 'pxe');
  assert(await term.getAttribute('open') !== null);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('details[open]'));
  await page.locator('[data-info-focus="project-lang-en"]').click();
  assert.equal(await page.locator('.info-media video').getAttribute('src'), profileResources('en').filmUrl);
  assert(await page.locator('.info-media video').evaluate(video => video.paused));
  await page.locator('.info-media video').evaluate(video => video.play());
  assert.equal(await page.locator('.info-media video').evaluate(video => video.paused), false);
  await route(page, 'kontakt');
  assert(await page.locator('.info-media video').evaluate(video => video.paused));
  assert.equal(await page.locator('[data-info-focus="contact-address"]').textContent(), profileResources().email);
  assert(await page.evaluate(() => __stage.isRenderingPaused));
  const frozenFrame = await page.evaluate(() => __stage.renderer.info.render.frame);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => __stage.renderer.info.render.frame), frozenFrame, 'Contact renders no continuous frames');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert(await page.evaluate(() => __stage.isRenderingPaused));
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  assert(await page.evaluate(() => __stage.isRenderingPaused), 'Tab return retains information pause');
  // Technical details are offered only in the 3D view, not in the HTML information views.
  assert.equal(await page.locator('[data-info-inspect]').count(), 0, 'No technical-details entry in information views');
  assert(await page.evaluate(() => __stage.isRenderingPaused));
  for (const legacy of ['abschluss/server','projekte/webseiten','projekte/systemintegration','lebenslauf/contact']) {
    await route(page, legacy);
    assert.equal(new URL(page.url()).hash, `#${legacy}`);
    assert.equal(await page.locator('#information-layer').isVisible(), false);
  }
  for (const width of [320,390,768,1024,1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const view of ['start','kurzprofil','projekt/abschluss','kontakt']) {
      await route(page, view);
      const dimensions = await page.locator(`[data-info-page="${view}"]`).evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth, doc: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert(dimensions.scroll <= dimensions.client + 1 && dimensions.doc <= dimensions.viewport + 1, `${width} ${view}: horizontal overflow ${JSON.stringify(dimensions)}`);
    }
  }
  assert.deepEqual(errors, []);
  await page.close();
  // All essential information and real document destinations survive JavaScript being disabled.
  const reading = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await reading.goto(base);
  assert(await reading.locator('#info-start-title').isVisible());
  assert(await reading.locator('#reading-de-info-profile-title').isVisible());
  assert.equal(await reading.locator('[href="mailto:' + profileResources().email + '"]').count(), 4);
  for (const lang of ['en','de']) {
    const resources = profileResources(lang);
    for (const href of [resources.cvUrl, resources.reportUrl]) {
      assert(await reading.locator(`[href="${href}"]`).count() > 0);
      assert.equal((await reading.request.get(base + href)).status(), 200);
    }
  }
  assert(await reading.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await reading.close();
  const fallback = await browser.newPage();
  await fallback.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); }; });
  await fallback.goto(base);
  await fallback.waitForFunction(() => document.documentElement.dataset.scene === 'unavailable');
  await fallback.locator('[data-info-focus="start-profile"]').click();
  await fallback.locator('[data-info-focus="profile-project"]').click();
  assert(await fallback.locator('#info-project-title').isVisible());
  assert.notEqual(await fallback.locator('[data-info-focus="project-report"]').getAttribute('download'), null);
  await route(fallback, 'kontakt');
  assert(await fallback.locator('[data-info-focus="contact-mail"]').isVisible());
  await fallback.close();
  console.log('PASS: early entry, focus/Back/Escape, languages, old routes and camera preservation, independent pauses, shared media, film stop, inspection, 320–1440px, no JavaScript and no WebGL.');
} finally { await browser.close(); }
