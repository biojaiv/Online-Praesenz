/** Real mouse/touch and keyboard disclosures against the production preview. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.IHK_TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.IHK_TEST_OUTPUT || '/tmp/ihk-navigation-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      hasTouch: mobile, isMobile: mobile, reducedMotion: mobile ? 'reduce' : 'no-preference',
    });
    await context.addInitScript(() => localStorage.setItem('vl-language', 'de'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const activate = async (locator) => mobile ? locator.tap() : locator.click();
    const root = (name) => page.locator(`.nav__link[data-target="${name}"]`);
    const expanded = async (name) => (await root(name).getAttribute('aria-expanded')) === 'true';
    await page.goto(`${base}/#home`);
    await page.waitForFunction(() => document.querySelector('#boot').classList.contains('is-done'));

    for (const name of ['abschluss', 'projekte', 'lebenslauf']) {
      await activate(root(name));
      assert(await expanded(name));
      assert.equal(await page.locator('.nav__group.is-open').count(), 1);
      if (name === 'abschluss') {
        assert.equal(await page.locator('.ihk-project').isVisible(), false);
        assert.equal(await page.locator('.ihk-film-toggle').isVisible(), true);
      }
      const route = page.url();
      const box = await page.locator('.nav__group.is-open .nav__sub').boundingBox();
      assert(box.x >= 0 && box.x + box.width <= page.viewportSize().width + 1, 'Submenu fits viewport');
      assert(await page.locator('.nav__group.is-open .nav__sub button').evaluateAll((items) => items.every((item) => {
        const rect = item.getBoundingClientRect();
        return item.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      })), 'Reading overlays must not cover submenu buttons');
      await activate(root(name));
      assert.equal(await expanded(name), false);
      assert.equal(page.url(), route, 'Collapsing must not navigate or reset content');
      assert.equal(await page.locator(`#nav-sub-${name}`).evaluate((el) => el.inert), true);
      await page.waitForFunction((key) => getComputedStyle(document.querySelector(`#nav-sub-${key}`)).visibility === 'hidden', name);
      assert.equal(await root(name).evaluate((el) => el === document.activeElement), true);
      await activate(root(name));
      assert(await expanded(name));
      await activate(page.locator('#language-switch'));
      assert.equal(await page.locator('.nav__group.is-open').count(), 0, 'Outside click closes');
      assert.equal(page.url(), route, 'Outside click does not change route');
    }

    await activate(root('abschluss'));
    await activate(root('lebenslauf'));
    assert.equal(await expanded('abschluss'), false);
    assert(await expanded('lebenslauf'));
    await activate(root('abschluss'));
    await activate(page.locator('.ihk-reader-toggle'));
    await page.locator('.ihk-project:not([hidden])').waitFor();
    await activate(root('abschluss'));
    await activate(page.locator('#nav-sub-abschluss [data-target="abschluss/migration"]'));
    await page.waitForURL('**/#abschluss/migration');
    assert.equal(await page.locator('.nav__group.is-open').count(), 0);
    await activate(root('abschluss'));
    await page.keyboard.press('Escape');
    assert.equal(await expanded('abschluss'), false);
    assert.equal(await page.locator('.ihk-project').isVisible(), true, 'Escape closes menu before reader');

    await root('abschluss').focus();
    await page.keyboard.press('ArrowDown');
    assert(await expanded('abschluss'));
    assert.equal(await page.evaluate(() => document.activeElement.dataset.target), 'abschluss/server');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.target), 'abschluss/migration');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/#abschluss/migration');
    assert.equal(await page.locator('.nav__group.is-open').count(), 0);
    assert.equal(await page.locator('.ihk-project').isVisible(), true);

    // Footer actions remain reachable from every project subroute.
    await activate(page.locator('[data-ihk-scroll="ihk-film"]'));
    await page.waitForURL('**/#abschluss');
    assert.equal(await page.locator('video').evaluate((el) => el === document.activeElement), true);
    await activate(page.locator('[data-ihk-scroll="ihk-downloads"]'));
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), '/ihk/IHK_Projektarbeit_DE.pdf');

    await root('abschluss').focus();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Tab');
    await page.waitForFunction(() => !document.querySelector('.nav__group.is-open'));
    await activate(root('abschluss'));
    await activate(page.locator('#ihk-title'));
    assert.equal(await page.locator('.nav__group.is-open').count(), 0);
    assert.equal(await page.locator('.ihk-project').isVisible(), true);
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-project.png` });
    await activate(root('abschluss'));
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.nav__group.is-open .nav__sub')).opacity) > 0.99);
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-submenu.png` });
    assert.deepEqual(errors, []);
    results.push({ mobile, repeatedClick: true, outsideClick: true, otherGroup: true, keyboard: true, mediaActions: true, errors });
    console.log(`PASS: ${mobile ? 'touch/reduced motion' : 'mouse/normal motion'} navigation, direct project content and media actions`);
    await context.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
