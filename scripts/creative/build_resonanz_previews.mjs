import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const temp=await mkdtemp(join(tmpdir(),'resonanz-previews-'));
await mkdir('public/resonanz',{recursive:true});
try{
 // preview=1 renders the first state still: no sound dialog, no player, no motion.
 for(const language of ['en','de'])for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1536,height:1024},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,reducedMotion:'reduce'});
  await page.goto(`${base}/beispiele/resonanz/?lang=${language}&preview=1`);
  await page.waitForFunction(()=>document.documentElement.dataset.creativeReady==='true'&&document.querySelector('#sculpture').dataset.modelReady==='true');
  await page.evaluate(()=>document.fonts.ready);
  const name=`preview-${mobile?'mobile':'desktop'}-${language}`,png=join(temp,name+'.png');await page.screenshot({path:png});
  execFileSync('magick',[png,'-quality','90',`public/resonanz/${name}.webp`]);await page.close();console.log(name);
 }
}finally{await browser.close();await rm(temp,{recursive:true,force:true});}
