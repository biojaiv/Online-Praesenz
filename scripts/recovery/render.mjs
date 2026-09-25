import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { steps, labels } from './english.js';
const browser=await chromium.launch({args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
try {
 await page.goto(new URL('./film.html',import.meta.url).href);
 await page.evaluate(()=>document.fonts.ready);
 const original=await page.evaluate(()=>STEPS.map(({t,w,m,a,b,st})=>({t,w,m,a,b,st})));
 const dictionary={...labels};
 original.forEach((s,i)=>['t','w','m'].forEach((key,j)=>dictionary[s[key]]=steps[i][j]));
 await writeFile('public/recovery/transcript.json',JSON.stringify({de:original,en:original.map((s,i)=>({...s,t:steps[i][0],w:steps[i][1],m:steps[i][2]}))},null,2));
 await page.evaluate(dictionary=>{
  const render=window.render;
  window.render=t=>{render(t);const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;while(node=walk.nextNode()){if(node.parentElement.closest('script,style'))continue;const key=node.textContent.trim();if(dictionary[key])node.textContent=node.textContent.replace(key,dictionary[key]);}};
  document.documentElement.lang='en'; window.render(0);
 },dictionary);
 for(const t of [0,8,44,68,104,137]) {await page.evaluate(t=>window.render(t),t);await page.screenshot({path:`/tmp/recovery-en-${t}.jpg`,type:'jpeg',quality:90});}
 await page.evaluate(()=>window.render(8));
 await page.screenshot({path:'public/recovery/preview-en.jpg',type:'jpeg',quality:88});
 if(process.argv.includes('--stills'))process.exit(0);
 const fps=30,total=await page.evaluate(()=>window.TOTAL);
 const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','21','-tune','animation','-pix_fmt','yuv420p','-movflags','+faststart','-metadata','title=Recovery Lab - Application and database recovery','public/recovery/recovery-en.mp4'],{stdio:['pipe','inherit','inherit']});
 const completed=once(ff,'close');
 for(let i=0;i<Math.round(total*fps);i++){
  await page.evaluate(t=>window.render(t),i/fps);
  const frame=await page.screenshot({type:'jpeg',quality:94});
  if(!ff.stdin.write(frame))await once(ff.stdin,'drain');
  if(i%300===0)console.log(`English film: ${i}/${Math.round(total*fps)} frames`);
 }
 ff.stdin.end();const [code]=await completed;if(code!==0)throw new Error(`ffmpeg exited ${code}`);
 console.log('English film complete.');
}finally{await browser.close();}
