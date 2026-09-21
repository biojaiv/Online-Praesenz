/** Render the reviewed website copy as five transparent hologram pages per language.
 * Intermediate PNGs stay outside the repo. No running website is needed.
 * Uses the site's own fonts; no runtime PDF requests or conversions are needed.
 */
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { ihkMessages } from '../../src/data/ihk.messages.js';
import { ihkIcon, IHK_SECTION_ICONS } from '../../src/ui/ihkIcons.js';
const temporary = process.env.IHK_RENDER_OUTPUT || '/tmp/ihk-projection-render';
await mkdir(temporary, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const fontLink = html.match(/<link href="https:\/\/fonts.googleapis.com[^>]+>/)[0];
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
try {
  for (const language of ['de', 'en']) {
    const t = (key) => escape(ihkMessages[language][`ihk.${key}`]);
    const page = await browser.newPage({ viewport: { width: 1258, height: 1920 }, deviceScaleFactor: 1 });
    const sections = ['overview', 'server', 'uem', 'clients', 'migration'];
    const pages = sections.map((section, index) => `<section class="sheet">
      <header><span>VL // IHK</span><span>${t('kicker')}</span></header>
      <p class="kicker">${t('scope')}</p>
      <h1>${t(section === 'overview' ? 'title' : `${section}.title`)}</h1>
      ${section === 'overview' ? `
        <p class="subtitle">${t('subtitle')}</p>
        <p>${t('description')}</p>
        <div class="facts">${[['40 h', 'time', 'clock'], ['4', 'clientsMetric', 'clients'], ['100 %', 'success', 'check'], ['Windows 11', 'deployment', 'network']].map(([value, key, icon]) => `<div>${ihkIcon(icon)}<strong>${value}</strong><small>${t(key)}</small></div>`).join('')}</div>
        <h2 class="symbol-heading">${ihkIcon('migration')}${t('areas')}</h2>
        <div class="areas">${sections.slice(1).map((key) => `<div>${ihkIcon(key)}<div><h3>${t(key)}</h3><p>${t(`${key}.summary`)}</p></div></div>`).join('')}</div>
        <p class="result">${t('result')}</p>
        <h2 class="symbol-heading">${ihkIcon('tools')}${t('technologies')}</h2><p class="signature">VMware vSphere · Windows Server 2022 · Active Directory · MSSQL · baramundi · DIP · PXE · TFTP · WinPE · Windows ADK · DISM · bDeploy · TLS · VLAN · DHCP</p>
        ` : `<p class="subtitle">${t(`${section}.lead`)}</p>
        <ol>${['a', 'b', 'c'].map((part, i) => `<li>${ihkIcon(IHK_SECTION_ICONS[section][i])}<div><h2>${t(`${section}.${part}.title`)}</h2><p>${t(`${section}.${part}.text`)}</p></div></li>`).join('')}</ol>`}
      <footer><span>${t(section)}</span><span>0${index + 1} / 05</span></footer>
    </section>`).join('');
    await page.setContent(`<html lang="${language}"><head>${fontLink}<style>
      *{box-sizing:border-box}html,body{margin:0;background:transparent;color:#cde1eb;font-family:Barlow,sans-serif}
      .sheet{width:1258px;height:1920px;padding:100px 94px 120px;position:relative;background:transparent;border:2px solid #456a8455;border-radius:26px;overflow:hidden}
      header,footer{display:flex;justify-content:space-between;color:#6f95ac;font:400 23px 'Barlow Condensed',sans-serif;letter-spacing:5px;text-transform:uppercase}
      header{padding-bottom:28px;border-bottom:1px solid #52769066;margin-bottom:38px}footer{position:absolute;bottom:48px;left:94px;right:94px;border-top:1px solid #52769066;padding-top:22px}
      .kicker{color:#e5a05c;font:500 25px 'Barlow Condensed',sans-serif;letter-spacing:5px;text-transform:uppercase;margin:0 0 16px}
      h1{color:#edfaff;font:500 65px/1.04 'Barlow Condensed',sans-serif;letter-spacing:2px;margin:0 0 25px;text-transform:uppercase}
      h2{color:#e5a05c;font:500 38px/1.2 'Barlow Condensed',sans-serif;margin:0 0 18px}
      .ihk-icon{width:54px;height:54px;flex:0 0 54px;color:#e5a05c}.symbol-heading{display:flex;align-items:center;gap:25px}
      .areas{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin:28px 0 38px}.areas>div{display:flex;gap:25px}.areas h3{color:#e5a05c;font:500 35px 'Barlow Condensed',sans-serif;text-transform:uppercase;margin:0 0 10px}.areas p{font-size:28px;line-height:1.4;margin:0}
      p{font:400 30px/1.5 Barlow,sans-serif;margin:0 0 24px}.subtitle{color:#9fc2d5;font-size:32px;margin-bottom:36px}
      .facts{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin:36px 0 44px}.facts .ihk-icon{margin-bottom:14px}.facts strong{display:block;color:#e5a05c;font:500 47px 'Barlow Condensed',sans-serif}.facts small{display:block;color:#9fc2d5;font-size:23px;line-height:1.4;margin-top:12px}
      .result{border-left:2px solid #e5a05c;padding-left:25px;font-size:28px}.signature{color:#e5a05c;font-size:26px;line-height:1.6}
      ol{list-style:none;padding:0;margin-top:65px;position:relative}ol:before{content:'';position:absolute;left:8px;top:0;bottom:30px;width:2px;background:linear-gradient(transparent,#e5a05c,transparent)}
      li{position:relative;display:grid;grid-template-columns:85px 1fr;gap:20px;padding:38px 0 38px 42px;border-top:1px solid #456a8444}li:before{content:'';position:absolute;left:0;top:47px;width:18px;height:18px;border:3px solid #e5a05c;border-radius:50%;box-shadow:0 0 18px #e5a05c88}
      .number{color:#e5a05c;font:400 34px 'Barlow Condensed',sans-serif}li p{font-size:34px;line-height:1.6;margin-bottom:0}
    </style></head><body>${pages}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    assert(await page.evaluate(() => document.fonts.check('30px Barlow') && document.fonts.check('65px "Barlow Condensed"')), 'Site fonts must be available');
    const overflow = await page.locator('.sheet').evaluateAll((sheets) => sheets.map((sheet) => {
      const footer = sheet.querySelector('footer').getBoundingClientRect();
      const last = sheet.querySelector('footer').previousElementSibling.getBoundingClientRect();
      return last.bottom > footer.top - 15;
    }));
    assert(overflow.every((value) => !value), `${language}: page text extends into footer: ${overflow}`);
    const png = `${temporary}/${language}.png`;
    await page.screenshot({ path: png, fullPage: true, omitBackground: true });
    const target = new URL(`../../public/ihk/IHK_Projection_${language.toUpperCase()}.webp`, import.meta.url).pathname;
    const conversion = spawnSync('python', ['-c', 'from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.argv[2], "WEBP", quality=94, method=6)', png, target], { encoding: 'utf8' });
    assert.equal(conversion.status, 0, conversion.stderr);
    console.log(`${language}: five transparent projection pages → ${target}`);
    await page.close();
  }
} finally { await browser.close(); }
