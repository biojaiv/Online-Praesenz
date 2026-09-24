import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { PROJECTS, getProjectUrl } from '../../src/data/projects.js';
import { getProjectionViewport } from '../../src/ui/projectionViewport.js';

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
        await page.goto(new URL(getProjectUrl(project, language, true), base).href);
        await page.locator('h1').waitFor();
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(image => image.decode()));
          scrollTo(0, 0);
        });
        const target = project.preview(language, viewport.width <= 580);
        await page.screenshot({ path: fileURLToPath(new URL(`../../public${target}`, import.meta.url)), type: 'jpeg', quality: 90 });
        console.log(`Captured ${target} (${viewport.width} × ${viewport.height})`);
      }
    }
    await page.close();
  }
} finally { await browser.close(); }
