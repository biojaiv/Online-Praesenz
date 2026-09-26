import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLanguage, setLanguage, onLanguageChange } from '../i18n.js';
import { copy, number, escapeHTML as e } from './content.js';
import { illustration, packetPosition, packetRoute, cubeFaces } from './illustration.js';
import { AXIS, JUNCTION } from './diagramLayout.js';
import { chapterMarkup } from './reading.js';
import { createJourney } from './state.js';
import { createAnnotations } from './annotations.js';

/** Scenario clock: seconds since 08:00 at the start of each chapter, then ready. */
const CHAPTER_SECONDS=[0,65,68,120,1100,1200,1920,2100];

gsap.registerPlugin(ScrollTrigger);

export function startTiefgang() {
  const params = new URLSearchParams(location.search);
  if (['en','de'].includes(params.get('lang'))) setLanguage(params.get('lang'));
  const embedded = window.parent!==window && params.get('embedded')==='1';
  const root = document.getElementById('example');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup = ()=>{}, manualReading = false;
  const post = (type, data={}) => { if(embedded) parent.postMessage({type:`example:${type}`,...data},location.origin); };

  function render(savedChapter = 0) {
    cleanup();
    const c=copy[getLanguage()], language=getLanguage(), reading=motion.matches||manualReading;
    document.documentElement.lang=language;
    document.documentElement.classList.toggle('scroll-mode',!reading);
    document.documentElement.classList.toggle('reading-mode',reading);
    document.title=`Tiefgang — ${c.tagline} · Vladimir Leicht`;
    document.querySelector('meta[name="description"]').content=c.tagline;
    root.innerHTML=`<div class="experience">
      <header class="masthead"><a class="wordmark" href="#chapter-1" data-jump="0">TIEFGANG<span aria-hidden="true">■</span></a>
        <p>${c.tagline}</p><div class="head-actions"><button id="example-language" aria-label="${language==='de'?'Switch to English':'Auf Deutsch wechseln'}">${language==='de'?'EN':'DE'}</button></div>
      </header>
      <div class="workspace">
        <aside class="story"><p class="eyebrow" id="chapter-kicker"></p><h1><span class="story-time"></span><span class="story-title"></span></h1><p class="story-text"></p>
          <nav class="chapter-nav" aria-label="${c.chapters}">${c.chaptersData.map((row,i)=>`<a href="#chapter-${i+1}" data-jump="${i}"><span>${number(i)}</span><i aria-hidden="true"></i><span>${e(row[0])}</span>${i===3||i===5?'<b aria-hidden="true">↗</b>':''}</a>`).join('')}</nav>
          <a class="project-link story-project" href="/#abschluss" data-portfolio="abschluss" hidden>${c.project}</a>
          <button class="reading-switch">${reading?c.immersive:c.reading} ↗</button>
        </aside>
        <figure class="stage"><div class="drawing-wrap">${illustration(c)}<div class="mobile-layer-tag source-backup-caption"><span class="tag-number">01</span><span class="tag-text">${c.labels[0]}</span></div></div>
          <figcaption><span class="sr-only">${c.figure}</span><button class="vm-open" data-vm aria-expanded="false">${c.vm} +</button></figcaption>
          <section class="interaction-card dhcp-card" aria-labelledby="dhcp-heading" hidden><div class="card-top"><span id="dhcp-heading">DHCP / <b class="dhcp-count">01</b> — 04</span><span class="dhcp-code"></span></div><p class="dhcp-speaker"></p><p class="dhcp-sentence" aria-live="polite"></p><div class="dhcp-actions"><button data-dhcp>${c.dhcpNext} →</button><button class="dhcp-replay" data-replay hidden>↺ <span class="sr-only">${c.dhcpReplay}</span></button></div><small class="dhcp-status"></small></section>
          <section class="interaction-card vm-card" hidden aria-labelledby="vm-heading"><div class="card-top"><h2 id="vm-heading">${c.vmTitle}</h2><button data-vm aria-label="${c.close}">×</button></div><p>${c.vmText}</p><code>${c.vmSpecs}</code><a class="project-link" data-portfolio="abschluss" href="/#abschluss">${c.project}</a></section>
          <section class="completion" hidden><p class="eyebrow">JANA-01 / READY</p><h2>${c.ready}</h2><p>${c.readyText}</p><p class="manual-time">${c.manual}</p><small>${c.modelNote}</small><a class="project-link" href="/#abschluss" data-portfolio="abschluss">${c.project}</a><button data-restart>${c.restart}</button></section>
        </figure>
        <aside class="protocol"><div class="protocol-inner"><div class="protocol-title"><span class="status-dot"></span><h2>${c.log}</h2><span class="live-count">01/07</span></div>
          <ol class="log-lines" aria-label="${c.log}"></ol><p class="log-announcement sr-only" role="status"></p>
          <div class="cable-control"><button data-cable role="switch" aria-checked="false" aria-describedby="link-status"><span class="plug-icon" aria-hidden="true">↯</span><span class="cable-label">${c.cable}</span><span class="toggle" aria-hidden="true"></span></button><p class="cable-question">${c.cableHint}</p><p id="link-status" role="status">${c.primary}</p></div>
          <div class="counter"><output class="time">00:00:00</output><p>${c.elapsed}</p><div class="progress-row"><progress max="100" value="0" aria-label="${c.elapsed}"></progress><span class="percentage">0%</span></div><small>${c.simulation}</small></div>
        </div><p class="signature">VL / VLADIMIR LEICHT<br><span>SYSTEMS INTEGRATION · 2026</span></p></aside>
      </div>
      <footer class="depth"><div class="depth-scale">${c.layers.map(label=>`<span>${label}</span>`).join('')}<i class="depth-needle" aria-hidden="true"></i></div><div class="scroll-controls"><button data-prev aria-label="${c.previous}">↑</button><span>${c.scroll}</span><button data-next aria-label="${c.next}">↓</button></div></footer>
    </div>
    <main class="chapter-track" ${!reading?'aria-hidden="true" inert':''}>${chapterMarkup(c,language)}</main>`;

    const $=selector=>root.querySelector(selector), $$=selector=>[...root.querySelectorAll(selector)];
    const scene=$('.infrastructure');
    const abort=new AbortController(), {signal}=abort;
    let lastChapter=-1, lastLog='', lastState='', parentPaused=false;
    let scrollTrigger=null;
    const annotations=createAnnotations(root);
    let shown=null, packetLink=null, travel=0, routeFrame=0, lostTimer=0, pending=null;
    const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
    const packet=()=>$('.stage .packet');
    function placePacket(point) {
      if(shown) travel+=Math.hypot(point.x-shown.x,point.y-shown.y);
      shown=point;
      packet().setAttribute('transform',`translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
      $('.stage .packet .cube').innerHTML=cubeFaces(Math.PI/4+travel/24).map(f=>`<path class="cube-face ${f.kind}" d="${f.d}"/>`).join('');
    }
    function stopRoute() {
      cancelAnimationFrame(routeFrame); clearTimeout(lostTimer); routeFrame=lostTimer=0;
      packet()?.classList.remove('is-lost');
    }
    function runRoute(points, ease) {
      const lengths=[0];
      for(let i=1;i<points.length;i++) lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
      const total=lengths.at(-1), duration=Math.min(1500,Math.max(520,total*9)), start=performance.now();
      const finish=()=>{ routeFrame=0; if(pending) { const next=pending; pending=null; placePacket(next); } };
      if(total<1) { placePacket(points.at(-1)); finish(); return; }
      const step=now=>{
        const t=Math.min(1,(now-start)/duration), distance=ease(t)*total;
        let i=1; while(i<lengths.length-1&&lengths[i]<distance) i++;
        const span=lengths[i]-lengths[i-1]||1, f=(distance-lengths[i-1])/span;
        placePacket({x:points[i-1].x+(points[i].x-points[i-1].x)*f,y:points[i-1].y+(points[i].y-points[i-1].y)*f});
        if(t<1) routeFrame=requestAnimationFrame(step); else finish();
      };
      routeFrame=requestAnimationFrame(step);
    }
    const easeInOut=t=>t<.5?4*t*t*t:1-(-2*t+2)**3/2, easeOut=t=>1-(1-t)**3;
    /** Link changes travel along the cabling; scrolling stays directly coupled.
     *  A packet caught on the broken uplink is lost and the switch resends it via B. */
    function movePacket(target, link) {
      const fromLink=packetLink, changed=fromLink!==null&&link!==fromLink;
      packetLink=link;
      if((routeFrame||lostTimer)&&!changed) { pending=target; return; }
      stopRoute(); pending=null;
      if(!shown||!changed||reduceMotion.matches) { placePacket(target); return; }
      if(fromLink==='failing'&&link==='backup'&&shown.x!==AXIS) {
        packet().classList.add('is-lost');
        lostTimer=setTimeout(()=>{
          lostTimer=0; shown=null;
          placePacket({x:AXIS,y:JUNCTION});
          packet().classList.remove('is-lost');
          runRoute(packetRoute(shown,target,'backup','backup'),easeInOut);
        },320);
        return;
      }
      runRoute(packetRoute(shown,target,fromLink,link),link==='failing'?easeOut:easeInOut);
    }
    const journey=createJourney(update);
    function update(state) {
      const {chapter,dhcp,link,vm,lease,progress}=state;
      const ready=chapter===6&&progress>.97&&link!=='failing';
      state.ready=ready;
      const chapterChanged=chapter!==lastChapter;
      if(chapterChanged) {
        const data=c.chaptersData[chapter];
        $('#chapter-kicker').textContent=`${c.chapters.toUpperCase()} ${number(chapter)} / 07 · ${data[0].toUpperCase()}`;
        $('.story-time').textContent=`${data[1]}${language==='de'?' Uhr.':''}`;
        $('.story-title').textContent=data[2]; $('.story-text').textContent=data[3];
        $$('.chapter-nav a').forEach((a,i)=>{a.classList.toggle('is-current',i===chapter); if(i===chapter)a.setAttribute('aria-current','step'); else a.removeAttribute('aria-current');});
        $('.story-project').hidden=![3,5,6].includes(chapter);
        $('.live-count').textContent=`${number(chapter)}/07`;
        scene.dataset.unpacked=String(chapter>0);
        $$('.stage .tag-number').forEach(label=>label.textContent=number(chapter)); $$('.stage .tag-text').forEach(label=>label.textContent=c.labels[chapter]);
        scene.dataset.final=String(chapter===6);
        $$('[data-slot]').forEach((slot,i)=>slot.classList.toggle('is-slot-active',i===({2:0,3:1,4:0,5:2,6:3})[chapter]));
        $('[data-prev]').disabled=chapter===0; $('[data-next]').disabled=chapter===6;
        lastChapter=chapter;
      }
      const signature=[chapter,dhcp,link,vm,ready].join('/');
      if(signature!==lastState) {
        $('.dhcp-card').hidden=chapter!==2||vm;
        $('.vm-card').hidden=!vm;
        $('.completion').hidden=!ready||vm;
        $('.stage').classList.toggle('is-ready',ready);
        $('.stage').classList.toggle('vm-is-open',vm);
        scene.dataset.link=link;
        const line=c.dhcp[dhcp];
        $('.dhcp-count').textContent=number(dhcp); $('.dhcp-code').textContent=line[0];
        $('.dhcp-speaker').textContent=line[1]; $('.dhcp-sentence').textContent=line[2];
        $('.dhcp-status').textContent=lease?c.dhcpDone:c.dhcpHint;
        $('[data-dhcp]').textContent=lease?`${c.next} →`:`${c.dhcpNext} →`;
        $('[data-dhcp]').disabled=link==='failing'; $('[data-replay]').hidden=!lease;
        const cable=$('[data-cable]'); cable.disabled=chapter===0; cable.setAttribute('aria-checked',String(link!=='primary'));
        $('.cable-label').textContent=link==='primary'?c.cable:c.reconnect;
        $('#link-status').textContent=chapter===0?c.cableUnavailable:link==='failing'?c.failing:link==='backup'?c.backup:c.primary;
        $('.protocol').dataset.link=link;
        $$('[data-vm]').forEach(button=>button.setAttribute('aria-expanded',String(vm)));
        lastState=signature;
      }
      const rows=journey.logs(), logKey=JSON.stringify(rows);
      if(logKey!==lastLog) {
        $('.log-lines').innerHTML=rows.map(row=>`<li class="${row.kind}">${e(row.text)}</li>`).join('');
        $('.log-announcement').textContent=rows.at(-1)?.text||''; lastLog=logKey;
      }
      const phase=Math.max(0,Math.min(7,progress*6.5)), step=Math.min(6,Math.floor(phase));
      let seconds=Math.round(CHAPTER_SECONDS[step]+(CHAPTER_SECONDS[step+1]-CHAPTER_SECONDS[step])*(phase-step));
      if(chapter===2&&!lease) seconds=Math.min(seconds,CHAPTER_SECONDS[2]+dhcp);
      seconds=ready?2100:Math.min(2099,seconds);
      $('.time').textContent=`00:${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
      const percent=ready?100:Math.min(99,Math.round(seconds/21));
      $('progress').value=percent; $('.percentage').textContent=`${percent}%`;
      $('.depth-needle').style.left=`${percent}%`;
      movePacket(packetPosition({ progress, chapter, lease, link, rerouted: state.rerouted }), link);
      $('.stage .packet').classList.toggle('is-paused',link==='failing');
      $('.stage .packet').style.opacity=ready?'0':'1';
      annotations.update(state);

    }
    function go(chapter) {
      const index=Math.max(0,Math.min(6,chapter));
      const section=$(`#chapter-${index+1}`);
      section.scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'start'});
      if(reading) journey.chapter(index,index/6);
    }
    function syncScroll() {
      if(reading) return;
      const height=innerHeight, position=scrollY/height;
      const chapter=Math.max(0,Math.min(6,Math.floor(position+.35)));
      journey.chapter(chapter,Math.max(0,Math.min(1,position/6.5)));
    }
    scrollTrigger=ScrollTrigger.create({trigger:$('.chapter-track'),start:'top top',end:'bottom bottom',onUpdate:syncScroll,onRefresh:syncScroll});
    root.addEventListener('click',event=>{
      const target=event.target.closest('button,a,[data-vm]'); if(!target)return;
      if(target.matches('[data-jump]')) {event.preventDefault();go(Number(target.dataset.jump));}
      else if(target.matches('[data-prev]'))go(journey.state.chapter-1);
      else if(target.matches('[data-next]'))go(journey.state.chapter+1);
      else if(target.matches('[data-dhcp]')) {if(journey.state.lease)go(3);else journey.dhcpNext();}
      else if(target.matches('[data-replay]'))journey.dhcpReplay();
      else if(target.matches('[data-cable]'))journey.cable();
      else if(target.matches('[data-vm]'))journey.vm();
      else if(target.matches('[data-restart]'))go(0);
      else if(target.id==='example-language') {setLanguage(language==='de'?'en':'de');post('language',{language:getLanguage()});}
      else if(target.matches('.reading-switch')) {manualReading=!reading;if(motion.matches)manualReading=true;render(journey.state.chapter);}
      else if(target.matches('[data-portfolio]')&&embedded) {event.preventDefault();post('navigate',{route:target.dataset.portfolio});}
    },{signal});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape') {
        event.preventDefault();
        if(journey.state.vm)journey.vm();else post('close');
      }
      if((event.key==='Enter'||event.key===' ')&&event.target.matches('g[data-vm]')) {event.preventDefault();journey.vm();}
      if(['PageDown','PageUp','Home','End'].includes(event.key)&&!reading&&!/INPUT|TEXTAREA/.test(event.target.tagName)) {
        event.preventDefault(); go(event.key==='Home'?0:event.key==='End'?6:journey.state.chapter+(event.key==='PageDown'?1:-1));
      }
    },{signal});
    const pause=()=>journey.pause(document.hidden||parentPaused);
    document.addEventListener('visibilitychange',pause,{signal});
    window.addEventListener('message',event=>{
      if(!embedded||event.origin!==location.origin||event.source!==parent)return;
      if(event.data?.type==='example:pause')parentPaused=true;
      if(event.data?.type==='example:visible')parentPaused=false;
      pause();
    },{signal});
    if(reading) {
      $('.reading-switch').hidden=motion.matches;
      journey.chapter(savedChapter,savedChapter/6);
    } else { scrollTo({top:savedChapter*innerHeight,behavior:'instant'});syncScroll(); }
    cleanup=()=>{stopRoute();abort.abort();annotations.dispose();journey.dispose();scrollTrigger?.kill();};
    post('ready');
  }
  render();
  const offLanguage=onLanguageChange(()=>{const chapter=Number(root.querySelector('.chapter-nav [aria-current]')?.dataset.jump||0);render(chapter);root.querySelector('#example-language')?.focus({preventScroll:true});});
  const onMotion=()=>render(); motion.addEventListener('change',onMotion);
  window.addEventListener('pagehide',event=>{if(!event.persisted){cleanup();offLanguage();motion.removeEventListener('change',onMotion);}});
}
