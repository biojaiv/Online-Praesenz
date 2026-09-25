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
const hologramOnly = process.argv.includes('--hologram-only');
try {
  for (const language of ['de', 'en']) {
    const source = await readFile(`Elemente/lebenslauf${language === 'en' ? '.en' : ''}.svg`, 'utf8');
    const page = await browser.newPage({ viewport: { width: 1258, height: 3840 } });
    const dimensions = await page.evaluate(({source,language,hologramOnly}) => {
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
      if (hologramOnly) {
        const live = document.querySelector('svg');
        const overlay = document.createElementNS(ns, 'g');
        overlay.setAttribute('transform', `scale(${width/1258} ${height/3840})`);
        // Remove only the decorative perimeter, retaining all document text.
        const mask = document.createElementNS(ns, 'clipPath'); mask.id='hologram-content';
        for(let page=0;page<2;page++){
          const rect=document.createElementNS(ns,'rect');
          for(const [key,value] of Object.entries({x:width*.042,y:page*height/2+height/2*.016,width:width*.916,height:height/2*.98}))rect.setAttribute(key,value);
          mask.append(rect);
        }
        live.querySelector('defs').append(mask);
        const content=document.createElementNS(ns,'g');
        const original=live.querySelector('g');original.replaceWith(content);content.append(original);content.setAttribute('clip-path','url(#hologram-content)');
        const erase=document.createElementNS(ns,'mask');erase.id='centred-heading-mask';erase.setAttribute('maskUnits','userSpaceOnUse');
        for(const [key,value] of Object.entries({x:0,y:0,width,height}))erase.setAttribute(key,value);
        const white=document.createElementNS(ns,'rect');for(const [key,value] of Object.entries({width,height,fill:'white'}))white.setAttribute(key,value);erase.append(white);
        live.querySelector('defs').append(erase);content.setAttribute('mask','url(#centred-heading-mask)');
        const headings = [
          [50,30,1158,165,629,143,66,'Vladimir Leicht','Vladimir Leicht'],
          [60,707,1138,82,629,763,36,'BILDUNGSWEG','EDUCATION & TRAINING'],
          [400,928,785,54,797,972,29,'Praxisphase','Practical Experience'],
          [60,1358,595,72,355,1414,34,'FÄHIGKEITEN','SKILLS'],
          [713,1358,485,72,949,1414,34,'INTERESSEN','INTERESTS'],
          [60,1440,595,38,355,1471,20,'SYSTEME & INFRASTRUKTUR','SYSTEMS & INFRASTRUCTURE'],
          [60,1551,595,40,355,1584,20,'ENDPOINT-MANAGEMENT & MONITORING','ENDPOINT MANAGEMENT & MONITORING'],
          [60,1638,595,42,355,1672,20,'AUTOMATISIERUNG & ENTWICKLUNG','AUTOMATION & DEVELOPMENT'],
          [60,1756,595,43,355,1792,20,'DOKUMENTATION & SPRACHEN','DOCUMENTATION & LANGUAGES'],
          [713,1630,485,58,949,1674,27,'PERSÖNLICHE INFORMATIONEN','PERSONAL INFORMATION'],
          [60,1980,1138,104,629,2058,36,'ARBEITSLEBEN','PROFESSIONAL EXPERIENCE'],
          [60,3340,1138,83,629,3400,34,'ZIVILDIENST','CIVILIAN SERVICE'],
          [60,3555,1138,84,629,3614,34,'AUSLANDSERFAHRUNG','INTERNATIONAL EXPERIENCE'],
        ];
        for(const [x,y,w,h,cx,baseline,size,de,en] of headings){
          const rect=document.createElementNS(ns,'rect');for(const [key,value] of Object.entries({x,y,width:w,height:h,fill:'black'}))rect.setAttribute(key,value);rect.setAttribute('transform',`scale(${width/1258} ${height/3840})`);erase.append(rect);
          const text=document.createElementNS(ns,'text');for(const [key,value] of Object.entries({x:cx,y:baseline,fill:baseline===143?'#d4e8f8':'#e77d1a','font-family':'Projection Heading, sans-serif','font-size':size,'font-weight':600,'text-anchor':'middle'}))text.setAttribute(key,value);
          text.textContent=language==='de'?de:en;overlay.append(text);
        }
        live.append(overlay);
      }

      return { width, height, portrait: { x, y, w, h } };
    }, {source,language,hologramOnly});
    await page.setViewportSize({ width: dimensions.width, height: dimensions.height });
    if(hologramOnly){const font=await readFile('public/knallblau/fonts/barlow-condensed-700.woff2');await page.addStyleTag({content:`@font-face{font-family:'Projection Heading';font-weight:600;src:url(data:font/woff2;base64,${font.toString('base64')})}`});}
    await page.evaluate(async () => { await Promise.all([...document.querySelectorAll('image')].map(el => { const image = new Image(); image.src = el.href.baseVal; return image.decode(); })); await document.fonts.ready; });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/${language}.png`, omitBackground: true, fullPage: true });
    if(hologramOnly){
      const result=spawnSync(process.env.CV_PYTHON || 'python3',['-c', 'from PIL import Image;import sys;Image.open(sys.argv[1]).save(sys.argv[2],quality=95,method=6)',`${output}/${language}.png`,`public/cv/CV_Hologram_${language.toUpperCase()}.webp`],{encoding:'utf8'});
      assert.equal(result.status,0,result.stderr);await page.close();console.log(`${language}: centred hologram headings, decorative perimeter removed`);continue;
    }
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
  if(!hologramOnly) await writeFile('src/data/cvProjection.json', JSON.stringify(manifest, null, 2) + '\n');
} finally { await browser.close(); }
