/** Render the CV hologram (two pages per language) from hologram_content.mjs.
 *
 * Output: public/cv/CV_Projection_{DE,EN}.webp (1241 × 3786, two 1241 × 1893 pages)
 * and the section anchors in src/data/cvProjection.json. The page has no frame and a
 * flat dark ground: the 3D projection removes both and draws its own hologram frame.
 * Run: npm run build:cv-projection   (requires Playwright Chromium and ImageMagick)
 */
import { chromium } from 'playwright';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { hologramContent } from './hologram_content.mjs';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const PAGE = { width: 1241, height: 1893 };
const font = (family, weight, file) => `@font-face{font-family:'${family}';font-weight:${weight};src:url('file://${ROOT}/src/assets/fonts/${file}') format('woff2')}`;
const FONTS = [
  font('Barlow', 300, 'barlow-300-latin.woff2'), font('Barlow', 400, 'barlow-400-latin.woff2'), font('Barlow', 500, 'barlow-500-latin.woff2'),
  font('Barlow Condensed', 400, 'barlow-condensed-400-latin.woff2'), font('Barlow Condensed', 500, 'barlow-condensed-500-latin.woff2'),
  font('Barlow Condensed', 600, 'barlow-condensed-600-latin.woff2'),
].join('');

const esc = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

/** Line icons in the amber hologram style (24 × 24). */
const ICONS = {
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/><path d="M22 9v6"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  cube: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>',
  case: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18M11 12v2h2v-2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  fist: '<path d="M6 10V7a2 2 0 0 1 4 0v3M10 9V6a2 2 0 0 1 4 0v3M14 9V7a2 2 0 0 1 4 0v5c0 4-2.5 8-6.5 8S5 17 5 13.5V11a2 2 0 0 1 3-1.7"/>',
  book: '<path d="M3 5c3-1.5 6-1.5 9 1 3-2.5 6-2.5 9-1v14c-3-1.5-6-1.5-9 1-3-2.5-6-2.5-9-1z"/><path d="M12 6v14"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
};
const icon = (name, size = 34) => `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const heading = (name, title, anchor) => `<h2 class="heading"${anchor ? ` data-anchor="${anchor}"` : ''}>${icon(name)}<span>${esc(title)}</span><i></i></h2>`;
const timeline = (rows, tone = 'amber') => `<ol class="timeline timeline--${tone}">${rows.map(row => `<li>
  <span class="when">${esc(row.when)}</span><span class="node" aria-hidden="true"></span>
  <div class="what"><strong>${esc(row.title)}</strong><span>${esc(row.meta)}</span>${row.detail ? `<em>${esc(row.detail)}</em>` : ''}</div></li>`).join('')}</ol>`;

function markup(c) {
  const page1 = `<section class="page">
    <header class="masthead" data-anchor="uebersicht">
      <h1><span class="slash">./</span> Vladimir Leicht</h1>
      <p class="role">${esc(c.role)}</p><div class="rule"><i></i></div>
      <p class="status"><b></b>${c.status.map(esc).join('<span>·</span>')}</p>
      <p class="profile">${esc(c.profile)}</p>
      <p class="focus">${c.focus.map(esc).join('<span>·</span>')}</p>
      <p class="goal">${esc(c.goal)}</p>
    </header>
    ${heading('cap', c.sections.education, 'bildungsweg')}${timeline(c.education)}
    ${heading('code', c.sections.skills, 'faehigkeiten')}
    <div class="skills">${c.skills.map(([group, items]) => `<div><h3>${esc(group)}</h3><ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`).join('')}</div>
    <div class="closing">
      <div>${heading('star', c.sections.interests)}<ul class="icons">${c.interests.map(([name, label]) => `<li>${icon(name, 30)}<span>${esc(label)}</span></li>`).join('')}</ul></div>
      <div>${heading('user', c.sections.contact, 'kontakt')}<ul class="icons">${c.contact.map(([name, label]) => `<li>${icon(name, 30)}<span>${esc(label)}</span></li>`).join('')}</ul></div>
    </div>
  </section>`;
  const page2 = `<section class="page">
    ${heading('cube', c.sections.projects, 'projekte')}
    <div class="projects">${c.projects.map(p => `<article><div><strong>${esc(p.title)}</strong><span class="tag">${esc(p.tag)}</span></div><p>${esc(p.text)}</p></article>`).join('')}</div>
    ${heading('case', c.sections.work, 'arbeitsleben')}${timeline(c.work, 'blue')}
    ${heading('globe', c.sections.more)}${timeline(c.more, 'blue')}
  </section>`;
  return `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><style>${FONTS}${CSS}</style></head><body>${page1}${page2}</body></html>`;
}

const CSS = `
:root{--ground:#050b16;--ink:#e3edf6;--soft:#a9bccd;--muted:#7f94a8;--amber:#ee8a2e;--amber-soft:#f3b173;--blue:#6fb3e8;--line:#28496b}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--ground);width:${PAGE.width}px}
body{color:var(--ink);font:400 22px/1.45 Barlow,sans-serif;-webkit-font-smoothing:antialiased}
.page{position:relative;width:${PAGE.width}px;height:${PAGE.height}px;padding:118px 132px 90px;overflow:hidden}
.icon{flex:none;fill:none;stroke:var(--amber);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.masthead{text-align:center;margin-bottom:54px}
.masthead h1{font:600 92px/1 'Barlow Condensed',sans-serif;letter-spacing:.01em;color:#d6e9f8}
.masthead .slash{color:var(--amber);margin-right:6px}
.role{margin-top:18px;font:500 34px/1.1 'Barlow Condensed',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--amber)}
.rule{position:relative;width:520px;height:2px;margin:20px auto 22px;background:linear-gradient(90deg,transparent,var(--amber),transparent)}
.rule i{position:absolute;left:50%;top:50%;width:11px;height:11px;border-radius:50%;background:var(--amber);transform:translate(-50%,-50%);box-shadow:0 0 12px var(--amber)}
.status{display:flex;justify-content:center;align-items:center;gap:12px;font:500 19px/1 Barlow,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--soft)}
.status b{width:11px;height:11px;border-radius:50%;background:#77c8a2;box-shadow:0 0 10px #77c8a2}
.status span,.focus span{color:var(--line)}
.profile{max-width:880px;margin:34px auto 0;font:300 27px/1.5 Barlow,sans-serif;color:var(--ink)}
.focus{display:flex;justify-content:center;flex-wrap:wrap;gap:6px 14px;margin-top:20px;font:500 22px/1.3 Barlow,sans-serif;color:var(--blue)}
.goal{margin-top:14px;font:500 21px/1.3 'Barlow Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--amber-soft)}
.heading{display:flex;align-items:center;gap:16px;margin:0 0 28px;font:600 38px/1 'Barlow Condensed',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--amber)}
.heading i{flex:1;height:1px;margin-left:10px;background:linear-gradient(90deg,var(--line),transparent)}
.timeline{list-style:none;margin:0 0 56px}
.timeline li{position:relative;display:grid;grid-template-columns:210px 46px 1fr;align-items:start;padding-bottom:30px}
.timeline li:last-child{padding-bottom:0}
/* Stations stand as single points; no connecting lines between them. */
.when{padding-top:2px;text-align:right;padding-right:18px;font:500 27px/1.2 'Barlow Condensed',sans-serif;color:var(--amber);font-variant-numeric:tabular-nums}
.node{position:relative;width:24px;height:24px;margin:5px 0 0 1px;border:3px solid var(--amber);border-radius:50%;background:var(--ground);box-shadow:0 0 12px #ee8a2e99}
.node::after{content:'';position:absolute;inset:5px;border-radius:50%;background:var(--amber)}
.what strong{display:block;font:500 27px/1.25 Barlow,sans-serif;color:var(--ink)}
.what span{display:block;margin-top:4px;font:400 22px/1.4 Barlow,sans-serif;color:var(--soft)}
.what em{display:block;margin-top:6px;font:italic 400 22px/1.4 Barlow,sans-serif;color:#93a8bb}
.timeline--blue .when{color:#9fc9ec}
.timeline--blue .node{border-color:#6fb3e8;box-shadow:0 0 12px #6fb3e877}
.timeline--blue .node::after{background:#6fb3e8}
.skills{display:grid;grid-template-columns:1fr 1fr;gap:34px 54px}
.skills h3{margin-bottom:14px;padding-bottom:9px;border-bottom:1px solid var(--line);font:600 23px/1.1 'Barlow Condensed',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--amber-soft)}
.skills ul{display:flex;flex-wrap:wrap;gap:10px;list-style:none}
.skills li{padding:6px 13px 5px;border:1px solid #2f5579;background:#0b1a2c;font:400 21px/1.3 Barlow,sans-serif;color:var(--ink)}
.projects{display:grid;gap:22px;margin-bottom:64px}
.projects article{padding:20px 24px 22px;border:1px solid #294b6c;border-left:3px solid var(--amber);background:linear-gradient(90deg,#0d1d31,#07111f)}
.projects article>div{display:flex;align-items:baseline;justify-content:space-between;gap:20px}
.projects strong{font:500 27px/1.25 Barlow,sans-serif;color:var(--ink)}
.projects .tag{flex:none;padding:4px 10px 3px;border:1px solid #ee8a2e88;font:600 17px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--amber-soft)}
.projects p{margin-top:8px;font:400 21px/1.45 Barlow,sans-serif;color:var(--soft)}
.closing{display:grid;grid-template-columns:1fr 1fr;gap:56px;margin-top:34px}
.closing .heading{font-size:32px;margin-bottom:22px}
.icons{list-style:none;display:grid;gap:16px}
.icons li{display:flex;align-items:center;gap:18px;font:400 23px/1.3 Barlow,sans-serif;color:var(--ink)}
.icons .icon{stroke:#9fc9ec}
`;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const temp = await mkdtemp(join(tmpdir(), 'cv-hologram-'));
const projection = JSON.parse(await readFile(join(ROOT, 'src/data/cvProjection.json'), 'utf8'));
try {
  for (const [language, content] of Object.entries(hologramContent)) {
    const page = await browser.newPage({ viewport: { width: PAGE.width, height: PAGE.height * 2 }, deviceScaleFactor: 1 });
    const html = join(temp, `cv-${language}.html`);
    await writeFile(html, markup(content));
    await page.goto(`file://${html}`);
    await page.evaluate(() => document.fonts.ready);
    // Every page must hold its content; overflow would be cut in the projection.
    const overflow = await page.evaluate(() => [...document.querySelectorAll('.page')].map(p => p.scrollHeight - p.clientHeight));
    if (overflow.some(value => value > 0)) throw new Error(`${language}: page content overflows by ${overflow.join(' / ')} px`);
    const anchors = await page.evaluate(total => Object.fromEntries([...document.querySelectorAll('[data-anchor]')]
      .map(node => [node.dataset.anchor, Math.max(0, Math.round((node.getBoundingClientRect().top - 40) / total * 1000) / 1000)])), PAGE.height * 2);
    const png = join(temp, `cv-${language}.png`);
    await page.screenshot({ path: png, fullPage: true });
    execFileSync('magick', [png, '-quality', '92', '-define', 'webp:method=6', join(ROOT, `public/cv/CV_Projection_${language.toUpperCase()}.webp`)]);
    projection[language] = { pageCount: 2, pageAspect: PAGE.width / PAGE.height, webTransform: false, anchors };
    console.log(`CV_Projection_${language.toUpperCase()}.webp`, JSON.stringify(anchors));
    await page.close();
  }
  await writeFile(join(ROOT, 'src/data/cvProjection.json'), JSON.stringify(projection, null, 2) + '\n');
} finally {
  await browser.close();
  await rm(temp, { recursive: true, force: true });
}
