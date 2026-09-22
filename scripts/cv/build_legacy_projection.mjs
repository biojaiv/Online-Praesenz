/** Restore the original two-page SVG layout, excluding portrait and birth date.
 * Originals remain read-only. A clip in document coordinates removes only the
 * specified panels; compact WebP previews and cleaned PDF/DOCX downloads are local.
 */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const output = process.env.CV_RENDER_OUTPUT || '/tmp/cv-legacy-without-portrait';
await mkdir(output, { recursive: true });
await mkdir('public/cv', { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
const manifest = {};
try {
  for (const language of ['de', 'en']) {
    const source = await readFile(`Elemente/lebenslauf${language === 'en' ? '.en' : ''}.svg`, 'utf8');
    const page = await browser.newPage({ viewport: { width: 1258, height: 3840 } });
    const dimensions = await page.evaluate(source => {
      const xml = new DOMParser().parseFromString(source, 'image/svg+xml');
      const svg = xml.documentElement;
      const width = Number(svg.getAttribute('width')), height = Number(svg.getAttribute('height'));
      const ns = 'http://www.w3.org/2000/svg';
      const group = document.createElementNS(ns, 'g');
      while (svg.firstChild) group.append(svg.firstChild);
      svg.append(group);
      const defs = document.createElementNS(ns, 'defs');
      const clip = document.createElementNS(ns, 'clipPath'); clip.id = 'without-portrait';
      const path = document.createElementNS(ns, 'path');
      // The left edge stays beyond the last letters of the German focus text.
      const x = width * .787, y = height / 2 * .153, w = width * .16, h = height / 2 * .126;
      const bx = width * .551, by = height / 2 * .887, bw = width * .40, bh = height / 2 * .038;
      path.setAttribute('d', `M0 0H${width}V${height}H0Z M${x} ${y}v${h}h${w}v-${h}Z M${bx} ${by}v${bh}h${bw}v-${bh}Z`);
      path.setAttribute('clip-rule', 'evenodd');
      clip.append(path); defs.append(clip); svg.prepend(defs);
      group.setAttribute('clip-path', 'url(#without-portrait)');
      document.documentElement.style.background = '#03060d';
      document.body.style.cssText = 'margin:0;background:transparent';
      document.body.replaceChildren(document.importNode(svg, true));
      return { width, height, portrait: { x, y, w, h } };
    }, source);
    await page.setViewportSize({ width: dimensions.width, height: dimensions.height });
    await page.evaluate(async () => { await Promise.all([...document.querySelectorAll('image')].map(el => { const image = new Image(); image.src = el.href.baseVal; return image.decode(); })); await document.fonts.ready; });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/${language}.png`, omitBackground: true, fullPage: true });
    const python = process.env.CV_PYTHON || 'python3';
    const result = spawnSync(python, ['-c', `from PIL import Image
import pymupdf,sys,json
path,lang,meta=sys.argv[1:]; size=json.loads(meta)
im=Image.open(path).convert('RGBA')
# A document clip leaves the excluded portrait panel empty, not another photo.
box=size['portrait']; crop=im.crop((int(box['x'])+2,int(box['y'])+2,int(box['x']+box['w'])-2,int(box['y']+box['h'])-2))
assert not any(r>40 and r>g*1.15 and g>b*1.1 for r,g,b,a in crop.getdata()), 'Portrait pixels survived'
im.save('public/cv/CV_Projection_'+lang+'.webp',quality=95,method=6)
doc=pymupdf.open()
for index in range(2):
 part=im.crop((0,index*im.height//2,im.width,(index+1)*im.height//2)).convert('RGB')
 import io
 buffer=io.BytesIO();part.save(buffer,format='PNG')
 p=doc.new_page(width=595.276,height=595.276*part.height/part.width)
 p.insert_image(p.rect,stream=buffer.getvalue())
doc.save('public/cv/CV_'+lang+'.pdf',garbage=4,deflate=True)
from docx import Document
import re
source='Lebenslauf/Lebenslauf_Vladimir_Leicht_'+('Lesefassung' if lang=='DE' else 'Reading_Version_EN')+'.docx'
reader=Document(source)
for paragraph in list(reader.element.body.xpath('.//w:p')):
 text=''.join(paragraph.itertext())
 if re.search(r'Geburtsdatum|Date of [Bb]irth|06[.]03[.]1985|6 March 1985', text):
  parent=paragraph.getparent()
  if parent is not None: parent.remove(paragraph)
reader.save('public/cv/CV_Reader_'+lang+'.docx')

`, `${output}/${language}.png`, language.toUpperCase(), JSON.stringify(dimensions)], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    manifest[language] = { pageCount: 2, pageAspect: dimensions.width / (dimensions.height / 2), webTransform: language === 'de', anchors: language === 'de' ? { uebersicht: 0, bildungsweg: .185, faehigkeiten: .355, kontakt: .415, arbeitsleben: .525 } : { uebersicht: 0, bildungsweg: .184, faehigkeiten: .354, kontakt: .417, arbeitsleben: .514 } };
    await page.close();
    console.log(`${language}: original layout without portrait/birth date, WebP + PDF + DOCX`);
  }
  await writeFile('src/data/cvProjection.json', JSON.stringify(manifest, null, 2) + '\n');
} finally { await browser.close(); }
