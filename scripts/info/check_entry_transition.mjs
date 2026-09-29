import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.SITE_URL || 'http://127.0.0.1:5175';
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:.4});
  page.setDefaultTimeout(60000);
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2}));
  await page.route('**/*.glb*',r=>r.abort());
  await page.goto(base);
  await page.waitForFunction(()=>window.__stage && document.querySelector('#boot.is-done'));
  for (const language of ['de', 'en']) {
    await page.locator(`[data-info-focus=start-lang-${language}]`).click();
    const identity = await page.evaluate(()=>({
      role:document.querySelector('.info-identity .info-role').textContent,
      headerRole:document.querySelector('.head__role').textContent,
      summary:document.querySelector('.info-identity__summary').textContent,
      headerSummary:document.querySelector('.head__summary').textContent,
      reveal:document.querySelector('.info-name__glyph').getAnimations()[0]?.effect.getTiming().duration,
      summaryDelay:document.querySelector('.info-identity__summary').getAnimations()[0]?.effect.getTiming().delay,
    }));
    assert.equal(identity.role,identity.headerRole,`${language}: full canonical role at entry`);
    assert.equal(identity.summary,identity.headerSummary,`${language}: all canonical profile facts at entry`);
    assert(identity.reveal>=1000 && identity.summaryDelay>=1800,'Name and supporting details reveal slowly');
  }
  assert.equal(await page.locator('.info-pedestal,.info-pedestals').count(),0,'Entry has no buttons below the pedestals');
  const clickSection=async key=>{
    const point=await page.evaluate(key=>{
      const s=window.__stage;
      const p=s.cards.worldBounds(key).getCenter(s.camera.position.clone()).project(s.camera);
      const r=s.renderer.domElement.getBoundingClientRect();
      return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
    },key);
    await page.mouse.move(point.x,point.y);
    assert.equal(await page.locator('#information-layer').getAttribute('data-info-scene-hover'),'true');
    await page.mouse.click(point.x,point.y);
  };
  const begin=async()=>{
    await page.locator('[data-info-focus=start-explore]').click();
    await page.waitForFunction(()=>document.querySelector('#information-layer').dataset.infoExiting==='explore');
  };
  // Simulate a retained orbit from an earlier visit to the spatial portfolio.
  await page.evaluate(()=>__stage.setOrbit(.55,.18));
  // Record phase boundaries inside the browser. This stays deterministic even
  // when SwiftShader cannot provide an animation midpoint between round trips.
  await page.evaluate(()=>{
    window.__entryPhases=[];
    new MutationObserver(()=>{
      const phase=document.documentElement.dataset.entryPhase;
      if (!phase || window.__entryPhases.at(-1)?.phase===phase) return;
      window.__entryPhases.push({phase,route:document.documentElement.dataset.infoView,
        camera:__stage.camera.position.toArray(),offset:__stage.camera.view?.offsetX,
        identityTop:document.querySelector('.info-identity').getBoundingClientRect().top,
        inert:document.querySelector('.info-start').inert,
        brand:getComputedStyle(document.querySelector('.head__brand')).visibility});
    }).observe(document.documentElement,{attributes:true,attributeFilter:['data-entry-phase']});
    const original=__stage.animateInformationExit;
    __stage.animateInformationExit=(...args)=>{
      window.__cameraStart={phase:document.documentElement.dataset.entryPhase,brand:getComputedStyle(document.querySelector('.head__brand')).visibility};
      return original(...args);
    };
  });
  await clickSection('projekte');
  await page.waitForFunction(()=>location.hash==='#home' && !document.documentElement.dataset.infoView);
  const {phases,cameraStart}=await page.evaluate(()=>({phases:window.__entryPhases,cameraStart:window.__cameraStart}));
  assert.deepEqual(phases.map(s=>s.phase),['fade','spinup','warp','camera']);
  assert(phases.every(s=>s.route==='start' && s.inert));
  assert.deepEqual(phases[0].camera,phases[1].camera,'Camera stays still while other content fades');
  assert.deepEqual(phases[1].camera,phases[2].camera,'Camera stays still while squares accelerate');
  assert.deepEqual(phases[2].camera,phases[3].camera,'Camera stays still until the identity reaches the header');
  assert.equal(phases[1].identityTop,phases[2].identityTop,'Identity stays in place during spin-up');
  assert.deepEqual(cameraStart,{phase:'camera',brand:'visible'});
  assert.equal(await page.locator('#information-layer').isVisible(),false);
  await page.waitForTimeout(100);
  const homeCamera=await page.evaluate(()=>__stage.camera.position.toArray());
  assert(Math.abs(homeCamera[0])<.05 && Math.abs(homeCamera[1])<.05);
  assert(Math.abs(homeCamera[2]-21.5)<.05,'No retained orbit offset at the home handoff');
  await page.goBack();
  await page.waitForFunction(()=>document.documentElement.dataset.infoView==='start');
  assert.equal(await page.locator('.info-start__copy').evaluate(el=>getComputedStyle(el).opacity),'1');
  for (const phase of ['fade','spinup','warp','camera']) {
    await begin();
    await page.waitForFunction(phase=>document.documentElement.dataset.entryPhase===phase,phase);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('html').getAttribute('data-info-view'),'start');
    assert.equal(await page.locator('.info-start').evaluate(el=>el.inert),false);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.infoFocus),'start-explore');
    assert.equal(await page.locator('.info-identity-flight').count(),0);
    assert.equal(await page.locator('html').getAttribute('data-entry-phase'),null);
  }
  // Changing routes during the flight must not allow its completion to override the new view.
  await begin();
  await page.evaluate(()=>{location.hash='kontakt';});
  await page.waitForFunction(()=>document.documentElement.dataset.infoView==='kontakt');
  await page.waitForTimeout(1250);
  assert.equal(new URL(page.url()).hash,'#kontakt');
  await page.evaluate(()=>{location.hash='start';});
  await page.waitForFunction(()=>document.documentElement.dataset.infoView==='start');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-info-focus=start-explore]').click();
  await page.waitForFunction(()=>location.hash==='#home');
  assert.equal(await page.locator('#information-layer').getAttribute('data-info-exiting'),null);
  // Every entry pedestal stops at the overview, including reduced-motion visits.
  for(const key of ['abschluss','projekte','lebenslauf']) {
    await page.evaluate(()=>{location.hash='start';});
    await page.waitForFunction(()=>document.documentElement.dataset.infoView==='start');
    await clickSection(key);
    await page.waitForFunction(()=>location.hash==='#home');
    assert.equal(await page.locator('#information-layer').isVisible(),false);
    assert.equal(await page.evaluate(()=>__stage.cards.group.children.some(c=>c.userData.active)),false);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: canonical DE/EN identity, slower reveal, stationary spin-up, sequential warp/camera, three pedestal clicks, Back, Escape in every phase, interrupted navigation and reduced motion.');
} finally {await browser.close();}
