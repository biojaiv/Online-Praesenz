import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Optional geometry detail for development; the inspection UI uses the supplied orrery-source.png.
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto(`${process.env.SITE_URL || 'http://127.0.0.1:5173'}/beispiel/`);
  const data = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { createBackground } = await import('/src/scene/background.js');
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(640, 220);
    renderer.setClearColor(0x03060d);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.38;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 640 / 220, .1, 300);
    camera.position.set(-7, 25, 12);
    camera.lookAt(-7, 6, -34);
    const background = createBackground();
    scene.add(background.group);
    if (!await background.ready) throw new Error('Background model failed to load');
    background.update(0, 1 / 60);
    background.setInspectionPoint(new THREE.Vector3(-7, 6, -34), 22);
    renderer.render(scene, camera);
    const result = renderer.domElement.toDataURL('image/webp', .92);
    background.dispose(); renderer.dispose(); renderer.forceContextLoss();
    return result;
  });
  const output = new URL('../../public/inspection/', import.meta.url);
  await mkdir(output, { recursive: true });
  await writeFile(new URL('background-detail.webp', output), Buffer.from(data.split(',')[1], 'base64'));
  console.log('Rendered public/inspection/background-detail.webp from Hintergrund.blend.');
} finally { await browser.close(); }
