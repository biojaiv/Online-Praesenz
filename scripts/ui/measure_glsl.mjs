import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const output=process.env.SHADER_OUTPUT||'/tmp/glsl-review';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'||/shader unavailable|program not valid/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('vl-intro-seen','1');localStorage.setItem('vl-language','de');Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});});
 await page.goto(base+'/');
 await page.waitForFunction(()=>window.__stage&&document.querySelector('#boot.is-done')&&!document.querySelector('.frame.is-intro'),{timeout:60000});
 await page.waitForTimeout(1500);
 await page.evaluate(()=>{
  const s=__stage,r=s.renderer,c=s.composer,render=c.render.bind(c);window.__samples=[];let last=0;
  // Include ALL composer passes, rather than only the final fullscreen triangle.
  r.info.autoReset=false;c.render=(...args)=>{
   r.info.reset();const t=performance.now();render(...args);
   if(last)__samples.push({dt:t-last,calls:r.info.render.calls,points:r.info.render.points});last=t;
  };
 });
 await page.waitForTimeout(30000);
 const metrics=await page.evaluate(()=>{
  const s=__stage,a=__samples,sort=a.map(x=>x.dt).sort((a,b)=>a-b),gl=s.renderer.getContext();
  return {samples:a.length,p50:sort[Math.floor(sort.length*.5)],p95:sort[Math.floor(sort.length*.95)],
   maxCalls:Math.max(...a.map(x=>x.calls)),minCalls:Math.min(...a.map(x=>x.calls)),points:Math.max(...a.map(x=>x.points)),
   quality:s.renderQuality,dpr:s.renderer.getPixelRatio(),memory:{...s.renderer.info.memory},programs:s.renderer.info.programs.length,
   renderer:gl.getParameter(gl.RENDERER),gpuTimerAvailable:!!gl.getExtension('EXT_disjoint_timer_query_webgl2')};
 });
 if(errors.length)throw new Error(errors.join('\n'));
 await writeFile(output+'/measurement.json',JSON.stringify({metrics,errors,browser:browser.version(),note:'Software WebGL; wall-clock intervals, not GPU duration or physical-device FPS.'},null,2));
 await page.evaluate(()=>{__stage.setProjectionIdle(true);__stage.cards.update(12,0);__stage.composer.render(0);});
 await page.screenshot({path:output+'/measured-home.png'});
 console.log(JSON.stringify(metrics));
}finally{await browser.close();}
