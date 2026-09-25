import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const results=[];
await mkdir('/tmp/knallblau-check',{recursive:true});
try{for(const slow of [false,true]){
 const page=await browser.newPage({viewport:{width:390,height:844},locale:'de-DE'});
 await page.addInitScript(()=>{window.metrics={lcp:0,cls:0};new PerformanceObserver(l=>{for(const e of l.getEntries())window.metrics.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.metrics.cls+=e.value;}).observe({type:'layout-shift',buffered:true});});
 if(slow){const c=await page.context().newCDPSession(page);await c.send('Network.enable');await c.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:90000});await c.send('Emulation.setCPUThrottlingRate',{rate:4});}
 await page.goto(`${process.env.KNALLBLAU_URL||'http://127.0.0.1:4176'}/beispiele/knallblau/?lang=de`);await page.waitForTimeout(3000);
 results.push({slow,browser:browser.version(),...await page.evaluate(()=>({...window.metrics,bytes:performance.getEntriesByType('resource').reduce((s,e)=>s+e.transferSize,performance.getEntriesByType('navigation')[0].transferSize),resources:performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,bytes:e.transferSize})),visible:!!document.querySelector('h1').getBoundingClientRect().height,animations:document.getAnimations().length}))});await page.close();
}await writeFile('/tmp/knallblau-check/performance.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({resources,...r})=>r),null,2));}finally{await browser.close();}
