import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLanguage, setLanguage, onLanguageChange } from '../i18n.js';
import { copy, number, escapeHTML as e } from './content.js';
import { illustration, packetPosition, packetRoute, cubeFaces } from './illustration.js';
import { AXIS, JUNCTION } from './diagramLayout.js';
import { chapterMarkup } from './reading.js';
import { createJourney } from './state.js';
import { createAnnotations } from './annotations.js';
import { createCablePin } from './cablePin.js';
import { richText } from './glossary.js';
import { diagramLabels, createDiagramLabels } from './diagramLabels.js';

/** Scenario clock: seconds since 08:00 at the start of each chapter, then ready. */
const CHAPTER_SECONDS=[0,65,68,120,1100,1200,1920,2100];

gsap.registerPlugin(ScrollTrigger);

export function startTiefgang() {
  const params = new URLSearchParams(location.search);
  if (['en','de'].includes(params.get('lang'))) setLanguage(params.get('lang'));
  const embedded = window.parent!==window && params.get('embedded')==='1';
  const root = document.getElementById('example');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup = ()=>{}, manualReading = false, logMode = 'plain', depthMode = 'simple', introDismissed = false;
  const post = (type, data={}) => { if(embedded) parent.postMessage({type:`example:${type}`,...data},location.origin); };

  function render(savedChapter = 0) {
    cleanup();
    const c=copy[getLanguage()], language=getLanguage(), reading=motion.matches||manualReading;
    document.documentElement.lang=language;
    document.documentElement.classList.toggle('scroll-mode',!reading);
    document.documentElement.classList.toggle('reading-mode',reading);
    root.innerHTML=`<div class="experience">
      <header class="masthead"><a class="wordmark" href="#chapter-1" data-jump="0">TIEFGANG<span aria-hidden="true">■</span></a>
        <p>${c.tagline}</p><div class="head-actions"><a class="explain-link glossary-link" href="/beispiel/erklaert/${language==='en'?'en/':''}#glossary"${embedded?' target="_blank" rel="noopener"':''}>${language==='de'?'Glossar':'Glossary'}</a><a class="explain-link" href="/beispiel/erklaert/${language==='en'?'en/':''}"${embedded?' target="_blank" rel="noopener"':''}>${c.explain}</a><button id="example-language" aria-label="${language==='de'?'Switch to English':'Auf Deutsch wechseln'}">${language==='de'?'EN':'DE'}</button></div>
      </header>
      <div class="workspace">
        <aside class="story"><p class="eyebrow" id="chapter-kicker"></p><h1><span class="story-time"></span><span class="story-title"></span></h1>
          <select class="chapter-picker" aria-label="${c.chapters}">${c.chaptersData.map((row,i)=>`<option value="${i}">${number(i)} · ${e(row[0])}</option>`).join('')}</select>
          <div class="depth-switch" role="group" aria-label="${c.depthMode}"><span aria-hidden="true">${c.depthMode}</span>${[['simple',c.depthSimple],['explained',c.depthExplained],['tech',c.depthTech]].map(([key,label])=>`<button type="button" data-depth="${key}" aria-pressed="${depthMode===key}">${label}</button>`).join('')}</div>
          <div class="story-explanation"><p class="simple-caption">${c.simpleLabel}</p><p class="story-text"></p><div class="term-chips"></div></div>
          <nav class="chapter-nav" aria-label="${c.chapters}">${c.chaptersData.map((row,i)=>`<a href="#chapter-${i+1}" data-jump="${i}"><span>${number(i)}</span><i aria-hidden="true"></i><span>${e(row[0])}</span>${i===3||i===5?`<b aria-hidden="true" title="${e(c.projectRef)}">↗</b>`:''}</a>`).join('')}</nav>
          <a class="project-link story-project" href="/#abschluss" data-portfolio="abschluss" hidden>${c.project}</a>
          <button class="reading-switch">${reading?c.immersive:c.reading} ↗</button>
        </aside>
        <figure class="stage"><div class="drawing-wrap">${illustration(c)}${diagramLabels(language)}<div class="mobile-layer-tag source-backup-caption"><span class="tag-number">01</span><span class="tag-text">${c.labels[0]}</span></div></div>
          <figcaption><span>${c.figure}</span><button class="vm-open" data-vm aria-expanded="false">${c.vm} +</button></figcaption>
          <section class="interaction-card intro-card" aria-labelledby="intro-heading" hidden><div class="card-top"><span id="intro-heading">${c.introKicker} / 08:00</span><button data-intro-close aria-label="${c.introClose}">×</button></div><h2 class="intro-title">${c.introTitle}</h2><p class="intro-text">${e(c.introText)}</p><div class="dhcp-actions"><button data-intro-go>${c.introGo}</button></div><a class="intro-more" href="/beispiel/erklaert/${language==='en'?'en/':''}"${embedded?' target="_blank" rel="noopener"':''}>${c.explainHref} ↗</a></section>
          <section class="interaction-card dhcp-card" aria-labelledby="dhcp-heading" hidden><div class="card-top"><span id="dhcp-heading">DHCP / <b class="dhcp-count">01</b> — 04</span><span class="dhcp-code"></span></div><p class="dhcp-speaker"></p><p class="dhcp-sentence" aria-live="polite"></p><div class="dhcp-actions"><button data-dhcp>${c.dhcpNext} →</button><button class="dhcp-replay" data-replay hidden>↺ <span class="sr-only">${c.dhcpReplay}</span></button></div><small class="dhcp-status"></small></section>
          <section class="interaction-card vm-card" hidden aria-labelledby="vm-heading"><div class="card-top"><h2 id="vm-heading">${c.vmTitle}</h2><button data-vm aria-label="${c.close}">×</button></div><p>${richText(c.vmText,c)}</p><code>${c.vmSpecs}</code><a class="project-link" data-portfolio="abschluss" href="/#abschluss">${c.project}</a></section>
          <section class="completion" hidden aria-labelledby="ready-heading"><p class="eyebrow">JANA-01 / READY</p><h2 id="ready-heading">${c.ready}</h2><p>${c.readyText}</p>
            <div class="ready-list"><p class="ready-list-title">${c.readyList}</p><ol>${c.chaptersData.map((row,i)=>`<li><a href="#chapter-${i+1}" data-jump="${i}"><span>${number(i)}</span> ${e(row[0])}</a></li>`).join('')}</ol><p class="ready-count">${c.readyCount}</p></div>
            <p class="manual-time">${c.manual}</p><small>${c.modelNote}</small><a class="project-link" href="/#abschluss" data-portfolio="abschluss">${c.project}</a><button data-restart>${c.restart}</button></section>
          <div class="cable-pin" hidden><button data-cable role="switch" aria-checked="false" aria-describedby="link-status" aria-label="${c.cable} · ${c.cableAt}"><span class="plug-icon" aria-hidden="true">↯</span><span class="cable-label">${c.cable}</span><span class="toggle" aria-hidden="true"></span></button></div>
        </figure>
        <aside class="protocol"><div class="protocol-inner"><div class="protocol-title"><span class="status-dot"></span><h2 aria-label="${c.log}"><span class="log-full">${c.log}</span><span class="log-compact">${c.logOpen}</span></h2><span class="live-count">01/07</span><button type="button" class="protocol-toggle" data-protocol-toggle aria-expanded="false" aria-controls="log-lines"><span class="sr-only">${c.logOpen}</span><span aria-hidden="true">▾</span></button></div>
          <div class="log-mode" role="group" aria-label="${c.logMode}"><button type="button" data-log-mode="plain" aria-pressed="${logMode==='plain'}">${c.logPlain}</button><button type="button" data-log-mode="tech" aria-pressed="${logMode==='tech'}">${c.logTech}</button></div>
          <ol class="log-lines" id="log-lines" data-mode="${logMode}" aria-label="${c.log}"></ol><p class="log-announcement sr-only" role="status"></p>
          <div class="cable-control"><p class="fail-title">${c.failTitle}</p><p class="cable-question">${c.cableHint}</p><p id="link-status" role="status">${c.primary}</p></div>
          <div class="counter"><output class="time">00:00:00</output><p>${c.elapsed}</p><div class="progress-row"><progress max="100" value="0" aria-label="${c.elapsed}"></progress><span class="percentage">0%</span></div><small>${c.simulation}</small></div>
        </div><p class="signature">VL / VLADIMIR LEICHT<br><span>SYSTEMS INTEGRATION · 2026</span></p></aside>
      </div>
      <footer class="depth"><div class="depth-scale" role="img" aria-label="${c.depthLabel}">${c.layers.map((label,i)=>`<span>${label}<small>${c.layerSub[i]}</small></span>`).join('')}<i class="depth-needle" aria-hidden="true"></i></div><p class="depth-caption">${c.depthCaption}</p><div class="scroll-controls"><button data-prev aria-label="${c.previous}">↑</button><span class="scroll-hint">${c.scroll}</span><button data-next aria-label="${c.next}">↓</button></div></footer>
    </div>
    <main class="chapter-track" ${!reading?'aria-hidden="true" inert':''}>${chapterMarkup(c,language)}</main><div class="term-pop" id="term-pop" role="tooltip" hidden></div>`;

    const $=selector=>root.querySelector(selector), $$=selector=>[...root.querySelectorAll(selector)];
    const scene=$('.infrastructure');
    const abort=new AbortController(), {signal}=abort;
    let lastChapter=-1, lastLog='', lastState='', parentPaused=false;
    let scrollTrigger=null;
    const annotations=createAnnotations(root), cablePin=createCablePin(root), labels=createDiagramLabels(root);
    const completion=$('.completion'); $('.protocol-inner').insertBefore(completion,$('.counter'));
    function placeCompletion() {
      if(innerWidth<=900) $('.workspace').append(completion);
      else $('.protocol-inner').insertBefore(completion,$('.counter'));
      const clock=$('.time');
      if(innerWidth<=900) $('.protocol-title').append(clock);
      else $('.counter').prepend(clock);
    }
    placeCompletion(); window.addEventListener('resize',placeCompletion,{signal});
    const reserveProtocol=()=>{
      if(innerWidth<=900) $('.workspace').style.marginBottom=`${$('.protocol').offsetHeight}px`;
      else $('.workspace').style.removeProperty('margin-bottom');
    };
    const protocolSize=new ResizeObserver(reserveProtocol); protocolSize.observe($('.protocol'));
    window.addEventListener('resize',reserveProtocol,{signal});
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
    function showStoryText(chapter) {
      const data=c.chaptersData[chapter];
      $('.story-text').innerHTML=richText(depthMode==='simple'?data[5]:depthMode==='tech'?data[4]:data[3],c);
      $('.simple-caption').textContent=depthMode==='simple'?c.simpleLabel:depthMode==='tech'?c.depthTech:c.depthExplained;
      const keys=[['client'],['vlan','firewall','uplink'],['dhcp','gateway','dns'],['pxe'],['ad','dns'],['uem'],['backup','redundancy']][chapter];
      $('.term-chips').innerHTML=keys.map(key=>`<button class="term-chip" type="button" data-term="${key}" aria-expanded="false">${e(c.glossary[key][0])} ?</button>`).join('');
    }
    const pop=$('#term-pop');
    let termButton=null;
    function closeTerm() {
      if(!termButton) return;
      termButton.setAttribute('aria-expanded','false'); termButton.removeAttribute('aria-describedby');
      termButton=null; pop.hidden=true;
    }
    function openTerm(button) {
      if(termButton===button) { closeTerm(); return; }
      closeTerm();
      const entry=c.glossary[button.dataset.term]; if(!entry) return;
      pop.innerHTML=`<strong>${e(entry[0])}</strong><span>${e(entry[1])}</span>`;
      pop.hidden=false;
      const rect=button.getBoundingClientRect(), box=pop.getBoundingClientRect();
      const left=Math.max(12,Math.min(rect.left,innerWidth-box.width-12));
      const below=rect.bottom+8, top=below+box.height>innerHeight-12?Math.max(12,rect.top-box.height-8):below;
      pop.style.left=`${left}px`; pop.style.top=`${top}px`;
      button.setAttribute('aria-expanded','true'); button.setAttribute('aria-describedby','term-pop');
      termButton=button;
    }
    const logLine=row=>{
      const plain=logMode==='plain', text=plain?(c.logPlainLines[row.id]||row.tech):row.tech;
      const time=row.time?(plain?row.time.slice(0,5):row.time):'';
      return `<li class="${row.kind}">${time?`<time>${time}</time>`:''}<span>${e(text)}</span>${plain?`<small class="log-original">${c.logTech}: ${e(row.tech)}</small>`:''}</li>`;
    };
    function update(state) {
      const {chapter,dhcp,link,vm,lease,progress}=state;
      const ready=chapter===6&&progress>.97&&link!=='failing';
      state.ready=ready;
      const chapterChanged=chapter!==lastChapter;
      if(chapterChanged) {
        const data=c.chaptersData[chapter];
        $('#chapter-kicker').textContent=`${c.chapters.toUpperCase()} ${number(chapter)} / 07 · ${data[0].toUpperCase()}`;
        $('.story-time').textContent=`${data[1]}${language==='de'?' Uhr.':''}`;
        $('.story-title').textContent=data[2]; showStoryText(chapter); closeTerm();
        if(chapter>0) introDismissed=true;
        $$('.chapter-nav a').forEach((a,i)=>{a.classList.toggle('is-current',i===chapter); if(i===chapter)a.setAttribute('aria-current','step'); else a.removeAttribute('aria-current');});
        $('.story-project').hidden=![3,5,6].includes(chapter);
        $('.live-count').textContent=`${number(chapter)}/07`;
        $('.chapter-picker').value=String(chapter);
        scene.dataset.unpacked=String(chapter>0);
        $$('.stage .tag-number').forEach(label=>label.textContent=number(chapter)); $$('.stage .tag-text').forEach(label=>label.textContent=c.labels[chapter]);
        scene.dataset.final=String(chapter===6);
        $$('[data-slot]').forEach((slot,i)=>slot.classList.toggle('is-slot-active',i===({2:0,3:1,4:0,5:2,6:3})[chapter]));
        $('[data-prev]').disabled=chapter===0; $('[data-next]').disabled=chapter===6;
        lastChapter=chapter;
      }
      state.intro=chapter===0&&!introDismissed&&!vm&&!reading;
      const signature=[chapter,dhcp,link,vm,ready,state.intro].join('/');
      if(signature!==lastState) {
        $('.intro-card').hidden=!state.intro;
        $('.dhcp-card').hidden=chapter!==2||vm;
        $('.vm-card').hidden=!vm;
        $('.completion').hidden=!ready||vm;
        $('.stage').classList.toggle('is-ready',ready);
        $('.workspace').classList.toggle('is-ready',ready);
        $('.log-compact').textContent=ready?(language==='de'?'Fertig':'Ready'):c.logOpen;
        $('.stage').classList.toggle('vm-is-open',vm);
        scene.dataset.link=link;
        const line=c.dhcp[dhcp];
        $('.dhcp-count').textContent=number(dhcp); $('.dhcp-code').textContent=line[0];
        $('.dhcp-speaker').textContent=line[1]; $('.dhcp-sentence').textContent=line[2];
        $('.dhcp-status').textContent=lease?c.dhcpDone:c.dhcpHint;
        $('[data-dhcp]').textContent=lease?`${c.next} →`:`${c.dhcpNext} →`;
        $('[data-dhcp]').disabled=link==='failing'; $('[data-replay]').hidden=!lease;
        $('[data-cable]').setAttribute('aria-checked',String(link!=='primary'));
        $('.cable-label').textContent=link==='primary'?c.cable:c.reconnect;
        $('#link-status').textContent=chapter===0?c.cableUnavailable:link==='failing'?c.failing:link==='backup'?c.backup:c.primary;
        $('.protocol').dataset.link=link;
        $$('[data-vm]').forEach(button=>button.setAttribute('aria-expanded',String(vm)));
        lastState=signature;
      }
      const rows=journey.logs(), logKey=logMode+JSON.stringify(rows);
      if(logKey!==lastLog) {
        $('.log-lines').innerHTML=rows.map(logLine).join('');
        const last=rows.at(-1); $('.log-announcement').textContent=last?(c.logPlainLines[last.id]||last.tech):''; lastLog=logKey;
      }
      const phase=Math.max(0,Math.min(7,progress*6.5)), step=Math.min(6,Math.floor(phase));
      let seconds=Math.round(CHAPTER_SECONDS[step]+(CHAPTER_SECONDS[step+1]-CHAPTER_SECONDS[step])*(phase-step));
      if(chapter===2&&!lease) seconds=Math.min(seconds,CHAPTER_SECONDS[2]+dhcp);
      seconds=ready?2100:Math.min(2099,seconds);
      $('.time').textContent=`00:${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
      const percent=ready?100:Math.min(99,Math.round(seconds/21));
      $('progress').value=percent; $('.percentage').textContent=`${percent}%`;
      const level=[0,1,1,2,2,2,3][chapter];
      $('.depth-needle').style.left=`${3+level*31.33}%`;
      $('.depth-scale').setAttribute('aria-label',`${c.depthLabel}: ${c.layers[level]}, ${c.layerSub[level]}`);
      $$('.depth-scale>span').forEach((item,i)=>item.classList.toggle('is-current',i===level));
      movePacket(packetPosition({ progress, chapter, lease, link, rerouted: state.rerouted }), link);
      $('.stage .packet').classList.toggle('is-paused',link==='failing');
      $('.stage .packet').style.opacity=ready?'0':'1';
      annotations.update(state);
      cablePin.update(state);
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
      if(termButton&&!event.target.closest('[data-term],.term-pop')) closeTerm();
      const target=event.target.closest('button,a,[data-vm]'); if(!target)return;
      if(target.matches('[data-jump]')) {event.preventDefault();go(Number(target.dataset.jump));}
      else if(target.matches('[data-prev]'))go(journey.state.chapter-1);
      else if(target.matches('[data-next]'))go(journey.state.chapter+1);
      else if(target.matches('[data-dhcp]')) {if(journey.state.lease)go(3);else journey.dhcpNext();}
      else if(target.matches('[data-replay]'))journey.dhcpReplay();
      else if(target.matches('[data-cable]'))journey.cable();
      else if(target.matches('[data-term]'))openTerm(target);
      else if(target.matches('[data-depth]')) {depthMode=target.dataset.depth;$$('[data-depth]').forEach(b=>b.setAttribute('aria-pressed',String(b===target)));showStoryText(journey.state.chapter);}
      else if(target.matches('[data-log-mode]')) {logMode=target.dataset.logMode;$$('[data-log-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===target)));$('.log-lines').dataset.mode=logMode;lastLog='';update(journey.state);}
      else if(target.matches('[data-protocol-toggle]')) {const open=!$('.protocol').classList.contains('is-open');$('.protocol').classList.toggle('is-open',open);target.setAttribute('aria-expanded',String(open));}
      else if(target.matches('[data-intro-close],[data-intro-go]')) {introDismissed=true;lastState='';update(journey.state);if(target.matches('[data-intro-go]'))go(1);}
      else if(target.matches('[data-vm]'))journey.vm();
      else if(target.matches('[data-restart]'))go(0);
      else if(target.id==='example-language') {setLanguage(language==='de'?'en':'de');post('language',{language:getLanguage()});}
      else if(target.matches('.reading-switch')) {manualReading=!reading;if(motion.matches)manualReading=true;render(journey.state.chapter);}
      else if(target.matches('[data-portfolio]')&&embedded) {event.preventDefault();post('navigate',{route:target.dataset.portfolio});}
    },{signal});
    root.addEventListener('change',event=>{if(event.target.matches('.chapter-picker'))go(Number(event.target.value));},{signal});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape') {
        event.preventDefault();
        if(termButton) {const button=termButton;closeTerm();button.focus({preventScroll:true});}
        else if(journey.state.vm)journey.vm();else post('close');
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
    let lastScroll = scrollY, scrollHold = 0;
    const noteScroll = (direction) => {
      if (!direction) return;
      $('.scroll-controls').dataset.scroll = direction < 0 ? 'up' : 'down';
      clearTimeout(scrollHold);
      scrollHold = setTimeout(() => { delete $('.scroll-controls').dataset.scroll; }, 160);
    };
    window.addEventListener('scroll', () => {
      closeTerm();
      const next = scrollY;
      noteScroll(Math.sign(next - lastScroll));
      lastScroll = next;
    }, { signal, passive: true });
    window.addEventListener('wheel', (event) => noteScroll(Math.sign(event.deltaY)), { signal, passive: true });
    cleanup=()=>{clearTimeout(scrollHold);stopRoute();abort.abort();protocolSize.disconnect();annotations.dispose();cablePin.dispose();labels.dispose();journey.dispose();scrollTrigger?.kill();};
    post('ready');
  }
  render(Math.max(0,Math.min(6,Number(location.hash.match(/^#chapter-(\d)$/)?.[1]||1)-1)));
  const offLanguage=onLanguageChange(()=>{const chapter=Number(root.querySelector('.chapter-nav [aria-current]')?.dataset.jump||0);render(chapter);root.querySelector('#example-language')?.focus({preventScroll:true});});
  const onMotion=()=>render(); motion.addEventListener('change',onMotion);
  window.addEventListener('pagehide',event=>{if(!event.persisted){cleanup();offLanguage();motion.removeEventListener('change',onMotion);}});
}
