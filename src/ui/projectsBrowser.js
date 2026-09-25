import { t, getLanguage, onLanguageChange } from '../i18n.js';
import { projectsIn, getProjectUrl } from '../data/projects.js';
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
export function createProjectsBrowser({container,stage}){
 const panel=document.createElement('section');panel.className='projects-browser project-book-ui';panel.hidden=true;
 panel.setAttribute('aria-label',t('example.label'));container.append(panel);
 const mobile=matchMedia('(max-width:650px)');
 let route='home',suspended=false,timer=0,lastWings=null,pinched=false;
 const touches=new Map();let pinchDistance=0;
 const open=()=>route.startsWith('projekte');
 function syncVisibility(){stage?.cards.showProjectPreview(!open()||!mobile.matches);}
 function position({wings,zoom=1}){
  lastWings=wings;
  if(mobile.matches){panel.style.setProperty('--sheet-zoom',Math.max(.7,Math.min(1.7,zoom)).toFixed(3));return;}
  if(!stage)return;
  for(const wing of wings){const el=panel.querySelector(`[data-wing="${wing.section}"]`);if(el)el.style.transform=sheetTransform(wing.corners);}

 }
 stage?.setExamplePreviewUpdate(position);
 function render(){
  const focused=panel.contains(document.activeElement)?document.activeElement.dataset.focus:null;
  panel.classList.toggle('is-flat',!stage);panel.classList.toggle('is-spatial',Boolean(stage)&&!mobile.matches);panel.setAttribute('aria-label',t('example.label'));
  panel.innerHTML='<div class="project-book-sheets">'+['webseiten','systemintegration'].map((category,i)=>{
   const projects=projectsIn(category),project=projects[0];
   const link=p=>getProjectUrl(p,getLanguage());
   return `<article class="project-wing" data-wing="${category}" aria-label="${t(i?'projects.integration':'projects.websites')}">
    <header><span>VL // 02 · ${i?'B':'A'}</span></header>
    <h2 class="wing-heading">${t(i?'projects.integration':'projects.websites')}</h2>
    <p class="wing-subtitle">${t(i?'projects.infrastructure':'projects.design')}</p>
    <a class="wing-preview" href="${link(project)}" data-project-id="${project.id}" data-example-open data-focus="preview-${category}" aria-label="${t(project.title)} · ${t('projects.open')}"><img src="${project.preview(getLanguage())}" alt=""/><span>${t(i?'projects.play':'projects.open')}</span></a>
    <p class="wing-tech">${i?'DEBIAN · KVM · NFTABLES':'SVG · GSAP · JAVASCRIPT · XTERM.JS'}</p>
    <ul class="wing-projects">${projects.map(p=>`<li><a href="${link(p)}" data-project-id="${p.id}" data-example-open data-focus="project-${p.id}"><span aria-hidden="true">◇</span> ${t(p.title)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul>
    ${i?`<p class="wing-planned">${t('recovery.planned')}</p><p class="wing-description">${t('recovery.short')}</p><p class="wing-tools">PostgreSQL · Restic · Ansible</p>`:`<p class="wing-description">${t('example.previewNote')}</p><ul class="wing-facts">${t('example.previewFacts').split('|').map(line=>`<li>${line}</li>`).join('')}</ul>`}
    <footer><a href="${link(project)}" data-project-id="${project.id}" data-example-open>${t(i?'projects.play':'projects.open')}</a></footer>
   </article>`;
  }).join('')+'</div>';
  if(lastWings)position({wings:lastWings});
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
 panel.addEventListener('wheel',event=>{if(stage&&!suspended&&!mobile.matches){event.preventDefault();const unit=event.deltaMode===1?18:event.deltaMode===2?innerHeight:1;stage.zoomProjectPreview(event.deltaY*unit/innerHeight);}},{passive:false});
 function resize(){panel.classList.toggle('is-spatial',Boolean(stage)&&!mobile.matches);panel.querySelector('.project-book-sheets')?.scrollTo(0,0);syncVisibility();if(lastWings)position({wings:lastWings});}
 mobile.addEventListener('change',resize);
 const unsubscribe=onLanguageChange(render);
 return {
  setRoute(next){const wasOpen=open();route=next;cancelAnimationFrame(timer);render();panel.querySelector('.project-book-sheets')?.scrollTo(0,0);syncVisibility();
   if(!open()){panel.hidden=true;return;}
   function reveal(){if(suspended){panel.hidden=true;return;}if(stage?.isMoving&&!wasOpen){timer=requestAnimationFrame(reveal);return;}panel.hidden=false;}
   if(wasOpen)reveal();else timer=requestAnimationFrame(reveal);
  },
  setSuspended(value){suspended=Boolean(value);cancelAnimationFrame(timer);touches.clear();panel.hidden=suspended||!open();},
  dispose(){cancelAnimationFrame(timer);unsubscribe();mobile.removeEventListener('change',resize);stage?.setExamplePreviewUpdate(null);panel.remove();}
 };
}
