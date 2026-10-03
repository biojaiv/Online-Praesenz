import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SITE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1414,height:820},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const ready=()=>page.waitForFunction(()=>document.documentElement.dataset.creativeReady==='true');
 await page.goto(base+'/beispiele/resonanz/?lang=de');await ready();await page.locator('.sound-gate__skip').click();
 const positions=()=>page.evaluate(()=>{
  const mesh=__creativeScene.scene.getObjectByName('82 shared Blender lamellae');
  return Array.from({length:mesh.count},(_,i)=>Array.from(mesh.instanceMatrix.array.slice(i*16+12,i*16+15)));
 });
 const before=await positions(),box=await page.locator('#sculpture').boundingBox();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.53);await page.mouse.down();
 await page.mouse.move(box.x+box.width*.85,box.y+box.height*.30,{steps:16});await page.mouse.up();
 await page.waitForFunction(()=>__creativeScene.scene.children.find(n=>n.userData.source)?.userData.shape>97);
 const after=await positions();
 const meanDistance=after.reduce((sum,p,i)=>sum+Math.hypot(...p.map((v,j)=>v-before[i][j])),0)/after.length;
 assert(meanDistance>1.7,'Dragging moves the whole spine substantially, not just a surface shimmer');
 assert(await page.evaluate(()=>__creativeScene.scene.children.find(n=>n.userData.source).userData.lift>.35),'Vertical dragging bends into depth');
 await page.locator('#shape').focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#shape').inputValue(),'99');
 await page.locator('#sculpture').dblclick({position:{x:box.width*.6,y:box.height*.4}});
 await page.waitForFunction(()=>Math.abs(__creativeScene.scene.children.find(n=>n.userData.source).userData.shape-55)<.1);
 console.log('PASS sculpture: two-axis drag, visible full-spine deformation, keyboard and reset');

 await page.goto(base+'/beispiele/palimpsest/?lang=de');await ready();
 await page.locator('#city-motion').click();await page.waitForTimeout(150);
 const sample=()=>page.evaluate(()=>{
  const root=__creativeScene.scene.children.find(n=>n.userData.source);
  return {...root.userData,frame:__creativeScene.renderer.info.render.frame};
 });
 const paused=await sample();await page.waitForTimeout(200);assert.equal((await sample()).frame,paused.frame,'Pausing stops the render loop');
 await page.evaluate(()=>scrollTo({top:innerHeight*2.4,behavior:'instant'}));
 const samples=[];
 for(let i=0;i<10;i++){await page.waitForTimeout(75);samples.push(await sample());}
 assert(samples.some(s=>s.timelineProgress>1.05&&s.timelineProgress<2.3),'The marker visits intermediate positions');
 assert(samples.every((s,i)=>!i||s.timelineProgress>=samples[i-1].timelineProgress),'No backward jumps');
 const lineError=await page.evaluate(samples=>{
  const raw=__creativeScene.scene.getObjectByName('Timeline').userData.pathPoints;
  function error(point){let nearest=Infinity;for(let j=3;j<raw.length;j+=3){
   const a=raw.slice(j-3,j),b=raw.slice(j,j+3),ab=b.map((x,i)=>x-a[i]),ap=point.map((x,i)=>x-a[i]);
   const l=ab.reduce((s,x)=>s+x*x,0);if(l<1e-12)continue;
   const u=Math.max(0,Math.min(1,ap.reduce((s,x,i)=>s+x*ab[i],0)/l));
   nearest=Math.min(nearest,Math.hypot(...point.map((v,i)=>v-a[i]-ab[i]*u)));
  }return nearest;}
  return Math.max(...samples.map(s=>error(s.marker)));
 },samples);
 assert(lineError<1e-5,'Every sampled marker position lies on the actual exported red polyline: '+lineError);
 await page.locator('[data-era="1"]').click();await page.waitForFunction(()=>document.querySelector('[data-era="1"]').getAttribute('aria-current')==='step');
 await page.waitForFunction(()=>Math.abs(__creativeScene.scene.children.find(n=>n.userData.source).userData.timelineProgress-1)<.002);
 for(const lang of ['de','en']){
  if(lang==='en')await page.locator('[data-language]').click();
  const titles=new Set();
  for(let era=0;era<4;era++){
   await page.locator('[data-era="'+era+'"]').click();
   await page.waitForFunction(i=>document.querySelector('[data-era="'+i+'"]').getAttribute('aria-current')==='step',era);
   // Wait for the requested chapter to settle before testing its discoveries.
   await page.waitForFunction(i=>Math.abs(scrollY/innerHeight-i)<.01,era);
   for(let i=0;i<3;i++){
    titles.add(await page.locator('#artifact-title').textContent());
    assert.match(await page.locator('.artifact-source').getAttribute('href'),/^https:\/\/(www\.)?(pforzheim|schmuckmuseum|technisches-museum)\.de\//);
    assert(await page.locator('.artifact-summary').isVisible());
    await page.locator('#open-story').click();assert((await page.locator('.dialog-story').textContent()).length>100);
    await page.keyboard.press('Escape');assert(!await page.locator('dialog').isVisible());
    await page.locator('[data-story-step="1"]').click();
   }
  }
  assert.equal(titles.size,12,'Twelve distinct, sourced stories in '+lang);
 }
 await page.locator('[data-era="1"]').click();
 await page.waitForFunction(()=>Math.abs(scrollY/innerHeight-1)<.01);
 await page.locator('#city-motion').click();await page.waitForTimeout(150);
 const life=()=>page.evaluate(()=>{
  const scene=__creativeScene.scene,root=scene.children.find(n=>n.userData.source),walkers=scene.getObjectByName('Walking residents'),birds=scene.getObjectByName('Birds of the active era'),smoke=scene.getObjectByName('Chimney smoke');
  return {clocks:root.userData.eraClocks,era:root.userData.activeEra,z:scene.getObjectByName('Tram_1911_1964').position.z,
   people:Array.from(walkers.instanceMatrix.array),birds:Array.from(birds.instanceMatrix.array),birdEra:birds.userData.era,birdsVisible:birds.visible,
   smoke:smoke.visible,smokeEra:smoke.userData.era,alpha:Array.from(smoke.geometry.attributes.alpha.array)};
 });
 const first=await life();await page.waitForTimeout(650);const second=await life();
 assert(first.smoke&&first.alpha.some(a=>a>0));assert(Math.abs(second.z-first.z)>.005,'The tram moves in the industrial era');
 assert.notDeepEqual(second.people,first.people,'Residents move out of entrances');
 assert.notDeepEqual(second.birds,first.birds,'Birds fly over the active terrace');
 const stride=first.people.length/4;
 for(const era of [0,2,3])assert.deepEqual(first.people.slice(era*stride,(era+1)*stride),second.people.slice(era*stride,(era+1)*stride),'Inactive residents remain still');
 for(const era of [0,2,3]){
  await page.locator('[data-era="'+era+'"]').click();
  await page.waitForFunction(i=>Math.abs(scrollY/innerHeight-i)<.01,era);
  await page.waitForTimeout(100);
  const start=await life();await page.waitForTimeout(650);const end=await life();
  assert.equal(end.era,era);assert.equal(end.birdEra,era);assert(end.birdsVisible);
  assert(end.clocks[era]>start.clocks[era]);assert.notDeepEqual(end.people.slice(era*stride,(era+1)*stride),start.people.slice(era*stride,(era+1)*stride));
  assert.equal(end.z,start.z,'The industrial tram stays still in other eras');
  for(let other=0;other<4;other++)if(other!==era){
   assert.equal(end.clocks[other],start.clocks[other]);
   assert.deepEqual(end.people.slice(other*stride,(other+1)*stride),start.people.slice(other*stride,(other+1)*stride));
  }
 }
 await page.evaluate(()=>window.postMessage({type:'example:pause'},location.origin));await page.waitForTimeout(100);
 const hidden=await sample();await page.waitForTimeout(200);assert.equal((await sample()).frame,hidden.frame,'Hidden city draws no frames');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.postMessage({type:'example:visible'},location.origin));await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>__creativeScene.scene.getObjectByName('Chimney smoke').visible),false,'Reduced motion has no moving smoke');
 assert.equal(await page.evaluate(()=>__creativeScene.scene.getObjectByName('Birds of the active era').visible),false,'Reduced motion has no flying birds');
 assert.deepEqual(errors,[]);await page.close();
 console.log('PASS city: continuous marker on all folds, twelve stories per language, life/pause and reduced motion');
} finally {await browser.close();}
