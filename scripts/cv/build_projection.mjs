/** Render the real reader component; no second CV layout or copy is maintained. */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const base = process.env.CV_RENDER_URL || 'http://127.0.0.1:5173';
const output = process.env.CV_RENDER_OUTPUT || '/tmp/cv-reader-projection';
await mkdir(output, { recursive: true });
await mkdir('public/cv', { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
const manifest = {};
const fontLink = (await readFile('index.html', 'utf8')).match(/<link href="https:\/\/fonts.googleapis.com[^>]+>/)?.[0] || '';
try {
  for (const language of ['de', 'en']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
    await page.goto(`${base}/beispiel/?lang=${language}`);
    await page.evaluate(async ({ language, fontLink }) => {
      document.querySelectorAll('style,link[rel="stylesheet"]').forEach(el => el.remove());
      document.head.insertAdjacentHTML('beforeend', fontLink);
      await import('/src/style.css');
      await import('/src/harmony.css');
      const { setLanguage } = await import('/src/i18n.js');
      const { createReader } = await import('/src/ui/reader.js');
      setLanguage(language);
      document.body.innerHTML = '<button data-target="lebenslauf"></button><div id="controls"></div><main id="render"></main>';
      window.reader = createReader({ container: document.getElementById('render') });
      window.reader.setRoute('lebenslauf');
      window.reader.element.hidden = false;
      window.sections = [...document.querySelectorAll('.cv-hologram__body > section')].map(el => el.cloneNode(true));
    }, { language, fontLink });
    await page.addStyleTag({ content: `
      html,body { width:1440px; height:1100px; background:transparent; padding:0; overflow:visible; }
      #controls, body > button { display:none; }
      .cv-reader { position:static; display:block; background:none; }
      .cv-hologram { width:629px; height:960px; max-width:none; background:transparent; box-shadow:none; }
      .cv-hologram__body { overflow:hidden; }
      .cv-hologram__header { opacity:1; }
      .cv-hologram__footer { font-size:10px; }
      .cv-hologram__actions { display:none; }
    ` });
    await page.evaluate(() => document.fonts.ready);
    const pages = await page.evaluate(() => {
      const body = document.querySelector('.cv-hologram__body');
      const pages = [];
      for (const original of window.sections) {
        const section = original.cloneNode(true);
        const list = section.querySelector('.cv-timeline');
        const items = list ? [...list.children] : [];
        if (!list) { body.replaceChildren(section); pages.push({ id: section.id, html: section.outerHTML }); continue; }
        list.replaceChildren();
        body.replaceChildren(section);
        for (const item of items) {
          list.append(item);
          if (body.scrollHeight > body.clientHeight + 1 && list.children.length > 1) {
            item.remove();
            pages.push({ id: section.id, html: section.outerHTML });
            list.replaceChildren(item);
          }
        }
        pages.push({ id: section.id, html: section.outerHTML });
      }
      return pages;
    });
    const anchors = {};
    const ids = { 'cv-overview': 'uebersicht', 'cv-skills': 'faehigkeiten', 'cv-education': 'bildungsweg', 'cv-work': 'arbeitsleben', 'cv-contact': 'kontakt' };
    for (let index = 0; index < pages.length; index++) {
      anchors[ids[pages[index].id]] ??= index / pages.length;
      const fits = await page.evaluate(({ entry, index, count }) => {
        const body = document.querySelector('.cv-hologram__body');
        body.innerHTML = entry.html;
        for (const tab of document.querySelectorAll('[data-cv-target]')) {
          const key = tab.dataset.cvTarget.split('/')[1];
          const activeId = { faehigkeiten: 'cv-skills', bildungsweg: 'cv-education', arbeitsleben: 'cv-work', kontakt: 'cv-contact' }[key] || 'cv-overview';
          tab.classList.toggle('is-active', activeId === entry.id);
        }
        document.querySelector('.cv-hologram__footer > span').textContent = `VL // CURRICULUM VITÆ — ${index + 1} / ${count}`;
        return body.scrollHeight <= body.clientHeight + 1 && body.scrollWidth <= body.clientWidth + 1;
      }, { entry: pages[index], index, count: pages.length });
      assert(fits, `${language} page ${index + 1} overflows`);
      await page.locator('.cv-hologram').screenshot({ path: `${output}/${language}-${index}.png`, omitBackground: true });
    }
    const python = process.env.CV_PYTHON || 'python3';
    const result = spawnSync(python, ['-c', `from PIL import Image
images=[Image.open('${output}/${language}-%d.png'%i).convert('RGBA') for i in range(${pages.length})]
combined=Image.new('RGBA',(1258,1920*len(images)))
for i,image in enumerate(images): combined.paste(image,(0,i*1920))
combined.save('public/cv/CV_Projection_${language.toUpperCase()}.webp',quality=94,method=6)
`], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    manifest[language] = { pageCount: pages.length, pageAspect: 1258 / 1920, anchors };
    await page.close();
  }
  await writeFile('src/data/cvProjection.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log(manifest);
} finally { await browser.close(); }
