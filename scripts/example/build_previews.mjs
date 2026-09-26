import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { PROJECTS, getProjectUrl } from '../../src/data/projects.js';
import { getProjectionViewport } from '../../src/ui/projectionViewport.js';

const sharp = await import('sharp').then(module => module.default, () => null);

// Capture the real first viewport, using the same entry URL and dimensions as
// the gallery and projector. Run against Vite after changing the example page.
const base = process.env.EXAMPLE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const viewport = getProjectionViewport(width, height);
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    for (const language of ['de', 'en']) {
      for (const project of PROJECTS) {
        // Tiefgang must show the scroll view most visitors get, not its reading view.
        const live = project.id === 'systems';
        await page.emulateMedia({ reducedMotion: live ? 'no-preference' : 'reduce' });
        await page.goto(new URL(getProjectUrl(project, language, true), base).href);
        await page.locator('h1').waitFor();
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(image => image.decode()));
          scrollTo(0, 0);
        });
        if (live) await page.waitForTimeout(900);
        const target = project.preview(language, viewport.width <= 580);
        const path = fileURLToPath(new URL(`../../public${target}`, import.meta.url));
        // Chromium subsamples JPEG colour, which blurs the thin orange strokes.
        if (live && sharp) await sharp(await page.screenshot({ type: 'png' })).jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true }).toFile(path);
        else await page.screenshot({ path, type: 'jpeg', quality: 90 });
        console.log(`Captured ${target} (${viewport.width} × ${viewport.height})`);
      }
    }
    await page.close();
  }
} finally { await browser.close(); }
