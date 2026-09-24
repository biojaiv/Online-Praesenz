import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { checkLighting } from './check_lighting.mjs';

// Uses the development scene handle; the production inspection test runs separately.
const base = process.env.SITE_URL || 'http://127.0.0.1:5173';
const output = '/tmp/portfolio-background-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  await checkLighting(browser, base, output);
  for (const reduced of [false, true]) {
    const context = await browser.newContext({
      viewport: reduced ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: .5, reducedMotion: reduced ? 'reduce' : 'no-preference', locale: 'de-DE',
    });
    await context.addInitScript(() => localStorage.setItem('vl-intro-seen', '1'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForFunction(() => window.__stage && document.querySelector('#boot.is-done'));
    assert.equal(await page.evaluate(() => window.__stage.background.ready), true);
    assert.equal(await page.evaluate(() => window.__stage.cards.ready), 'loaded');
    const info = await page.evaluate(() => {
      const { group } = window.__stage.background;
      const source = group.getObjectByName('blender-orrery').children.find(object => object.userData.sourceName === 'V2 GESAMTMODELL');
      let meshCount = 0, writesDepth = false, invalidOrder = false;
      group.traverse(object => {
        if (!object.isMesh) return;
        meshCount++;
        writesDepth ||= object.material.depthWrite;
        invalidOrder ||= object.renderOrder !== -10;
      });
      const main = source.children.find(object => object.userData.sourceName === '01 HAUPTMASCHINE / Lage');
      const satelliteScales = source.children.filter(object => /NEBENMASCHINE \/ Lage$/.test(object.userData.sourceName))
        .map(child => Number(child.scale.x.toFixed(2)));
      let authoredMeshes = 0, authoredRotors = 0;
      source.traverse(object => { authoredMeshes += Number(object.userData.sourceType === 'MESH');
        authoredRotors += Number(Number.isFinite(object.userData.Winkelgeschwindigkeit)); });
      const materials = [...new Set((() => { const found = []; source.traverse(object => { if (object.isMesh) found.push(object.material); }); return found; })())];
      const oldMeshes = [];
      group.traverse(object => { if (object.isMesh && !object.material.userData.orreryUniforms) oldMeshes.push(object.name); });
      return { originalMaterials: materials.map(material => ({ name: material.name, colour: material.color.toArray(), metalness: material.metalness, roughness: material.roughness, pbr: material.isMeshStandardMaterial })), oldMeshes,
        name: group.name, source: source.userData.source, meshCount, writesDepth, invalidOrder,
        position: main.position.toArray(), scale: source.scale.toArray(), satelliteScales, authoredMeshes, authoredRotors };
    });
    assert.equal(info.name, 'blender-background');
    assert.deepEqual(info.oldMeshes, [], 'Only the authored model is rendered; no old Orrery or light overlays');
    assert.equal(new Set(info.originalMaterials.map(material => material.name)).size, 4, 'All four Blender materials are preserved for nearby and distant structures');
    assert(info.originalMaterials.every(material => material.pbr), 'Original PBR materials remain in use');
    const brass = info.originalMaterials.find(material => material.name === 'V2 / Messing');
    assert(Math.abs(brass.colour[0] - .39) < .0001 && Math.abs(brass.metalness - .85) < .0001 && Math.abs(brass.roughness - .3) < .0001);
    assert.equal(info.source, 'Elemente/Orrery/Hintergrund.blend');
    assert.equal(info.authoredMeshes, 152, 'The complete new construction is loaded, including dust and accessories');
    assert(info.authoredRotors > 100, 'Authored rotation metadata is present');
    assert(info.meshCount >= 24, 'Authored ring assemblies are present');
    assert.equal(info.writesDepth, false, 'Background must not occlude document projections');
    assert.equal(info.invalidOrder, false);
    const additions = await page.evaluate(() => {
      const stars = window.__stage.background.group.getObjectByName('distant-stars');
      const positions = stars.geometry.attributes.position;
      let minimumDistance = Infinity;
      for (let i = 0; i < positions.count; i++) minimumDistance = Math.min(minimumDistance,
        Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i)));
      let ringSpeed;
      window.__stage.background.group.traverse(object => {
        if (object.userData.sourceName === '01 HAUPTMASCHINE / Ring 0') ringSpeed = object.userData.webAngularSpeed;
      });
      const green = [], violet = [];
      for (const name of ['pedestal-base-lebenslauf', 'pedestal-upper-lebenslauf']) {
        window.__stage.cards.group.getObjectByName(name)?.traverse(object => {
          if (!object.isMesh) return;
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            if (material.name === 'VL / Gruen') green.push(material.emissive.toArray());
            if (material.name === 'VL / Violett') violet.push(material.name);
          }
        });
      }
      return { starCount: positions.count, minimumDistance, ringSpeed, green, violet };
    });
    assert.equal(additions.starCount, 190);
    assert(additions.minimumDistance > 899, 'Stars stay far beyond the Orrery');
    assert(Math.abs(additions.ringSpeed - .022 * 1.8) < .0001, 'Rings rotate more clearly, at a calm speed');
    assert(additions.green.length > 0 && additions.green.every(colour => colour[1] > colour[0] && colour[1] > colour[2]));
    assert.deepEqual(additions.violet, [], 'The right pedestal uses green instead of pink');

    assert.deepEqual(info.position, [0, -1, -12], 'Pedestal row lies close to the core and inside the inner rings');
    assert.deepEqual(info.scale, [1, 1, 1], 'Authored radii retain the published world dimensions');
    assert.deepEqual(info.satelliteScales, [.34, .28, .52, .36], 'Orbit views retain all four surrounding mechanisms');
    const rotation = () => page.evaluate(() => {
      let core;
      window.__stage.background.group.traverse(object => {
        if (object.userData.sourceName === '01 HAUPTMASCHINE / Kern') core = object;
      });
      return core.quaternion.toArray();
    });
    const before = await rotation();
    await page.waitForTimeout(850);
    const after = await rotation();
    if (reduced) assert.deepEqual(after, before, 'Reduced motion holds the model still');
    else assert.notDeepEqual(after, before, 'The authored core rotates');
    const lightState = () => page.evaluate(() => {
      let uniforms;
      window.__stage.background.group.traverse(object => {
        if (object.isMesh) uniforms = object.material.userData.orreryUniforms;
      });
      return { time: uniforms.uOrreryTime.value, positions: uniforms.uOrreryLights.value.map(point => point.toArray()), energy: [...uniforms.uOrreryEnergy.value] };
    });
    if (!reduced) await page.evaluate(() => window.__stage.background.triggerSparseIllumination());
    await page.waitForTimeout(150);
    const lightBefore = await lightState();
    if (reduced) await page.waitForTimeout(700);
    else await page.waitForFunction(before => {
      let time;
      window.__stage.background.group.traverse(object => {
        if (object.material?.userData.orreryUniforms) time = object.material.userData.orreryUniforms.uOrreryTime.value;
      });
      return time > before + .5;
    }, lightBefore.time);
    const lightAfter = await lightState();
    if (reduced) assert.deepEqual(lightAfter, lightBefore, 'Reduced motion also freezes light fronts and runners');
    else assert.notDeepEqual(lightAfter.positions, lightBefore.positions, 'Local lights move through space without a surface overlay');
    const screenshot = async name => {
      await page.evaluate(() => {
        window.__stage.setInspectionFrozen(true);
        // Drain the software GPU before Chromium captures a radically changed view.
        window.__stage.renderer.getContext().finish();
      });
      try { await page.screenshot({ path: `${output}/${reduced ? 'mobile' : 'desktop'}-${name}.png` }); }
      finally { await page.evaluate(() => window.__stage.setInspectionFrozen(false)); }
    };
    await screenshot('home');
    if (!reduced) {
      await page.evaluate(() => window.__stage.setOrbit(Math.PI, 0));
      await page.waitForFunction(() => window.__stage.camera.position.z < -20);
      await page.waitForTimeout(400);
      await screenshot('rear');
      const rear = await page.evaluate(() => {
        let uniforms;
        window.__stage.background.group.traverse(object => {
          if (object.isMesh) uniforms = object.material.userData.orreryUniforms;
        });
        return uniforms.uOrreryRear.value;
      });
      assert(rear > .95, 'Distant machines remain illuminated when looking at the back of the pedestals');
      await page.evaluate(() => window.__stage.setOrbit(0, 0));
    }
    await page.locator('[data-target="lebenslauf"]').first().click();
    await page.waitForURL('**/#lebenslauf');
    await page.waitForFunction(() => !window.__stage.isMoving);
    await page.waitForTimeout(500);
    await screenshot('cv');
    assert.equal(await page.evaluate(() => window.__stage.background.group.visible), true);
    await page.locator('.head__brand').click();
    await page.waitForFunction(() => !window.__stage.isMoving);
    await page.evaluate(() => window.__stage.background.setEffectsEnabled(false));
    assert.equal(await page.evaluate(() => window.__stage.background.group.visible), false);
    await page.evaluate(() => window.__stage.background.setEffectsEnabled(true));
    assert.equal(await page.evaluate(() => window.__stage.background.group.visible), true);
    assert.deepEqual(errors, []);
    console.log(`PASS background: ${reduced ? 'mobile / reduced motion' : 'desktop / animated'}, Blender assembly, materials, navigation and intro visibility`);
    await context.close();
  }
  const context = await browser.newContext({ reducedMotion: 'reduce', deviceScaleFactor: .5 });
  await context.addInitScript(() => localStorage.setItem('vl-intro-seen', '1'));
  const page = await context.newPage();
  await page.route('**/*Hintergrund_web*.glb*', route => route.abort());
  await page.goto(base);
  await page.waitForFunction(() => window.__stage && document.querySelector('#boot.is-done'));
  assert.equal(await page.evaluate(() => window.__stage.background.ready), false);
  assert.equal(await page.evaluate(() => window.__stage.cards.ready), 'loaded');
  await page.locator('[data-target="projekte"]').first().click();
  await page.locator('.projects-browser:not([hidden])').waitFor();
  console.log('PASS background load failure: foreground and navigation remain usable');
  await context.close();
} finally { await browser.close(); }
