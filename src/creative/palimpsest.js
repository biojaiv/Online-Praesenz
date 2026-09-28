import './style.css';
import { createScene } from './scene.js';
import { createCity } from './cityModel.js';
import { createBridge } from './bridge.js';
import { cityYears, cityStories, artifactDrawing } from './cityHistory.js';

const copy={
 de:{find:'Die Fundstücke',back:'← Portfolio',eyebrow:'PFORZHEIM · EINE STADT, VIELE SCHICHTEN',headline:'Die Geschichte<br>einer Stadt',instruction:'Scrolle durch Pforzheim.<br>Die rote Spur führt durch die Zeit.',discover:'Geschichte lesen ↗',credit:'PFORZHEIM · GESCHICHTE ALS STADTMINIATUR',modelNote:'Die Miniatur verdichtet Epochen. Gebäude und Objekte sind Illustrationen, keine maßstabsgetreuen Rekonstruktionen. Die historischen Angaben stammen aus den verlinkten Stadt- und Museumsquellen.',fallback:'Erkunde Pforzheim über die Jahreszahlen und die Fundstücke darunter.',illustration:'ILLUSTRATION',source:'Quelle',pause:'Ⅱ Stadt anhalten',play:'▷ Stadt beleben',reduced:'Ruhige Ansicht',previous:'Vorheriges Fundstück',next:'Nächstes Fundstück',captions:['01 / NEUANFANG & STADTNATUR','02 / GOLDSTADT & ARBEITSWEGE','03 / STADTBILD & HUMANISMUS','04 / DIE SPUREN VON PORTUS']},
 en:{find:'The discoveries',back:'← Portfolio',eyebrow:'PFORZHEIM · ONE CITY, MANY LAYERS',headline:'The story<br>of a city',instruction:'Scroll through Pforzheim.<br>Follow the red thread of time.',discover:'Read the story ↗',credit:'PFORZHEIM · HISTORY IN AN ILLUSTRATED MINIATURE',modelNote:'The miniature combines different eras. Buildings and objects are illustrations, not scale reconstructions. Historical information comes from the linked city archives and museums.',fallback:'Explore Pforzheim with the year buttons and discoveries below.',illustration:'ILLUSTRATION',source:'Source',pause:'Ⅱ Pause city',play:'▷ Bring city to life',reduced:'Still view',previous:'Previous discovery',next:'Next discovery',captions:['01 / NEW BEGINNINGS & NATURE','02 / GOLDSTADT & WORKING LIFE','03 / CITYSCAPE & HUMANISM','04 / THE TRACES OF PORTUS']}
};
const still=new URLSearchParams(location.search).get('preview')==='1';
let era=1,language='en',busy=false,paused=false;
const storyIndices=[0,0,0,0];
const canvas=document.querySelector('#city-model'),art=createScene(canvas,{orthographic:true,lowFrameRate:20}),model=art?createCity(art):null;
const buttons=[...document.querySelectorAll('[data-era]')],dialog=document.querySelector('.artifact-dialog');
const marker=document.querySelector('.time-traveller'),motionButton=document.querySelector('#city-motion');
const figure=document.querySelector('.artifact-figure'),drawing=document.querySelector('.artifact-drawing');
const ticket=document.querySelector('.ticket');
let lastObject='';

function details(){
 const words=copy[language],index=storyIndices[era],entry=cityStories[era][index];
 const [date,category,title,summary,detail,source]=entry[language];
 buttons.forEach((button,i)=>button.setAttribute('aria-current',i===era?'step':'false'));
 document.querySelector('.artifact-number').textContent=category+' · '+date;
 document.querySelector('#artifact-title').textContent=title;
 document.querySelector('.artifact-summary').textContent=summary;
 document.querySelector('.artifact-count').textContent=String(index+1).padStart(2,'0')+' / 03';
 ticket.hidden=entry.id!=='ticket';drawing.hidden=entry.id==='ticket';
 document.querySelector('.ticket-year').textContent=cityYears[era];
 if(entry.id==='ticket')document.querySelector('.ticket-render').src='/creative/ticket-1924-'+language+'.webp';
 else drawing.innerHTML=artifactDrawing(entry.id);
 if(lastObject!==entry.id){
  figure.dataset.object=entry.id;
  if(lastObject&&!art?.motion.matches&&!still){figure.getAnimations().forEach(animation=>animation.cancel());figure.animate([{opacity:.25,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:250,easing:'ease-out'});}
  lastObject=entry.id;
 }
 document.querySelector('.city-caption').textContent=words.captions[era];
 document.querySelector('.dialog-year').textContent=category+' · '+date;
 dialog.querySelector('h2').textContent=title;dialog.querySelector('.dialog-intro').textContent=summary;dialog.querySelector('.dialog-story').textContent=detail;
 for(const link of document.querySelectorAll('.artifact-source,.dialog-source')){link.href=entry.url;link.textContent=words.source+': '+source+' ↗';}
 model?.select(era);
}
function motionCopy(){
 const reduced=art?.motion.matches;
 motionButton.textContent=copy[language][reduced?'reduced':paused?'play':'pause'];
 motionButton.setAttribute('aria-pressed',String(paused||reduced));motionButton.disabled=!!reduced;
 motionButton.hidden=!art||canvas.dataset.modelReady==='error';
}
function render(lang){
 language=lang;document.querySelectorAll('[data-copy]').forEach(el=>{const value=copy[lang][el.dataset.copy];if(value)el.innerHTML=value;});
 document.title=lang==='de'?'PALIMPSEST — Die Geschichte Pforzheims':'PALIMPSEST — The story of Pforzheim';
 document.querySelector('[data-language]').textContent=lang==='de'?'EN':'DE';document.querySelector('[data-language]').setAttribute('aria-label',lang==='de'?'Switch to English':'Auf Deutsch wechseln');
 document.querySelector('.close-story').setAttribute('aria-label',lang==='de'?'Geschichte schließen':'Close story');
 document.querySelector('.city-years').setAttribute('aria-label',lang==='de'?'Epochen Pforzheims':'Eras of Pforzheim');
 document.querySelector('.artifact-pager').setAttribute('aria-label',lang==='de'?'Weitere Fundstücke dieser Epoche':'More discoveries from this era');
 document.querySelector('[data-story-step="-1"]').setAttribute('aria-label',copy[lang].previous);document.querySelector('[data-story-step="1"]').setAttribute('aria-label',copy[lang].next);
 canvas.setAttribute('aria-label',lang==='de'?'Vier illustrierte Schichten Pforzheims mit Straßenbahn, Menschen und einer wandernden roten Zeitmarkierung':'Four illustrated layers of Pforzheim with a tram, people and a travelling red time marker');
 buttons.forEach((button,i)=>button.setAttribute('aria-label',i===3?(lang==='de'?'244 nach Christus · Portus':'AD 244 · Portus'):cityYears[i]+' · '+copy[lang].captions[i].slice(5)));
 details();motionCopy();
}
function syncMotion(){art?.setContinuous(canvas.dataset.modelReady==='true'&&!still&&!art.motion.matches&&(!paused||model.travelling));}
const bridge=createBridge(render,visible=>{art?.setVisible(visible);syncMotion();});
if(art){
 const projected=model.marker.clone();let box,parentBox;
 const measure=()=>{box=canvas.getBoundingClientRect();parentBox=canvas.parentElement.getBoundingClientRect();};
 const observer=new ResizeObserver(measure);observer.observe(canvas);addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 art.setUpdate(time=>{
  model.update(time,!paused&&!still);model.root.updateMatrixWorld(true);art.camera.updateMatrixWorld(true);
  if(!box)measure();
  const project=point=>projected.copy(point).applyMatrix4(model.root.matrixWorld).project(art.camera);
  model.anchors.forEach((anchor,i)=>{const point=project(anchor);buttons[i].style.left=(box.left-parentBox.left+(point.x+1)*box.width/2+34)+'px';buttons[i].style.top=(box.top-parentBox.top+(1-point.y)*box.height/2)+'px';});
  if(model.anchors.length){
   const point=project(model.marker);marker.hidden=false;
   marker.style.transform='translate('+(box.left-parentBox.left+(point.x+1)*box.width/2)+'px,'+(box.top-parentBox.top+(1-point.y)*box.height/2)+'px) translate(-50%,-50%)';
  }
  syncMotion();
 });
 art.motion.addEventListener('change',()=>{motionCopy();syncMotion();art.invalidate();});
}
function select(index){era=index;details();}
function onScroll(){
 if(busy)return;busy=true;requestAnimationFrame(()=>{
  busy=false;const progress=Math.min(3,Math.max(0,scrollY/innerHeight)),next=Math.round(progress);
  if(model){model.root.scale.y=.96+progress*.04;model.setProgress(progress,still);syncMotion();}
  if(next!==era)select(next);
 });
}
addEventListener('scroll',onScroll,{passive:true});
buttons.forEach((button,i)=>button.addEventListener('click',()=>{
 if(!model||art.motion.matches||still)select(i);
 scrollTo({top:i*innerHeight,behavior:art?.motion.matches||still?'instant':'smooth'});
}));
addEventListener('resize',()=>{scrollTo({top:era*innerHeight,behavior:'instant'});art?.invalidate();});
document.querySelectorAll('[data-story-step]').forEach(button=>button.addEventListener('click',()=>{storyIndices[era]=(storyIndices[era]+Number(button.dataset.storyStep)+3)%3;details();}));
document.querySelector('#open-story').addEventListener('click',()=>dialog.showModal());document.querySelector('.close-story').addEventListener('click',()=>dialog.close());
// Focusing the footer must not jump the 400vh timeline.
document.querySelector('a[href="#artifact"]').addEventListener('click',event=>{event.preventDefault();document.querySelector('#open-story').focus({preventScroll:true});});
motionButton.addEventListener('click',()=>{paused=!paused;motionCopy();syncMotion();art?.invalidate();});
canvas.addEventListener('pointermove',event=>{if(!art||art.motion.matches||event.pointerType!=='mouse')return;const bounds=canvas.getBoundingClientRect();model.root.rotation.y=(event.clientX-bounds.left-bounds.width/2)/bounds.width*.07;art.invalidate();});
canvas.addEventListener('pointerleave',()=>{if(model){model.root.rotation.y=0;art.invalidate();}});
await Promise.all([document.fonts.ready,model?.ready]);
motionCopy();scrollTo({top:innerHeight,behavior:'instant'});model?.setProgress(1,true);art?.resize();art?.renderStill();bridge.ready();
