import { t, getLanguage, onLanguageChange } from '../i18n.js';
import { projectsIn, getProjectUrl } from '../data/projects.js';
import { GALLERY, galleryY, PREVIEW_TONE_MATRIX } from '../data/projectGalleryLayout.js';
import './projectWings.css';

// Project a real HTML rectangle onto the four corners of its Three.js sheet.
export function sheetTransform([a,b,c,d],width=800,height=1428){
 const dx1=b.x-c.x,dx2=d.x-c.x,dy1=b.y-c.y,dy2=d.y-c.y;
 const sx=a.x-b.x+c.x-d.x,sy=a.y-b.y+c.y-d.y;
 const den=dx1*dy2-dx2*dy1;
 const g=Math.abs(den)>1e-8?(sx*dy2-dx2*sy)/den:0;
 const h=Math.abs(den)>1e-8?(dx1*sy-sx*dy1)/den:0;
 return `matrix3d(${(b.x-a.x+g*b.x)/width},${(b.y-a.y+g*b.y)/width},0,${g/width},${(d.x-a.x+h*d.x)/height},${(d.y-a.y+h*d.y)/height},0,${h/height},0,0,1,0,${a.x},${a.y},0,1)`;
}
export function createProjectsBrowser({container,stage,onNavigate}){
 const panel=document.createElement('section');panel.className='projects-browser project-book-ui';panel.hidden=true;
 panel.setAttribute('aria-label',t('example.label'));container.append(panel);
 const mobile=matchMedia('(max-width:650px)');
 let route='home',suspended=false,timer=0,lastWings=null,pinched=false,savedScroll=0;
 const touches=new Map();let pinchDistance=0;
 const open=()=>route.startsWith('projekte');
 function syncVisibility(){
  stage?.cards.showProjectPreview(!open()||!mobile.matches);
  panel.querySelectorAll('.wing-focus').forEach(button=>{button.disabled=!stage||mobile.matches;});
 }
 function position({wings,zoom=1}){
  lastWings=wings;
  if(mobile.matches){panel.style.setProperty('--sheet-zoom',Math.max(.7,Math.min(1.7,zoom)).toFixed(3));return;}
  if(!stage)return;
  for(const wing of wings){const el=panel.querySelector(`[data-wing="${wing.section}"]`);if(el)el.style.transform=sheetTransform(wing.corners);}

 }
 stage?.setExamplePreviewUpdate(position);
 function rememberScroll(){const sheets=panel.querySelector('.project-book-sheets');if(sheets&&!panel.hidden)savedScroll=sheets.scrollTop;}
 function restoreScroll(){if(!panel.hidden){const sheets=panel.querySelector('.project-book-sheets');if(sheets)sheets.scrollTop=savedScroll;}}
 function render(){
  rememberScroll();
  const focused=panel.contains(document.activeElement)?document.activeElement.dataset.focus:null;
  panel.classList.toggle('is-flat',!stage);panel.classList.toggle('is-spatial',Boolean(stage)&&!mobile.matches);panel.setAttribute('aria-label',t('example.label'));
  panel.innerHTML=`<svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><filter id="project-preview-tone" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${PREVIEW_TONE_MATRIX}"/></filter></defs></svg><div class="project-book-sheets">`+['webseiten','systemintegration'].map((category,i)=>{
   const projects=projectsIn(category),project=projects[0];
   const link=p=>getProjectUrl(p,getLanguage());
   return `<article class="project-wing" data-wing="${category}" aria-label="${t(i?'projects.integration':'projects.websites')}">
    <header><span>VL // 02 · ${i?'B':'A'}</span></header>
    <h2 class="wing-heading"><button type="button" class="wing-focus" data-focus="wing-${category}" aria-label="${t('projects.focusWing',{title:t(i?'projects.integration':'projects.websites')})}" ${!stage||mobile.matches?'disabled':''}>${t(i?'projects.integration':'projects.websites')}</button></h2>
    <p class="wing-subtitle">${t(i?'projects.infrastructure':'gallery.subtitle')}</p>
    ${i?'':`<ul class="wing-gallery">${projects.map((p,index)=>`<li style="--card-y:${galleryY(index,projects.length)}px"><a class="gallery-card wing-preview" data-project-card href="${link(p)}" data-project-id="${p.id}" data-example-open data-focus="project-${p.id}" aria-label="${t(p.title)} · ${p.sound?t('gallery.soundAria')+' · ':''}${t('projects.open')}"><img class="gallery-thumb" src="${p.preview(getLanguage())}" width="${GALLERY.thumbWidth}" height="${GALLERY.thumbHeight}" alt=""/><div class="gallery-copy"><h3>${p.id==='systems'?'TIEFGANG':t(p.title)}</h3><p>${t('gallery.'+p.id)}</p>${p.sound?`<span class="gallery-sound" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>${t('gallery.sound')}</span>`:''}</div><b aria-hidden="true">↗</b></a></li>`).join('')}</ul><p class="gallery-hint">${t('gallery.hint')}</p>`}
    ${i?`
    <a class="wing-preview" href="${link(project)}" data-project-id="${project.id}" data-example-open data-focus="preview-${category}" aria-label="${t(project.title)} · ${t('projects.open')}"><img src="${project.preview(getLanguage())}" alt=""/><span>${t(i?'projects.play':'projects.open')}</span></a>
    <p class="wing-tech">${i?'DEBIAN · KVM · NFTABLES':'SVG · GSAP · JAVASCRIPT'}</p>
    <ul class="wing-projects">${projects.map(p=>`<li><a href="${link(p)}" data-project-id="${p.id}" data-example-open data-focus="project-${p.id}"><span aria-hidden="true">◇</span> ${t(p.title)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul>
    ${i?`<p class="wing-planned">${t('recovery.planned')}</p><p class="wing-description">${t('recovery.short')}</p><p class="wing-tools">PostgreSQL · Restic · Ansible</p>`:`<p class="wing-description">${t('example.previewNote')}</p><ul class="wing-facts">${t('example.previewFacts').split('|').map(line=>`<li>${line}</li>`).join('')}</ul>`}
    <footer><a href="${link(project)}" data-project-id="${project.id}" data-example-open>${t(i?'projects.play':'projects.open')}</a></footer>`:''}
   </article>`;
  }).join('')+'</div>';
  if(lastWings)position({wings:lastWings});
  restoreScroll();
  if(focused)panel.querySelector(`[data-focus="${focused}"]`)?.focus({preventScroll:true});
 }
 const distance=()=>{const [a,b]=[...touches.values()];return Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));};
 panel.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch')return;
  if(!touches.size){pinched=false;}
  touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(touches.size===2){pinchDistance=distance();pinched=true;}
 });
 panel.addEventListener('pointermove',event=>{
  if(!touches.has(event.pointerId))return;
  touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(touches.size===2){const next=distance();stage?.zoomProjectPreview(Math.log(pinchDistance/next));pinchDistance=next;}
 });
 function finish(event){
  touches.delete(event.pointerId);
 }
 panel.addEventListener('pointerup',finish);panel.addEventListener('pointercancel',finish);
 panel.addEventListener('click',event=>{if(pinched&&event.detail>0){event.preventDefault();event.stopPropagation();pinched=false;}},true);
 panel.addEventListener('click',event=>{
  if(event.defaultPrevented||suspended||!stage||mobile.matches||event.target.closest('a'))return;
  const wing=event.target.closest('[data-wing]');
  if(wing)onNavigate?.(`projekte/${wing.dataset.wing}/nahansicht`);
 });
 panel.addEventListener('wheel',event=>{if(!(stage&&!suspended&&!mobile.matches))return;event.preventDefault();if((event.buttons&1)===0&&!event.ctrlKey&&!event.metaKey)return;const unit=event.deltaMode===1?18:event.deltaMode===2?innerHeight:1;stage.zoomProjectPreview(event.deltaY*unit/innerHeight);},{passive:false});
 function resize(){savedScroll=0;panel.classList.toggle('is-spatial',Boolean(stage)&&!mobile.matches);panel.querySelector('.project-book-sheets')?.scrollTo(0,0);syncVisibility();if(lastWings)position({wings:lastWings});}
 mobile.addEventListener('change',resize);
 const unsubscribe=onLanguageChange(render);
 return {
  setRoute(next){const wasOpen=open();route=next;cancelAnimationFrame(timer);render();savedScroll=0;panel.querySelector('.project-book-sheets')?.scrollTo(0,0);syncVisibility();
   if(!open()){panel.hidden=true;return;}
   function reveal(){if(suspended){panel.hidden=true;return;}if(stage?.isMoving&&!wasOpen){timer=requestAnimationFrame(reveal);return;}panel.hidden=false;}
   if(wasOpen)reveal();else timer=requestAnimationFrame(reveal);
  },
  setSuspended(value){if(value)rememberScroll();suspended=Boolean(value);cancelAnimationFrame(timer);touches.clear();panel.hidden=suspended||!open();restoreScroll();},
  dispose(){cancelAnimationFrame(timer);unsubscribe();mobile.removeEventListener('change',resize);stage?.setExamplePreviewUpdate(null);panel.remove();}
 };
}
