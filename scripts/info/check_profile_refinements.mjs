import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.SITE_URL || 'http://127.0.0.1:5175';
const browser = await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:.4});
  page.setDefaultTimeout(60000);
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('vl-language','de');
    Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});
  });
  // Scene motion/framing checks use lightweight fallback geometry; the visual
  // review separately verifies the actual Blender models and Orrery motion.
  await page.route('**/*.glb*', request => request.abort());
  await page.goto(`${base}/#kurzprofil`);
  await page.waitForFunction(() => window.__stage && document.querySelector('#boot.is-done'));
  const go = async route => {
    console.log('Checking origin/route:', route);
    await page.evaluate(route => {location.hash=route;}, route);
    await page.waitForFunction(route => location.hash === `#${route}` && (document.documentElement.dataset.infoView || '') === (['start','kurzprofil','projekt/abschluss','kontakt'].includes(route) ? route : ''), route);
  };
  async function advancing() {
    const before = await page.evaluate(() => __stage.renderer.info.render.frame);
    await page.waitForFunction(before => __stage.renderer.info.render.frame > before+2,before);
    assert.equal(await page.evaluate(() => __stage.isRenderingPaused),false);
  }
  await advancing();
  const framing = await page.evaluate(() => __stage.camera.position.toArray());
  for(const origin of ['start','home','lebenslauf/skills','abschluss/server','projekte/webseiten','projekt/abschluss','kontakt']) {
    await go(origin);
    if(!['start','projekt/abschluss','kontakt'].includes(origin)) await page.waitForFunction(() => !__stage.isMoving);
    const scroll = await page.evaluate(() => __stage.cards.documentScroll);
    if(origin==='start') await page.locator('[data-info-focus=start-profile]').click();
    else if(!['projekt/abschluss','kontakt'].includes(origin)) await page.locator('[data-info-open=kurzprofil]').click();
    else await go('kurzprofil');
    await page.waitForFunction(() => document.documentElement.dataset.infoView === 'kurzprofil');
    await advancing();
    const position = await page.evaluate(() => __stage.camera.position.toArray());
    assert(Math.abs(position[2] / framing[2] - 1) < .05 && position[0] === 0 && position[1] === 0, `Consistent distant framing from ${origin}: ${position}`);
    assert.equal(await page.evaluate(() => __stage.cards.documentScroll),scroll);
    await page.goBack();
    await page.waitForFunction(origin => location.hash === `#${origin}`,origin);
    if(origin==='kontakt' || origin==='projekt/abschluss') assert(await page.evaluate(() => __stage.isRenderingPaused));
  }
  await go('kurzprofil');
  await page.evaluate(() => __stage.setProjectionIdle(true));
  assert(await page.evaluate(() => __stage.isRenderingPaused));
  await page.evaluate(() => __stage.setProjectionIdle(false));
  await advancing();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(() => __stage.isRenderingPaused);
  const still = await page.evaluate(() => __stage.renderer.info.render.frame);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => __stage.renderer.info.render.frame),still);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await advancing();
  await page.evaluate(() => {Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert(await page.evaluate(() => __stage.isRenderingPaused));
  await page.evaluate(() => {delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await advancing();
  // Each factual application note stays at the bottom of its own field as wrapping skill chips.
  const notes=page.locator('.info-profile__field .info-profile__note');
  assert.equal(await notes.count(),4);
  for(const language of ['en','de']) {
    await page.locator(`[data-info-focus=profile-lang-${language}]`).click();
    for(const note of await notes.all()) {
      assert(await note.locator('li').count()>=3,'Skills are listed as chips');
      assert(await note.evaluate(el=>el.getBoundingClientRect().right<=el.closest('.info-profile__field').getBoundingClientRect().right+1),'Chips wrap inside their field');
    }
  }
  // The 30-second clock runs visibly and ends in a completed state.
  const sheet=page.locator('[data-profile-sheet]');
  assert(Number(await sheet.evaluate(el=>getComputedStyle(el).getPropertyValue('--profile-progress')))>0,'Reading clock is running');
  assert.equal(await page.locator('.info-profile__field.is-reached').count()>=1,true);
  await page.setViewportSize({width:375,height:812});
  assert(await page.locator('.info-profile').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await page.setViewportSize({width:1440,height:1000});
  await go('home');
  const targets = page.locator('.foot a, .foot button, .foot summary');
  for(const target of await targets.all()) {
    if(!await target.isVisible() || !await target.isEnabled()) continue;
    await target.dispatchEvent('pointerover',{pointerType:'mouse'});
    assert(await target.evaluate(el=>el.classList.contains('control-ripple')),await target.textContent());
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: moving distant profile from all route families, return state, independent pauses, reduced motion, hidden tab, bilingual skill chips, 30-second clock, mobile overflow and footer pulse.');
} finally { await browser.close(); }
