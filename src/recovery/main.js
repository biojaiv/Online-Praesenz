import { getLanguage,setLanguage,onLanguageChange,t } from '../i18n.js';
const params=new URLSearchParams(location.search),embedded=parent!==window&&params.get('embedded')==='1';
setLanguage(params.get('lang')||getLanguage());
const video=document.querySelector('video'),button=document.querySelector('#language'),back=document.querySelector('.back');
let transcript=null,restore=null;
const post=(type,data={})=>{if(embedded)parent.postMessage({type:`example:${type}`,...data},location.origin);};
function render(){
 const lang=getLanguage(),time=video.currentTime||0,wasPlaying=!video.paused;
 document.documentElement.lang=lang;document.title=`Recovery Lab · ${t('projects.integration')}`;
 document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
 document.querySelector('.eyebrow').textContent=`VL // ${t('projects.integration').toUpperCase()}`;
 button.hidden=false;button.textContent=lang==='de'?'EN':'DE';button.setAttribute('aria-label',lang==='de'?'Switch to English':'Auf Deutsch wechseln');
 if(video.getAttribute('src')!==`/recovery/recovery-${lang}.mp4`){video.pause();restore={time,wasPlaying};video.src=`/recovery/recovery-${lang}.mp4`;video.poster=`/recovery/preview-${lang}.jpg`;video.load();}
 video.setAttribute('aria-label',t('recovery.title')+' · '+t('recovery.note'));
 if(transcript){const list=document.querySelector('#transcript ol');list.replaceChildren();
  for(const step of transcript[lang]){const li=document.createElement('li');const title=document.createElement('h2');title.textContent=step.t;
   const status=document.createElement('span');status.className=`step-status ${step.st}`;status.textContent=t(step.st==='ist'?'recovery.existing':step.st==='ziel'?'recovery.goal':'recovery.plan');
   const why=document.createElement('p');why.textContent=t('recovery.why')+': '+step.w;const how=document.createElement('p');how.textContent=t('recovery.how')+': '+step.m;li.append(status,title,why,how);list.append(li);}
  document.querySelector('#transcript').hidden=false;
 }
}
video.addEventListener('loadedmetadata',()=>{if(restore){video.currentTime=Math.min(restore.time,video.duration);if(restore.wasPlaying&&!document.hidden)video.play().catch(()=>{});restore=null;}});
button.addEventListener('click',()=>{setLanguage(getLanguage()==='de'?'en':'de');const url=new URL(location.href);url.searchParams.set('lang',getLanguage());history.replaceState(null,'',url);post('language',{language:getLanguage()});});
back.addEventListener('click',event=>{if(embedded){event.preventDefault();video.pause();post('close');}});
addEventListener('keydown',event=>{if(event.key==='Escape'&&embedded){event.preventDefault();video.pause();post('close');}});
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;const data=event.data;
 if(data?.type==='example:language'&&['de','en'].includes(data.language))setLanguage(data.language);
 if(data?.type==='example:pause'||(data?.type==='example:visible'&&data.visible===false)){video.pause();if(restore)restore.wasPlaying=false;}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
addEventListener('pagehide',()=>video.pause());
onLanguageChange(render);render();
fetch('/recovery/transcript.json').then(r=>{if(!r.ok)throw new Error('transcript');return r.json();}).then(data=>{transcript=data;render();}).catch(()=>{});
post('ready',{language:getLanguage()});
