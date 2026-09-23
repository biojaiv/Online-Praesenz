import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Run against `npm run dev`: render the existing procedural background once.
// No extra WebGL context or animation loop is needed by the published inspection.
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage();
  await page.goto(`${process.env.SITE_URL || 'http://127.0.0.1:5176'}/beispiel/`);
  const data = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { createOrreryMachine } = await import('/src/scene/orreryMachine.js');
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(640, 220);
    renderer.setClearColor(0x03060d);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 640 / 220, .1, 300);
    camera.position.set(0, 22, 18);
    camera.lookAt(-7, 6, -34);
    const machine = createOrreryMachine({ renderer });
    scene.add(machine.group);
    for (let tick = 0; tick <= 270; tick++) machine.update(tick / 60, 1 / 60);
    // Frame the lit sector, rather than the whole mechanism's dark centre.
    let lighting;
    machine.group.traverse(object => { if (object.material?.uniforms?.uWaveDir) lighting = object.material.uniforms; });
    const detail = lighting.uCore.value.clone().addScaledVector(lighting.uWaveDir.value, lighting.uWaveRadius.value);
    camera.position.copy(detail).add(new THREE.Vector3(0, 12, 28));
    camera.lookAt(detail);
    renderer.render(scene, camera);
    const result = renderer.domElement.toDataURL('image/webp', .9);
    machine.dispose(); renderer.dispose(); renderer.forceContextLoss();
    return result;
  });
  const output = new URL('../../public/inspection/', import.meta.url);
  await mkdir(output, { recursive: true });
  await writeFile(new URL('orrery-detail.webp', output), Buffer.from(data.split(',')[1], 'base64'));
  console.log('Rendered public/inspection/orrery-detail.webp from the existing Orrery geometry and lighting.');
} finally { await browser.close(); }
