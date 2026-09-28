import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const temp=await mkdtemp(join(tmpdir(),'creative-previews-'));
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
await mkdir('public/creative',{recursive:true});
try{
 for(const project of ['resonanz','palimpsest'])for(const language of ['de','en'])for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1414,height:820},deviceScaleFactor:1,reducedMotion:'reduce',isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(`${base}/beispiele/${project}/?lang=${language}&preview=1`);
  await page.waitForFunction(()=>document.documentElement.dataset.creativeReady==='true');
  await page.waitForTimeout(450);
  if(errors.length)throw new Error(errors.join('\n'));
  const name=`${project}-${mobile?'mobile':'desktop'}-${language}`;
  const png=join(temp,name+'.png');await page.screenshot({path:png});
  execFileSync('magick',[png,'-quality','90',`public/creative/${name}.webp`]);
  console.log(name);await page.close();
 }
}finally{await browser.close();await rm(temp,{recursive:true,force:true});}
