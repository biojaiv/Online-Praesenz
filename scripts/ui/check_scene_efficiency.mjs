import assert from 'node:assert/strict';
import * as THREE from 'three';
import { chromium } from 'playwright';
import { createOrreryCoverage } from '../../src/scene/orreryCoverage.js';

// Independent reference: original linear-distance coverage calculation.
function referenceCoverage(network, camera, lights, target) {
  const point = new THREE.Vector3(), projected = new THREE.Vector3(), distances = [];
  let total = 0;
  const stageDepth = camera ? -point.set(0, -5, 0).applyMatrix4(camera.matrixWorldInverse).z : 0;
  for (const path of network.paths) {
    let visible = true;
    for (let parent = path.carrier; parent; parent = parent.parent) if (!parent.visible) visible = false;
    if (!visible) continue;
    const count = Math.max(3, Math.ceil(path.length / 2));
    for (let i = 0; i < count; i++) {
      path.point((i + .5) / count, point);
      if (camera) {
        const depth = -projected.copy(point).applyMatrix4(camera.matrixWorldInverse).z;
        projected.copy(point).project(camera);
        if (depth < Math.max(10, stageDepth + 2) || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z > 1) continue;
      }
      let distance = Infinity;
      for (const light of lights) distance = Math.min(distance, point.distanceTo(light.position) / light.baseRadius);
      distances.push({ distance, weight: path.length / count });
      total += path.length / count;
    }
  }
  if (!total) return { scale: 1, fraction: 0 };
  distances.sort((a, b) => a.distance - b.distance);
  let covered = 0, threshold = 1;
  for (const sample of distances) {
    covered += sample.weight; threshold = sample.distance;
    if (covered >= total * target) break;
  }
  return { scale: THREE.MathUtils.clamp(threshold / .8, .25, 6), fraction: covered / total };
}

const parent = new THREE.Group();
const network = { paths: Array.from({ length: 12 }, (_, i) => {
  const carrier = new THREE.Group(); parent.add(carrier);
  const radius = 8 + i * 3;
  return { carrier, length: Math.PI * 2 * radius, point(t, out) {
    return out.set(Math.cos(t * Math.PI * 2) * radius, i - 5, Math.sin(t * Math.PI * 2) * radius - 35);
  } };
}) };
const camera = new THREE.PerspectiveCamera(45, 1.5, .1, 1000);
const lights = Array.from({ length: 6 }, (_, i) => ({ position: new THREE.Vector3(), baseRadius: 10 + i }));
for (const view of [null, camera]) {
  const coverage = createOrreryCoverage(network, view);
  for (let frame = 0; frame < 100; frame++) {
    camera.position.set(Math.sin(frame * .04) * 40, 5, 40); camera.lookAt(0, 0, -35); camera.updateMatrixWorld();
    parent.visible = frame % 13 !== 0;
    network.paths[3].carrier.visible = frame % 5 !== 0;
    lights.forEach((light, i) => light.position.set(Math.cos(frame * .1 + i) * 25, i, Math.sin(frame * .1 + i) * 25 - 35));
    const activeLights = frame % 17 ? lights : [];
    const target = .15 + frame % 10 * .005;
    const expected = referenceCoverage(network, view, activeLights, target);
    const actual = coverage.measure(activeLights, target);
    assert(Math.abs(actual.scale - expected.scale) < 1e-12);
    assert.equal(actual.fraction, expected.fraction);
  }
}
console.log('PASS: coverage matches the original across 200 moving-light/camera/visibility scenarios.');

const base = process.env.SITE_URL || 'http://127.0.0.1:5175';
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 960, height: 720 }, deviceScaleFactor: .5,
      reducedMotion: 'reduce', ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
    page.setDefaultTimeout(90000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/#home`);
    await page.waitForFunction(() => window.__stage && document.querySelector('#boot.is-done'));
    assert.equal(await page.evaluate(() => __stage.cards.ready), 'loaded');
    assert.equal(await page.evaluate(() => __stage.background.ready), true);
    const result = await page.evaluate(() => {
      const s = __stage;
      s.stop(); s.setGlitch(0);
      const root = s.background.group.getObjectByName('blender-orrery').children[0];
      const nodes = [];
      let calls = 0;
      root.traverse(node => {
        nodes.push({ node, auto: node.matrixAutoUpdate, update: node.updateMatrix });
        const original = node.updateMatrix;
        node.updateMatrix = function () { calls++; return original.call(this); };
      });
      const rotors = nodes.filter(({ node }) => Number.isFinite(node.userData.Winkelgeschwindigkeit));
      const counts = [];
      for (let frame = 0; frame < 6; frame++) {
        rotors.forEach(({ node }) => node.rotateY(.013));
        nodes.forEach(({ node }) => { node.matrixAutoUpdate = true; });
        calls = 0; root.updateWorldMatrix(true, true);
        const baseline = calls, matrices = nodes.map(({ node }) => node.matrixWorld.toArray());
        nodes.forEach(({ node, auto }) => { node.matrixAutoUpdate = auto; });
        calls = 0; root.updateWorldMatrix(true, true);
        counts.push({ baseline, optimized: calls });
        nodes.forEach(({ node }, i) => {
          if (node.matrixWorld.elements.some((value, j) => value !== matrices[i][j])) throw new Error('Static transform optimization changed a world matrix');
        });
      }
      nodes.forEach(({ node, update }) => { node.updateMatrix = update; });
      const wings = ['example-preview', 'example-preview-systemintegration'].map(name => s.cards.group.getObjectByName(name));
      const savedVisibility = s.cards.group.children.map(holder => [holder, holder.visible]);
      s.cards.group.children.forEach(holder => { holder.visible = holder.name === 'card-projekte'; });
      const renderer = s.renderer, gl = renderer.getContext(), canvas = renderer.domElement;
      renderer.info.autoReset = false;
      const render = () => {
        renderer.info.reset(); s.composer.render(0);
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return { pixels, calls: renderer.info.render.calls };
      };
      const comparisons = [];
      for (const [x, y, z] of [[0, 0, 21.5], [12, -1, 15], [0, 0, -35]]) {
        s.camera.clearViewOffset(); s.camera.position.set(x, y, z); s.camera.lookAt(0, -1, 0); s.camera.updateMatrixWorld();
        wings.forEach(wing => { wing.material.forceSinglePass = false; });
        const before = render();
        wings.forEach(wing => { wing.material.forceSinglePass = true; });
        const after = render();
        let different = 0;
        for (let i = 0; i < before.pixels.length; i++) if (before.pixels[i] !== after.pixels[i]) different++;
        comparisons.push({ different, before: before.calls, after: after.calls });
      }
      savedVisibility.forEach(([holder, visible]) => { holder.visible = visible; });
      renderer.info.autoReset = true;
      return { nodes: nodes.length, rotors: rotors.length, counts, comparisons, glError: gl.getError() };
    });
    assert(result.counts.every(count => count.optimized < count.baseline));
    assert(result.comparisons.every(comparison => comparison.different === 0), JSON.stringify(result.comparisons));
    assert(result.comparisons.some(comparison => comparison.after < comparison.before));
    assert.equal(result.glError, 0); assert.deepEqual(errors, []);
    console.log(`PASS ${mobile ? 'mobile' : 'desktop'}: identical animated world matrices and rendered pixels; ${JSON.stringify(result)}`);
    await page.close();
  }
} finally { await browser.close(); }
