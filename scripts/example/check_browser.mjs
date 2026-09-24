import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.EXAMPLE_URL || 'http://127.0.0.1:5173';
const output = process.env.EXAMPLE_TEST_OUTPUT || '/tmp/example-projection-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];
const pose = page => page.evaluate(() => ({ position: window.__stage.camera.position.toArray(), rotation: window.__stage.camera.quaternion.toArray() }));
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
try {
  for (const mobile of [false, true].filter(value => !process.env.EXAMPLE_TEST_DEVICE || process.env.EXAMPLE_TEST_DEVICE === (value ? 'mobile' : 'desktop'))) {
    const context = await browser.newContext({ deviceScaleFactor: Number(process.env.TEST_DPR || 1), viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, reducedMotion: mobile ? 'reduce' : 'no-preference', isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(new URL(request.url()).pathname));
    await page.addInitScript(() => localStorage.setItem('vl-language', 'de'));
    await page.goto(`${base}/#home`);
    await page.waitForFunction(() => window.__stage?.cards.group.getObjectByName('example-preview') && document.querySelector('#boot.is-done') && !document.querySelector('.frame.is-intro'), { timeout: 45000 });
    assert.equal(requests.some(path => path.startsWith('/beispiel/')), false, 'Website is lazy-loaded');
    if (mobile) await page.locator('.mobile-pedestals [data-pedestal="1"]').click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-pedestal.png` });
    const centre = await page.evaluate(() => {
      const { cards, camera } = window.__stage;
      const mesh = cards.group.getObjectByName('example-preview');
      const position = mesh.getWorldPosition(camera.position.clone()).project(camera);
      const rect = document.querySelector('#scene').getBoundingClientRect();
      return { x: rect.left + (position.x + 1) * rect.width / 2, y: rect.top + (1 - position.y) * rect.height / 2 };
    });
    await page.mouse.move(centre.x, centre.y);
    await page.waitForTimeout(500);
    const homePose = await pose(page);
    if (mobile) await page.touchscreen.tap(centre.x, centre.y);
    else await page.mouse.click(centre.x, centre.y);
    await page.waitForURL('**/#projekte');
    await page.locator('.project-choice[data-project-id="systems"]').waitFor({ state: 'visible' });
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.example-projection').isVisible(), false, 'First click opens the project collection');
    const before = await pose(page);
    if (!mobile) assert(distance(homePose.position, before.position) > 2, 'First approach reaches the middle hologram');
    // Observe the real camera, not only the animation's target values.
    await page.evaluate(() => {
      window.__exampleSamples = [];
      window.__exampleSampler = setInterval(() => {
        const { camera, exampleFlight } = window.__stage;
        window.__exampleSamples.push({ at: performance.now(), state: exampleFlight.state, yaw: exampleFlight.yaw, position: camera.position.toArray(), direction: camera.getWorldDirection(camera.position.clone()).toArray() });
      }, 30);
    });
    await page.locator('.project-choice[data-project-id="systems"]').click();
    await page.evaluate(() => document.querySelector('.project-choice[data-project-id="systems"]').click()); // Guard a queued second activation.
    await page.waitForSelector('.example-projection[data-state="open"]', { timeout: 30000 }).catch(async error => {
      console.error(await page.evaluate(() => ({ flight: window.__stage.exampleFlight.state,
        dialog: document.querySelector('.example-projection').dataset.state,
        route: location.hash, intro: Boolean(document.querySelector('.frame.is-intro')),
        pointerTarget: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.tagName })));
      console.error(errors);
      await page.screenshot({ path: `${output}/opening-failure.png` });
      throw error;
    });
    await page.waitForFunction(() => document.querySelector('.example-projection iframe')?.dataset.ready === 'true');
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.example-projection iframe').count(), 1);
    assert.equal(await page.locator('.example-trigger, [data-example-separate]').count(), 0);
    assert.equal(await page.locator('.head').isVisible(), false, 'Header leaves the projection view');
    assert.equal(await page.locator('[data-example-back]').isVisible(), true);
    const samples = await page.evaluate(() => { clearInterval(window.__exampleSampler); return window.__exampleSamples; });
    const final = await pose(page);
    if (mobile) assert(distance(before.position, final.position) < .03, 'Reduced motion leaves the camera in place');
    else {
      const turns = samples.filter(sample => sample.yaw > .05 && sample.yaw < Math.PI - .05);
      assert(turns.length >= 5, 'Continuous turn has intermediate camera poses');
      for (let i = 1; i < turns.length; i++) assert(turns[i].yaw >= turns[i - 1].yaw, 'Monotonic half-turn');
      assert(samples.some(sample => Math.abs(sample.direction[0]) > .85), 'Camera actually looks sideways mid-turn');
      assert(samples.at(-1).direction[2] > .999, 'Camera faces +Z after a 180-degree turn from -Z');
      assert(distance(before.position, final.position) > .5 && final.position[2] < before.position[2], 'Second approach continues towards the already selected pedestal');
      assert(Math.abs(samples.at(-1).yaw - Math.PI) < 1e-6);
      assert(await page.evaluate(() => {
        const { camera, cards } = window.__stage;
        const pedestal = cards.group.getObjectByName('card-projekte');
        const delta = pedestal.getWorldPosition(camera.position.clone()).sub(camera.position);
        return delta.dot(camera.getWorldDirection(camera.position.clone())) < 0;
      }), 'Middle pedestal is behind the camera');
    }
    const frame = page.frameLocator('.example-projection iframe');
    await frame.locator('h1').waitFor();
    const iframeRect = await page.locator('.example-projection iframe').boundingBox();
    // Exercise wheel input on desktop and touch input on the mobile profile.
    if (!mobile) {
      await page.mouse.move(iframeRect.x + iframeRect.width * .65, iframeRect.y + iframeRect.height * .6);
      await page.mouse.wheel(0, 650);
      await frame.locator('body').evaluate(() => new Promise((resolve, reject) => {
        const started = performance.now();
        function check() {
          if (scrollY > 100) resolve();
          else if (performance.now() - started > 8000) reject(new Error('Wheel did not scroll the embedded document'));
          else requestAnimationFrame(check);
        }
        check();
      }));
    }
    assert.deepEqual(await pose(page), final, 'Scrolling does not move the scene camera');
    assert.equal(await page.evaluate(() => scrollY), 0);
    if (mobile) {
      await frame.locator('body').evaluate(() => {
        window.__gestureEvents = [];
        for (const type of ['touchstart', 'touchmove', 'touchend']) document.addEventListener(type, event => {
          window.__gestureEvents.push({ type, target: event.target.tagName, prevented: event.defaultPrevented });
        }, { passive: true });
      });
      const previousScroll = await frame.locator('body').evaluate(() => scrollY);
      const cdp = await context.newCDPSession(page);
      const x = iframeRect.x + iframeRect.width * .7;
      const startY = iframeRect.y + iframeRect.height * .75;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] });
      for (let step = 1; step <= 10; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: startY - step * 30 }] });
        await page.waitForTimeout(70);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await frame.locator('body').evaluate((_element, previous) => new Promise((resolve, reject) => {
        const started = performance.now();
        function check() {
          if (scrollY > previous + 50) resolve();
          else if (performance.now() - started > 8000) reject(new Error('Touch swipe did not scroll inside the projection'));
          else requestAnimationFrame(check);
        }
        check();
      }), previousScroll).catch(async error => {
        console.error(await frame.locator('body').evaluate(() => ({ scrollY, width: innerWidth, height: innerHeight, events: window.__gestureEvents })));
        console.error(await page.locator('.example-projection iframe').evaluate(el => ({ inert: el.inert, rect: el.getBoundingClientRect().toJSON(), width: innerWidth, scale: visualViewport.scale })));
        await page.screenshot({ path: `${output}/touch-failure.png` });
        throw error;
      });
      assert.deepEqual(await pose(page), final);
      await cdp.detach();
    }
    await frame.locator('a[href="#projekte"]').click();
    await frame.locator('summary').click();
    assert(await frame.locator('details').evaluate(el => el.open), 'Native interaction works');
    await frame.locator('#work-title').evaluate(el => {
      const range = document.createRange(); range.selectNodeContents(el);
      getSelection().removeAllRanges(); getSelection().addRange(range);
    });
    assert((await frame.locator('body').evaluate(() => getSelection().toString())).length > 10, 'Text remains selectable');
    await frame.locator('a[href="#top"]').last().click();
    await frame.locator('#example-language').click();
    assert.match(await frame.locator('h1').innerText(), /Systems/);
    assert.equal(await frame.locator('html').evaluate(el => el.scrollWidth <= innerWidth), true, 'No horizontal overflow');
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-projection-en.png` });
    await frame.locator('#example-language').click();
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-projection-de.png` });
    await page.keyboard.press('Escape'); // Focus is inside the iframe.
    await page.waitForFunction(() => !document.querySelector('.example-projection').open && window.__stage.exampleFlight.state === 'idle');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.example-projection iframe').count(), 0, 'Closing releases the opened document');
    assert.equal(await page.locator('.head').isVisible(), true, 'Header returns with the overview');
    assert(distance((await pose(page)).position, before.position) < .2, `Return restores the saved view: ${JSON.stringify({before, after: await pose(page)})}`);
    assert(distance((await pose(page)).rotation, before.rotation) < .02, 'Return restores the saved viewing direction');
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('project-choice')), true, 'Return restores focus to the scene trigger');
    // Keyboard opening from the scene and closing via the touch-sized return control.
    await page.locator('.project-choice[data-project-id="systems"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.example-projection[data-state="open"]');
    await page.locator('[data-example-back]').click();
    await page.waitForFunction(() => !document.querySelector('.example-projection').open);
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('project-choice')), true);
    if (!mobile) {
      await page.keyboard.press('Enter');
      await page.waitForSelector('.example-projection[data-state="opening"]');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.example-projection').open && window.__stage.exampleFlight.state === 'idle');
      assert.equal(await page.locator('iframe').count(), 0, 'Interrupted flight releases its iframe');
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('project-choice')), true);
    }
    assert.deepEqual(errors, []);
    results.push({ mobile, samples, errors, passed: true });
    await context.close();
    console.log(`${mobile ? 'Mobile / reduced motion / touch' : 'Desktop / animated / mouse'}: passed`);
  }
  // Direct route, independent of the 3D application, in both languages.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const lang of ['de', 'en']) {
    const response = await page.goto(`${base}/beispiel/?lang=${lang}`);
    assert.equal(response.status(), 200);
    await page.locator('h1').waitFor();
    assert.equal(await page.locator('canvas').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('[data-portfolio="abschluss"]').getAttribute('href'), '/#abschluss');
    await page.screenshot({ path: `${output}/direct-mobile-${lang}.png`, fullPage: true });
  }
  await page.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
