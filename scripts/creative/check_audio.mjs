import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 await page.addInitScript(()=>{
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:get.call(this,type,...args);};
  window.__oscillators=[];
  const create=AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator=function(){const oscillator=create.call(this);__oscillators.push(oscillator);return oscillator;};
 });
 await page.goto(base+'/beispiele/resonanz/?lang=de');
 await page.waitForFunction(()=>document.documentElement.dataset.creativeReady==='true');
 assert.equal(await page.evaluate(()=>__oscillators.length),0);
 await page.locator('#sound').click();await page.waitForTimeout(400);
 const initial=await page.evaluate(()=>__oscillators[0].frequency.value);
 await page.locator('.resonance-stage').hover();await page.mouse.wheel(350,0);
 await page.waitForTimeout(450);
 const high=await page.evaluate(()=>__oscillators[0].frequency.value);
 await page.mouse.wheel(-700,0);await page.waitForTimeout(450);
 const low=await page.evaluate(()=>__oscillators[0].frequency.value);
 assert(high>initial*2&&low<initial*.55,'Sideways scrolling changes the actual live oscillator frequencies');
 await page.locator('#sound').click();
 // Render the production graph. Analyse its resulting waveforms, not preset values.
 const metrics=await page.evaluate(async()=>{
  const {createSoundGraph}=await import('/src/creative/resonanzAudio.js');
  async function render(chapter,shape,lift=0,space=0){
   const rate=44100,context=new OfflineAudioContext(2,rate*2,rate),graph=createSoundGraph(context);
   graph.update({chapter,shape,lift,space},true);
   const buffer=await context.startRendering(),left=buffer.getChannelData(0),right=buffer.getChannelData(1),n=16384;
   const real=new Float64Array(n),imaginary=new Float64Array(n);let peak=0,rms=0;
   for(let i=0;i<left.length;i++){peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));rms+=(left[i]*left[i]+right[i]*right[i])/2;}
   for(let i=0;i<n;i++)real[i]=(left[i+rate]+right[i+rate])*.5*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));
   for(let i=1,j=0;i<n;i++){
    let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;
    if(i<j){const value=real[i];real[i]=real[j];real[j]=value;}
   }
   for(let len=2;len<=n;len<<=1){
    const angle=-2*Math.PI/len,wr=Math.cos(angle),wi=Math.sin(angle);
    for(let i=0;i<n;i+=len){let ar=1,ai=0;for(let j=0;j<len/2;j++){
     const a=i+j,b=a+len/2,br=real[b]*ar-imaginary[b]*ai,bi=real[b]*ai+imaginary[b]*ar;
     real[b]=real[a]-br;imaginary[b]=imaginary[a]-bi;real[a]+=br;imaginary[a]+=bi;
     const next=ar*wr-ai*wi;ai=ar*wi+ai*wr;ar=next;
    }}
   }
   let total=0,weighted=0,max=0,dominant=0,upper=0,highBand=0;
   for(let i=8;i<n/2;i++){
    const hz=i*rate/n,energy=real[i]**2+imaginary[i]**2;
    total+=energy;weighted+=energy*hz;if(hz>600)upper+=energy;if(hz>3000)highBand+=energy;
    if(energy>max){max=energy;dominant=hz;}
   }
   return {chapter,shape,lift,space,dominant,centroid:weighted/total,upper:upper/total,highBand:highBand/total,peak,rms:Math.sqrt(rms/left.length)};
  }
  const results=[];
  for(const state of [[2,0],[2,100],[1,55],[2,55],[5,55],[2,55,-1],[2,55,1],[4,55]])results.push(await render(...state));
  // Check every chapter at its brightest setting and largest reverb, too.
  for(let chapter=0;chapter<6;chapter++)results.push(await render(chapter,100,1,85));
  return results;
 });
 console.table(metrics.map(m=>Object.fromEntries(Object.entries(m).map(([k,v])=>[k,Number(v.toFixed(3))]))));
 const [bass,bright,pure,rich,shimmer,darkLift,lightLift]=metrics;
 assert(bright.dominant>bass.dominant*7.8&&bright.dominant<bass.dominant*8.2,'The instrument retains three octaves, in a lower register');
 assert(bright.centroid>bass.centroid*8,'The spectral sweep is pronounced');
 assert(rich.upper>pure.upper*4,'Harmonics differs audibly from the pure-tone chapter');
 assert(shimmer.upper>pure.upper*4,'Shimmer retains its own harmonic colour');
 assert(lightLift.centroid>darkLift.centroid*1.2,'Vertical bending also affects timbre');
 assert(metrics.every(m=>m.peak<.22&&m.rms>.008),'Output remains bounded, audible and unclipped');
 assert(metrics.every(m=>m.highBand<.002),'Less than 0.2% of energy sits above 3 kHz, including extreme settings');
 const envelope=await page.evaluate(async()=>{
  const {createSoundGraph}=await import('/src/creative/resonanzAudio.js');
  const rate=44100,context=new OfflineAudioContext(2,rate*2,rate),graph=createSoundGraph(context,{silent:true});
  graph.update({chapter:2,shape:55,space:85},true);graph.fade(true,.24,.1);graph.fade(false,.12,1.1);
  const buffer=await context.startRendering(),data=buffer.getChannelData(0);
  const rms=(start,end)=>{let energy=0;for(let i=start*rate;i<end*rate;i++)energy+=data[Math.floor(i)]**2;return Math.sqrt(energy/((end-start)*rate));};
  let step=0;for(let i=1;i<data.length;i++)step=Math.max(step,Math.abs(data[i]-data[i-1]));
  return {silent:rms(0,.09),attack:rms(.1,.14),sustain:rms(.5,.8),released:rms(1.23,1.9),step};
 });
 assert(envelope.silent<1e-7&&envelope.released<1e-7,'Opt-in attack and release remain silent at their boundaries, even with reverb');
 assert(envelope.attack<envelope.sustain*.2&&envelope.sustain>.01,'Sound eases in rather than appearing at full volume');
 assert(envelope.step<.01,'The rendered attack and release contain no abrupt waveform jumps');
 // Strikes: render one mallet without the drone, in the dry room and in the cathedral.
 const strikes=await page.evaluate(async()=>{
  const {createSoundGraph,finNote}=await import('/src/creative/resonanzAudio.js');
  async function render(space,index,shape=55){
   const rate=44100,context=new OfflineAudioContext(2,rate*5,rate),graph=createSoundGraph(context,{drone:false}),state={chapter:2,shape,lift:0,space};
   graph.update(state,true);graph.strike(finNote(state,index),{velocity:1,when:.1});
   const buffer=await context.startRendering(),left=buffer.getChannelData(0),right=buffer.getChannelData(1),window=rate*.05;
   let peak=0,step=0;const windows=[];
   for(let i=0;i<left.length;i++){peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));if(i)step=Math.max(step,Math.abs(left[i]-left[i-1]));}
   for(let start=0;start+window<=left.length;start+=window){let e=0;for(let i=start;i<start+window;i++)e+=left[i]*left[i];windows.push(Math.sqrt(e/window));}
   const loudest=Math.max(...windows),last=windows.findLastIndex(v=>v>loudest*.01);
   // Energy above 3 kHz in the first half second, where the mallet is brightest.
   const n=16384,real=new Float64Array(n),imaginary=new Float64Array(n),offset=Math.round(rate*.1);
   for(let i=0;i<n;i++)real[i]=left[offset+i]*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));
   for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){const v=real[i];real[i]=real[j];real[j]=v;}}
   for(let len=2;len<=n;len<<=1){const angle=-2*Math.PI/len,wr=Math.cos(angle),wi=Math.sin(angle);for(let i=0;i<n;i+=len){let ar=1,ai=0;for(let j=0;j<len/2;j++){const a=i+j,b=a+len/2,br=real[b]*ar-imaginary[b]*ai,bi=real[b]*ai+imaginary[b]*ar;real[b]=real[a]-br;imaginary[b]=imaginary[a]-bi;real[a]+=br;imaginary[a]+=bi;const next=ar*wr-ai*wi;ai=ar*wi+ai*wr;ar=next;}}}
   let total=0,high=0;for(let i=8;i<n/2;i++){const e=real[i]**2+imaginary[i]**2;total+=e;if(i*rate/n>3000)high+=e;}
   return {space,index,shape,peak,step,before:windows[1],tail:(last+1)*.05-.1,highBand:high/total};
  }
  return [await render(0,40),await render(85,40),await render(35,81,100),await render(35,0,0)];
 });
 console.table(strikes.map(m=>Object.fromEntries(Object.entries(m).map(([k,v])=>[k,Number(v.toFixed(4))]))));
 const [dryStrike,hallStrike]=strikes;
 assert(strikes.every(m=>m.peak>.02&&m.peak<.22),'A single strike is audible and bounded');
 assert(strikes.every(m=>m.before<1e-6),'Nothing sounds before the scheduled strike');
 assert(strikes.every(m=>m.step<.02),'The 5 ms mallet attack has no click');
 assert(strikes.every(m=>m.highBand<.002),'Strikes keep less than 0.2% of their energy above 3 kHz');
 assert(hallStrike.tail>dryStrike.tail*2.2,'The cathedral rings far longer than the dry room');
 await page.locator('#sound').click();
 await page.evaluate(()=>window.postMessage({type:'example:pause'},location.origin));
 await page.waitForFunction(()=>document.querySelector('#sound').getAttribute('aria-pressed')==='false');
 await page.waitForTimeout(180);
 await page.evaluate(()=>window.postMessage({type:'example:visible'},location.origin));
 assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
 console.log('PASS live sideways-wheel mapping, soft attack/release, spectrum, peak and strike checks');
}finally{await browser.close();}
