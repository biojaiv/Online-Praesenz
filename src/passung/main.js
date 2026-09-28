import {copy} from './content.js';
import {createScene} from '../creative/scene.js';
import {createBridge} from '../creative/bridge.js';
import {createMachine} from './machine.js';
import {createMachineRotation} from './rotation.js';
import {createPartAnnotations} from './annotations.js';

const params=new URLSearchParams(location.search),still=params.get('preview')==='1';
const canvas=document.querySelector('#machine'),story=document.querySelector('.scroll-story');
const art=createScene(canvas,{orthographic:true,lowFrameRate:24,respectReducedMotion:false});
const motionPreference=matchMedia('(prefers-reduced-motion:reduce)');
const state={language:'en',progress:0,chapter:0,userQuiet:false,dialog:null};
const info=document.querySelector('.info-dialog'),inquiry=document.querySelector('.inquiry-dialog');
const motionButton=document.querySelector('.motion-toggle');
const chapterRail=document.querySelector('.chapter-rail'),stepContext=document.querySelector('.step-context');
let chapterReveal=null;
const machine=art?createMachine(art,{still,onFrame:positionHotspot}):null;
let rotation=null,annotations=null;
const words=()=>copy[state.language];
const quiet=()=>state.userQuiet||motionPreference.matches;

function positionHotspot(progress){
 if(!machine?.loaded)return;
 const point=machine.hotspot(),hotspot=document.querySelector('.part-hotspot');
 hotspot.style.left=(point.x*100)+'%';hotspot.style.top=(point.y*100)+'%';
 hotspot.hidden=!point.visible;
 const rotated=Math.abs(machine.angle)>.0001;
 document.querySelector('.machine-stage').dataset.rotated=String(rotated);
 document.querySelector('[data-reset-view]').disabled=!rotated;
 document.querySelector('.drawing-label').style.opacity=Math.max(0,1-progress);
 rotation?.refresh();annotations?.update();
}
function updateChapter(){
 const t=words(),index=state.chapter;
 const changed=document.documentElement.dataset.chapter!==String(index);
 document.querySelectorAll('.chapter-buttons [data-jump]').forEach((link,i)=>link.setAttribute('aria-current',i===index?'step':'false'));
 document.querySelector('.step-title').textContent=t.steps[index][0];
 document.querySelector('.step-description').textContent=t.steps[index][1];
 stepContext.dataset.first=String(index===0);
 chapterRail.style.setProperty('--progress',String(state.progress/3));
 document.documentElement.dataset.chapter=String(index);
 if(changed){
  chapterReveal?.cancel();
  if(index>0&&!quiet()&&!still)chapterReveal=stepContext.animate(
   [{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],
   {duration:240,easing:'cubic-bezier(.22,1,.36,1)'});
 }
}
function updateMotion(){
 const reduced=quiet();machine?.setQuiet(reduced);
 motionButton.setAttribute('aria-pressed',String(reduced));motionButton.disabled=motionPreference.matches;
 document.querySelector('[data-motion-copy]').textContent=words()[motionPreference.matches?'reduced':state.userQuiet?'motionOn':'motion'];
 document.documentElement.classList.toggle('motion-quiet',reduced);
 if(reduced)chapterReveal?.cancel();
}
function optionList(selector,items){
 const select=document.querySelector(selector),value=select.value||'0';
 select.replaceChildren(...items.map((text,i)=>new Option(text,String(i))));select.value=value;
}
function renderDialog(){
 if(!state.dialog)return;
 const data=words().dialogs[state.dialog];
 info.querySelector('.info-label').textContent=data.label;info.querySelector('h2').textContent=data.title;
 info.querySelector('.dialog-intro').textContent=data.intro;
 info.querySelector('.info-items').replaceChildren(...data.items.map(([title,text])=>{
  const article=document.createElement('article'),h3=document.createElement('h3'),p=document.createElement('p');h3.textContent=title;p.textContent=text;article.append(h3,p);return article;
 }));
}
function render(language){
 state.language=language;const t=words();
 document.querySelectorAll('[data-copy]').forEach(el=>{const text=t[el.dataset.copy];if(text)el.innerHTML=text;});
 document.querySelectorAll('[data-chapter-label]').forEach(el=>el.textContent=t.chapters[Number(el.dataset.chapterLabel)]);
 const languageButton=document.querySelector('[data-language]');languageButton.innerHTML=`<span data-active="${language==='de'}">DE</span><span class="language-divider" aria-hidden="true">/</span><span data-active="${language==='en'}">EN</span>`;
 languageButton.setAttribute('aria-label',language==='de'?'Switch to English':'Auf Deutsch wechseln');
 document.querySelector('.main-nav').setAttribute('aria-label',language==='de'?'Hauptnavigation':'Main navigation');
 document.querySelector('.chapter-rail').setAttribute('aria-label',language==='de'?'Fertigungsschritte':'Manufacturing chapters');
 canvas.setAttribute('aria-label',t.model);document.querySelector('.machine-poster').alt=t.model;
 const resetView=document.querySelector('[data-reset-view]');resetView.setAttribute('aria-label',t.resetView);resetView.title=t.resetView;
 document.querySelector('.workshop-photo').alt=t.photo;document.querySelector('.part-hotspot').setAttribute('aria-label',t.hotspot);
 document.querySelectorAll('.close-dialog').forEach(button=>button.setAttribute('aria-label',t.close));
 document.querySelector('#project-idea').placeholder=t.projectPlaceholder;
 optionList('#project-quantity',t.quantities);optionList('#project-material',t.materials);
 document.title=language==='de'?'PASSUNG — Vom Gedanken zum Werkstück':'PASSUNG — From an idea to a finished part';
 const reading=document.querySelector('.reading-chapters');
 reading.replaceChildren(...t.steps.map(([title,text],i)=>{
  const article=document.createElement('article'),h2=document.createElement('h2'),p=document.createElement('p');article.id=`chapter-${i}`;h2.textContent=`0${i+1} · ${t.chapters[i]} — ${title}`;p.textContent=text;article.append(h2,p);return article;
 }));
 updateChapter();updateMotion();renderDialog();rotation?.refresh();annotations?.update();
 if(!document.querySelector('.draft-output').hidden)prepareDraft();
 if(!art||canvas.dataset.modelReady==='error')document.querySelector('.model-status').textContent=t.fallback;
}
const bridge=createBridge(render,visible=>{if(!visible){rotation?.cancel();rotation?.clearHover();}machine?.setRotationPaused('hidden',!visible);art?.setVisible(visible);});

let scrollFrame=0;
function scrollDistance(){return Math.max(1,story.offsetHeight-innerHeight);}
function syncScroll(){
 scrollFrame=0;
 const progress=Math.max(0,Math.min(3,(scrollY-story.offsetTop)/scrollDistance()*3));
 state.progress=progress;const next=Math.round(progress);
 if(next!==state.chapter){state.chapter=next;updateChapter();}
 else chapterRail.style.setProperty('--progress',String(progress/3));
 machine?.setProgress(quiet()?state.chapter:progress,still||quiet());
}
function jump(index){scrollTo({top:story.offsetTop+scrollDistance()*index/3,behavior:quiet()||still?'instant':'smooth'});}
document.querySelectorAll('[data-jump]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();jump(Number(link.dataset.jump));}));
document.querySelector('.wordmark').addEventListener('click',event=>{event.preventDefault();jump(0);});
addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(syncScroll);},{passive:true});
addEventListener('resize',()=>{syncScroll();art?.resize();});
motionButton.addEventListener('click',()=>{state.userQuiet=!state.userQuiet;updateMotion();syncScroll();});
motionPreference.addEventListener('change',()=>{updateMotion();syncScroll();});

document.querySelectorAll('[data-dialog]').forEach(button=>button.addEventListener('click',()=>{
 state.dialog=button.dataset.dialog;renderDialog();info.showModal();rotation?.clearHover();
}));
document.querySelectorAll('[data-inquiry]').forEach(button=>button.addEventListener('click',()=>{inquiry.showModal();rotation?.clearHover();}));
document.querySelectorAll('.close-dialog,.dialog-done').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
for(const dialog of [info,inquiry])dialog.addEventListener('click',event=>{
 if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();
 if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
});

function prepareDraft(){
 const t=words(),idea=document.querySelector('#project-idea').value.trim();
 const quantity=t.quantities[Number(document.querySelector('#project-quantity').value)];
 const material=t.materials[Number(document.querySelector('#project-material').value)];
 document.querySelector('#draft-text').value=`${t.draftIntro}\n\n${idea}\n\n${t.quantityLabel}: ${quantity}\n${t.materialLabel}: ${material}\n\n${t.draftEnd}`;
}
document.querySelector('#inquiry-form').addEventListener('submit',event=>{
 event.preventDefault();prepareDraft();event.currentTarget.hidden=true;document.querySelector('.draft-output').hidden=false;
 document.querySelector('#draft-text').focus();
});
document.querySelector('.edit-draft').addEventListener('click',()=>{
 document.querySelector('.draft-output').hidden=true;document.querySelector('#inquiry-form').hidden=false;document.querySelector('#project-idea').focus();
});
document.querySelector('#copy-draft').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(document.querySelector('#draft-text').value);document.querySelector('.draft-status').textContent=words().copied;}
 catch{document.querySelector('#draft-text').select();document.querySelector('.draft-status').textContent=words().copyFailed;}
});
document.querySelector('#download-draft').addEventListener('click',()=>{
 const blob=new Blob([document.querySelector('#draft-text').value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=`PASSUNG-${state.language==='de'?'Anfrageentwurf':'enquiry-draft'}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});

syncScroll();
await Promise.all([document.fonts.ready,machine?.ready]);
if(canvas.dataset.modelReady!=='true'){
 document.querySelector('.model-status').textContent=words().fallback;document.documentElement.classList.add('no-webgl');
 motionButton.hidden=true;document.querySelector('.part-hotspot').hidden=true;
}
art?.resize();art?.renderStill();
// The loading image uses this same first frame and the same fit rectangle.
if(canvas.dataset.modelReady==='true'){
 document.documentElement.classList.add('machine-ready');
 if(!still){
  annotations=createPartAnnotations(canvas,machine,words);
  rotation=createMachineRotation(canvas,machine,document.querySelector('[data-reset-view]'),()=>words().parts);
  document.querySelector('.rotation-controls').hidden=false;
 }
}
bridge.ready();
