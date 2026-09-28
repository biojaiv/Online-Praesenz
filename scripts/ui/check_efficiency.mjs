import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.SITE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  let workers = 0;
  page.on('worker', () => workers++);
  await page.route('**/__pixel-check', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Pixel check</title>' }));
  await page.goto(base + '/__pixel-check');
  const results = await page.evaluate(async () => {
    const { prepareProjection, chooseRasterSize } = await import('/src/scene/projectionRaster.js');
    const { processProjection } = await import('/src/scene/projectionProcessing.js');
    const { default: cv } = await import('/src/data/cvProjection.json');
    const results = [];
    for (const documentKey of ['lebenslauf', 'abschluss']) for (const language of ['de', 'en']) {
      const source = documentKey === 'lebenslauf'
        ? { ...cv[language], url: `/cv/CV_Projection_${language.toUpperCase()}.webp` }
        : { pageCount: 6, webTransform: false, url: `/ihk/IHK_Projection_${language.toUpperCase()}.webp` };
      const image = new Image(); image.src = source.url; await image.decode();
      const size = chooseRasterSize(image.naturalWidth, image.naturalHeight, 8192, false);
      const old = prepareProjection(image, size, source, documentKey);
      const next = await processProjection(image, size, source, documentKey);
      const a = old.getContext('2d').getImageData(0, 0, size.width, size.height).data;
      const b = next.getContext('2d').getImageData(0, 0, size.width, size.height).data;
      let different = 0, maxDelta = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { different++; maxDelta = Math.max(maxDelta, Math.abs(a[i] - b[i])); }
      results.push({ documentKey, language, different, maxDelta });
    }
    return results;
  });
  for (const result of results) assert.equal(result.different, 0, JSON.stringify(result));
  assert(workers > 0, 'The worker path must be exercised, not just its fallback');
  console.log('PASS: worker and original canvas pipeline are pixel-identical for CV/IHK in DE/EN.');
  for (const path of ['/', '/beispiel/', '/systemintegration/']) {
    const html = await (await page.request.get(base + path)).text();
    assert(html.includes(`rel="canonical" href="https://vladimir-leicht.com${path}"`));
    assert.equal((html.match(/<title>/g) || []).length, 1);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema.url, 'https://vladimir-leicht.com' + path);
  }
  console.log('PASS: static canonical URLs, unique titles and valid JSON-LD on all three public pages.');
  await page.evaluate(() => { window.Worker = undefined; });
  const fallback = await page.evaluate(async () => {
    const { processProjection } = await import('/src/scene/projectionProcessing.js');
    const image = new Image(); image.src = '/ihk/IHK_Projection_EN.webp'; await image.decode();
    const canvas = await processProjection(image, { width: 223, height: 2042 }, { pageCount: 6, webTransform: false }, 'abschluss');
    return [canvas.width, canvas.height];
  });
  assert.deepEqual(fallback, [223, 2042]);
  console.log('PASS: older-browser document fallback.');
} finally { await browser.close(); }
