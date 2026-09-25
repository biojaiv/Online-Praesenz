import { getLanguage, setLanguage } from '../i18n.js';
const params = new URLSearchParams(location.search);
const embedded = parent !== window && params.get('embed') === '1';
const lang = document.body.dataset.language;
const controller = new AbortController(), signal = controller.signal;
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
const animations = new Set();
let userReduced = params.get('motion') === 'off', introTimer = 0, previewTicket = 0;
let visible = !embedded, introPlayed = false;
try { userReduced ||= sessionStorage.getItem('knallblau-motion') === 'reduce'; introPlayed = sessionStorage.getItem('knallblau-intro') === 'seen'; } catch {}
const reduced = () => userReduced || systemMotion.matches;
const post = (type, data={}) => { if (embedded) parent.postMessage({ type:`example:${type}`, ...data }, location.origin); };
const on = (node,event,handler,options={}) => node?.addEventListener(event,handler,{...options,signal});
const animate = (node,frames,options={}) => {
 if (!node?.animate || reduced() || !visible || document.hidden) return null;
 const animation = node.animate(frames,{duration:600,easing:'cubic-bezier(.22,.7,.2,1)',...options});
 animations.add(animation);
 animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));
 return animation;
};
function settleIntro(focus=false) {
 clearTimeout(introTimer);
 for (const a of [...animations]) a.cancel();
 document.documentElement.removeAttribute('data-opening');
 const skip=document.querySelector('[data-intro-skip]');if(skip)skip.hidden=true;
 if(focus) { const target=document.querySelector('#hero-title');target?.setAttribute('tabindex','-1');target?.focus({preventScroll:true}); }
}
function syncMotion() {
 document.documentElement.dataset.reduced=String(reduced());
 const button=document.querySelector('[data-motion-toggle]');
 button.hidden=false;button.setAttribute('aria-pressed',String(reduced()));
 button.textContent=systemMotion.matches?button.dataset.system:userReduced?button.dataset.restore:button.dataset.reduce;
 button.setAttribute('aria-disabled',String(systemMotion.matches));
 if(reduced())settleIntro();
 const motif=document.querySelector('[data-motif]');if(motif){motif.disabled=false;motif.setAttribute('aria-disabled',String(reduced()));}
 const replay=document.querySelector('[data-intro-replay]');if(replay){replay.hidden=false;replay.disabled=reduced();}
}
function intro() {
 settleIntro(); if(reduced()||document.body.dataset.kind!=='home'||!visible)return;
 document.documentElement.dataset.opening='true';
 document.querySelector('[data-intro-skip]').hidden=false;
 try{sessionStorage.setItem('knallblau-intro','seen');}catch{}
 animate(document.querySelector('.motif-body'),[{transform:'translateY(-22px)'},{transform:'translateY(2px)',offset:.42},{transform:'translateY(0)'}],{duration:1200});
 animate(document.querySelector('.motif-oval'),[{transform:'scaleX(.8)'},{transform:'scaleX(1.22)',offset:.4},{transform:'scaleX(1)'}],{delay:250,duration:900});
 animate(document.querySelector('.facet-left'),[{transform:'translateX(14px)'},{transform:'translateX(-4px)',offset:.65},{transform:'translateX(0)'}],{delay:500,duration:1400});
 animate(document.querySelector('.facet-right'),[{transform:'translateX(-12px)'},{transform:'translateX(4px)',offset:.65},{transform:'translateX(0)'}],{delay:500,duration:1450});
 for(const [i,line] of [...document.querySelectorAll('#hero-title span')].entries())animate(line,[{clipPath:'polygon(0 0,0 0,0 100%,0 100%)'},{clipPath:'polygon(0 0,100% 0,100% 100%,0 100%)'}],{delay:650+i*100,duration:600,fill:'backwards'});
 animate(document.querySelector('.hero-copy .lead'),[{opacity:0},{opacity:1}],{delay:1000,duration:500,fill:'backwards'});
 introTimer=setTimeout(()=>settleIntro(),2300); // Independent fail-open boundary.
}
on(document.querySelector('[data-intro-skip]'),'click',event=>settleIntro(event.detail===0));
on(document.querySelector('[data-intro-replay]'),'click',intro);
on(document.querySelector('[data-motion-toggle]'),'click',()=>{
 if(systemMotion.matches)return;
 userReduced=!userReduced;try{sessionStorage.setItem('knallblau-motion',userReduced?'reduce':'allow');}catch{}syncMotion();
});
on(systemMotion,'change',syncMotion);
on(document.querySelector('[data-motif]'),'click',()=>{
 settleIntro();if(reduced())return;
 animate(document.querySelector('.facet-front'),[{transform:'translate(0,0)'},{transform:'translate(5px,-5px)',offset:.4},{transform:'translate(0,0)'}],{duration:850});
});
on(document.querySelector('[data-motif]'),'pointerenter',()=>{
 if(document.documentElement.dataset.opening)return;
 animate(document.querySelector('.facet-glint'),[{opacity:1},{opacity:.75,offset:.45},{opacity:1}],{duration:750});
},{once:true});

// Native links remain complete without JavaScript. Embedded navigation carries its mode.
if(embedded)for(const link of document.querySelectorAll('a[href]')) {
 const url=new URL(link.href);if(url.origin===location.origin&&url.pathname.startsWith('/beispiele/knallblau/')){url.searchParams.set('embed','1');link.href=url.href;}
}
on(document,'click',event=>{
 const link=event.target.closest('a[href]');if(!link)return;
 settleIntro();
 const url=new URL(link.href);
 if(link.matches('[data-language-link]')) {setLanguage(lang==='de'?'en':'de');post('language',{language:lang==='de'?'en':'de'});}
 if(url.origin===location.origin && url.pathname===location.pathname && url.hash) {
  const target=document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if(!target)return;event.preventDefault();
  history.pushState(null,'',url.pathname+url.search+url.hash);
  const far=Math.abs(target.getBoundingClientRect().top)>innerHeight*1.4;
  if(far&&link.matches('[data-top]')&&!reduced())animate(document.querySelector('main'),[{opacity:.75},{opacity:1}],{duration:250});
  target.scrollIntoView({behavior:reduced()||far?'instant':'smooth',block:'start'});
  target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
 }
});

// Preview changes never clear the old image while the next asset is loading.
const preview=document.querySelector('.project-screen');
async function selectProject(story) {
 if(!story||!preview)return;
 for(const link of document.querySelectorAll('[data-project-choice]'))link.setAttribute('aria-current',String(link.dataset.projectChoice===story.id));
 const ticket=++previewTicket;
 const next=new Image(1200,800);next.alt=story.dataset.title;next.src=story.dataset.preview;
 try{await next.decode();}catch{return;}
 if(ticket!==previewTicket||signal.aborted)return;
 preview.replaceChildren(next);document.querySelector('[data-preview-title]').textContent=story.dataset.title;
 if(!reduced())animate(next,[{clipPath:'polygon(0 0,85% 0,100% 20%,100% 100%,0 100%)',opacity:.7},{clipPath:'polygon(0 0,100% 0,100% 0,100% 100%,0 100%)',opacity:1}],{duration:550});
}
let projectObserver,contactObserver;
if('IntersectionObserver' in window){
 document.body.classList.add('enhanced');
 projectObserver=new IntersectionObserver(entries=>{
  const active=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(active)selectProject(active.target);
 },{rootMargin:'-20% 0px -40% 0px',threshold:[0,.25,.5]});
 document.querySelectorAll('[data-project]').forEach(s=>projectObserver.observe(s));
 contactObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){animate(e.target,[{clipPath:'polygon(100% 0,100% 100%,100% 100%,100% 0)'},{clipPath:'polygon(100% 0,100% 100%,10% 100%,55% 20%)'}],{duration:750});contactObserver.unobserve(e.target);}},{threshold:.15});
 const contact=document.querySelector('.contact-facet');if(contact)contactObserver.observe(contact);
}
on(document.querySelector('.work-index'),'click',e=>{const link=e.target.closest('[data-project-choice]');if(link)selectProject(document.getElementById(link.dataset.projectChoice));});

for(const form of document.querySelectorAll('[data-demo-form]')) {
 const submit=form.querySelector('[data-demo-submit]');submit.disabled=false;
 const status=form.querySelector('.form-status');
 function validate(field){
  const valid=field.checkValidity()&&Boolean(field.value.trim());
  field.setAttribute('aria-invalid',String(!valid));
  document.getElementById(field.name+'-error').textContent=valid?'':form.dataset[field.name+'Error'];return valid;
 }
 for(const field of form.querySelectorAll('[required]')) {
  on(field,'blur',()=>validate(field));
  on(field,'input',()=>{status.textContent='';if(field.getAttribute('aria-invalid')==='true')validate(field);});
 }
 on(form,'submit',event=>{
  event.preventDefault();settleIntro();const invalid=[...form.querySelectorAll('[required]')].filter(field=>!validate(field));
  status.textContent=invalid.length?'':form.dataset.success;if(invalid[0])invalid[0].focus();
 });
}
const filters=document.querySelector('.gallery-filters');if(filters)filters.hidden=false;
on(filters,'click',e=>{
 const button=e.target.closest('[data-filter]');if(!button)return;
 for(const b of filters.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));
 for(const card of document.querySelectorAll('[data-category]'))card.hidden=button.dataset.filter!=='all'&&card.dataset.category!==button.dataset.filter;
});
on(document,'keydown',event=>{if(embedded&&event.key==='Escape'){event.preventDefault();post('close');}});
on(document,'visibilitychange',()=>{for(const a of animations)document.hidden?a.pause():visible&&a.play();});
on(window,'message',event=>{
 if(!embedded||event.origin!==location.origin||event.source!==parent)return;
 if(event.data?.type==='example:visible'){visible=true;for(const a of animations)if(!document.hidden)a.play();}
 if(event.data?.type==='example:pause'){visible=false;for(const a of animations)a.pause();}
});
on(window,'pagehide',()=>{settleIntro();projectObserver?.disconnect();contactObserver?.disconnect();});
on(window,'pageshow',event=>{if(event.persisted)document.querySelectorAll('[data-project]').forEach(story=>projectObserver?.observe(story));});
syncMotion();
if(embedded)post('ready',{path:location.pathname});
else if(!params.has('lang')&&lang==='de'&&getLanguage()==='en') {
 const target=new URL(location.href);target.pathname=target.pathname.replace('/beispiele/knallblau/','/beispiele/knallblau/en/');target.searchParams.set('lang','en');location.replace(target.href);
} else if(!introPlayed&&!location.hash&&!reduced()&&performance.now()<650&&document.fonts.check('700 16px "Barlow Condensed"')) intro();
if(import.meta.hot)import.meta.hot.dispose(()=>{controller.abort();settleIntro();projectObserver?.disconnect();contactObserver?.disconnect();});
