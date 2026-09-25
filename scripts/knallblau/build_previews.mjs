import { chromium } from 'playwright';
import { projects, base } from '../../src/knallblau/content.js';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const origin=process.env.KNALLBLAU_URL||'http://127.0.0.1:5176';
const output=process.env.KNALLBLAU_RENDER_OUTPUT||'/tmp/knallblau-previews';await mkdir(output,{recursive:true});
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try {
 for(const lang of ['de','en'])for(const p of projects)for(const mobile of [false,true]) {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1200,height:800},reducedMotion:'reduce'});
  await page.goto(`${origin}${base(lang)}demo/${p.id}/?lang=${lang}`);await page.evaluate(()=>document.fonts.ready);
  await page.locator('.demo-hero img').evaluate(img=>img.decode());
  const file=`${p.id}-${mobile?'mobile':'desktop'}-${lang}`;await page.screenshot({path:`${output}/${file}.png`});
  const result=spawnSync(process.env.CV_PYTHON||'python3',['-c','from PIL import Image;import sys;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],quality=86,method=6)',`${output}/${file}.png`,`public/knallblau/${file}.webp`],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1200,height:800},reducedMotion:'reduce'});
 await page.goto(`${origin}${base('de')}?lang=de&motion=off`);await page.evaluate(()=>document.fonts.ready);await page.locator('.logo img').evaluate(img=>img.decode());
 await page.screenshot({path:`${output}/preview.png`});
 const result=spawnSync(process.env.CV_PYTHON||'python3',['-c','from PIL import Image;import sys;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],quality=88,method=6)',`${output}/preview.png`,'public/knallblau/preview.webp'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 console.log('Generated 12 real demo screenshots and the Knallblau gallery preview.');
} finally {await browser.close();}
