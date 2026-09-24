import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

export async function checkLighting(browser, base, output) {
  const page = await browser.newPage({ reducedMotion: 'no-preference' });
  const shaderErrors = [];
  page.on('console', message => { if (message.type() === 'error') shaderErrors.push(message.text()); });
  await page.goto(`${base}/beispiel/`);
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { createBackground } = await import('/src/scene/background.js');
    const { createOrreryPaths } = await import('/src/scene/orreryPaths.js');
    const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
    renderer.setSize(480, 300);
    renderer.setClearColor(0x000000, 1);
    const scene = new THREE.Scene();
    // Even scene-wide ambient light must not reveal the dark Orrery.
    scene.add(new THREE.AmbientLight(0xffffff, 100));
    const camera = new THREE.PerspectiveCamera(45, 480 / 300, .1, 400);
    camera.position.set(0, 0, 42);
    camera.lookAt(0, -5, -20);
    let seed = 12345;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const background = createBackground({ camera, random });
    if (!await background.ready) throw new Error('Orrery load failed');
    scene.add(background.group);
    // Stars are a separate, permanently visible distant layer.
    const stars = background.group.getObjectByName('distant-stars');
    stars.visible = false;
    const machine = background.group.getObjectByName('blender-orrery');
    const root = machine.children[0];
    const routes = createOrreryPaths(root);
    const lightPoint = new THREE.Vector3(), pathPoint = new THREE.Vector3();
    let maxTrackDistance = 0, maxLightRadius = 0;
    const coverage = [], episodes = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const kinds = new Set();
    let uniforms;
    background.group.traverse(object => {
      if (object.isMesh) uniforms = object.material.userData.orreryUniforms;
    });
    const gl = renderer.getContext();
    const pixels = new Uint8Array(480 * 300 * 4);
    let peakPixels = 0, darkRun = 0, longestDarkRun = 0, waves = 0, lastActive = false;
    let darkImage, litImage, peakBrightness = 0;
    const failures = [];
    const cullingComparisons = [];
    for (let step = 0; step <= 700; step++) {
      background.update(step / 10, .1);
      background.group.updateWorldMatrix(true, true);
      routes.update();
      for (const [i, route] of machine.userData.lightRoutes.entries()) {
        const light = uniforms.uOrreryLights.value[i];
        lightPoint.set(light.x, light.y, light.z);
        let closest = Infinity;
        for (const path of routes.paths) {
          const t = path.closest(lightPoint);
          path.point(t, pathPoint);
          closest = Math.min(closest, pathPoint.distanceTo(lightPoint));
        }
        maxTrackDistance = Math.max(maxTrackDistance, closest);
        maxLightRadius = Math.max(maxLightRadius, light.w);
        minX = Math.min(minX, light.x); maxX = Math.max(maxX, light.x);
        minY = Math.min(minY, light.y); maxY = Math.max(maxY, light.y);
        kinds.add(route.kind);
      }
      if (step % 10) continue;
      const active = uniforms.uOrreryEnergy.value.some(energy => energy > 0);
      if (active && !lastActive) {
        waves++;
        episodes.push(machine.userData.lightEpisode);
      }
      if (active) coverage.push(machine.userData.lightEpisode.measuredCoverage);
      lastActive = active;
      renderer.render(scene, camera);
      gl.readPixels(0, 0, 480, 300, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      if (step === 20 || step === 90) {
        const masks = [], reference = new Uint8Array(pixels.length);
        root.traverse(mesh => { if (mesh.isMesh) { masks.push([mesh, mesh.layers.mask]); mesh.layers.enable(0); } });
        renderer.render(scene, camera);
        gl.readPixels(0, 0, 480, 300, gl.RGBA, gl.UNSIGNED_BYTE, reference);
        cullingComparisons.push(pixels.every((value, index) => value === reference[index]));
        masks.forEach(([mesh, mask]) => { mesh.layers.mask = mask; });
      }
      let visiblePixels = 0, brightness = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] || pixels[i + 1] || pixels[i + 2]) visiblePixels++;
        brightness += pixels[i] + pixels[i + 1] + pixels[i + 2];
      }
      if (!active) {
        if (visiblePixels !== 0) failures.push({ time: step / 10, visiblePixels });
        if (waves) longestDarkRun = Math.max(longestDarkRun, ++darkRun);
        if (!darkImage) darkImage = renderer.domElement.toDataURL('image/png');
      } else darkRun = 0;
      peakPixels = Math.max(peakPixels, visiblePixels);
      if (brightness > peakBrightness) {
        peakBrightness = brightness;
        litImage = renderer.domElement.toDataURL('image/png');
      }
    }
    // In the rear view the authored satellites stay visible, even between episodes.
    camera.position.set(0, 0, -42); camera.lookAt(0, -5, 0); camera.updateMatrixWorld();
    background.setEffectsEnabled(false); background.setEffectsEnabled(true);
    background.update(70, 0);
    uniforms.uOrreryEnergy.value.fill(0);
    renderer.render(scene, camera);
    gl.readPixels(0, 0, 480, 300, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let rearPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] || pixels[i + 1] || pixels[i + 2]) rearPixels++;
    const rearImage = renderer.domElement.toDataURL('image/png');
    // Returning to the front restores full darkness, without changing the assets.
    camera.position.set(0, 0, 42); camera.lookAt(0, -5, -20); camera.updateMatrixWorld();
    background.update(70, 0);
    uniforms.uOrreryEnergy.value.fill(0);
    renderer.render(scene, camera);
    gl.readPixels(0, 0, 480, 300, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let frontPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] || pixels[i + 1] || pixels[i + 2]) frontPixels++;
    // Confirm that sparse stars also render behind the dark machine.
    camera.far = 1800; camera.updateProjectionMatrix();
    background.group.getObjectByName('blender-orrery').visible = false;
    stars.visible = true;
    renderer.render(scene, camera);
    gl.readPixels(0, 0, 480, 300, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let starPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] || pixels[i + 1] || pixels[i + 2]) starPixels++;
    background.dispose();
    renderer.dispose(); renderer.forceContextLoss();
    return { failures, cullingComparisons, peakPixels, longestDarkRun, waves, darkImage, litImage, maxTrackDistance, maxLightRadius, kinds: [...kinds], starPixels, rearPixels, frontPixels, rearImage, coverage, episodes, travel: [maxX-minX, maxY-minY] };
  });
  assert.deepEqual(shaderErrors, [], 'PBR shaders must compile without errors');
  assert.deepEqual(result.failures, [], 'Without local light the complete Orrery must render zero visible pixels');
  assert(result.cullingComparisons.every(Boolean), 'Skipping unlit geometry must preserve every rendered pixel');
  assert(result.maxTrackDistance < 1.8, `Lights stay attached to the moving geometry: ${result.maxTrackDistance}`);
  assert(result.coverage.every(value => value >= .15 && value <= .21), `About 15–20% of the sampled visible structure is covered: ${Math.min(...result.coverage)}..${Math.max(...result.coverage)}`);
  assert(result.episodes.every(episode => episode.targetCoverage >= .15 && episode.targetCoverage <= .2));
  assert(new Set(result.episodes.map(episode => episode.routes.join('|'))).size === result.episodes.length, 'Every episode chooses different structures');
  assert(result.travel[0] > 10 && result.travel[1] > 10, 'Light travels horizontally and vertically');
  assert(result.rearPixels > 100, `Distant machines must render in the rear view: ${result.rearPixels}`);
  assert.equal(result.frontPixels, 0, 'Returning to the front restores full darkness between light episodes');
  assert(result.kinds.includes('ring') && result.kinds.includes('strut'), 'Light routes include rings and authored struts');
  assert(result.starPixels > 0 && result.starPixels < 350, `Stars must be sparse: ${result.starPixels}`);
  assert(result.peakPixels > 100, 'Passing illumination must reveal actual geometry');
  assert(result.longestDarkRun >= 10, 'Light episodes must be separated by fully dark pauses');
  assert(result.waves >= 2, 'Illumination must return after the dark pause');
  for (const state of ['dark', 'lit', 'rear']) {
    await writeFile(`${output}/orrery-${state}.png`, Buffer.from(result[`${state}Image`].split(',')[1], 'base64'));
  }
  console.log(`PASS Orrery lighting: zero visible pixels without light; ${result.waves} episodes, ${result.longestDarkRun}s dark pause, ${result.peakPixels} lit pixels, ${result.rearPixels} rear pixels, structural coverage ${(100*Math.min(...result.coverage)).toFixed(1)}–${(100*Math.max(...result.coverage)).toFixed(1)}%`);
  await page.close();
}
