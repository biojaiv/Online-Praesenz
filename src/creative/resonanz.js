import './style.css';
import { createSculpture } from './soundSculpture.js';
import { createBridge } from './bridge.js';
import { createScene } from './scene.js';
import { createSound, soundProfile } from './resonanzAudio.js';
const copy={
 de:{form:'FORM DES TONS',studio:'STUDIO FÜR KLANG',about:'Über Klang',soundOn:'Ton einschalten',soundOff:'Ton ausschalten',headline:'Formen<br>der Töne',instruction:'Ziehe oder scrolle seitlich.<br>Höre, wie die Form sich verändert.',gesture:'↔ Tonhöhe & Spektrum · ↕ Kapitel',shape:'Zieh am Klang',dry:'Trocken',cathedral:'Kathedrale',back:'← Portfolio',scroll:'SCROLLEN, UM WEITERZUSPIELEN ↓',credit:'Ein interaktives Klangexperiment · VL',aboutTitle:'Ein Klang, den du formen kannst',aboutText:'Sechs Kapitel führen von tiefen Bässen und klaren Tönen über Obertöne und Raum bis zu einem ruhigen Rhythmus und sanftem Schimmer. Waagerechtes Ziehen oder seitliches Scrollen verändert Tonhöhe und Spektrum. Senkrechtes Ziehen biegt die Skulptur und verändert ihre Klanghelligkeit. Senkrechtes Scrollen wechselt das Kapitel. Doppelklick setzt die Form zurück; die Pfeiltasten bedienen den Formregler. Ton startet erst über den Knopf in der Fußzeile.',return:'Zurück zum Instrument ↑',fallback:'Die Klangsteuerung funktioniert auch ohne die 3D-Darstellung.',error:'Audio ist in diesem Browser nicht verfügbar.',chapters:['Impuls','Ton','Obertöne','Raum','Rhythmus','Schimmer'],captions:['Tiefer Bass. Ein atmender Impuls.','Ein klarer, weicher Grundton.','Warme Obertöne. Weich ineinander verwoben.','Luft, Weite und schwebende Töne.','Seitliches Scrollen verändert auch den Puls.','Helle Harmonien. Ein sanfter Nachklang.']},
 en:{form:'FORM OF SOUND',studio:'STUDIO FOR SOUND',about:'About sound',soundOn:'Enable sound',soundOff:'Disable sound',headline:'Forms<br>of sound',instruction:'Drag or scroll sideways.<br>Hear the shape change.',gesture:'↔ Pitch & spectrum · ↕ Chapters',shape:'Shape the sound',dry:'Dry',cathedral:'Cathedral',back:'← Portfolio',scroll:'SCROLL TO KEEP PLAYING ↓',credit:'An interactive sound experiment · VL',aboutTitle:'A sound you can shape',aboutText:'Six chapters move from deep bass and pure tones through harmonics and space to a gentle rhythm and soft shimmer. Drag or scroll sideways to change pitch and spectrum. Vertical dragging bends the sculpture and changes brightness; vertical scrolling changes chapter. Double-click resets the form, and arrow keys operate the shape slider. Sound starts only through the button in the footer.',return:'Back to the instrument ↑',fallback:'Sound controls remain available without the 3D view.',error:'Audio is unavailable in this browser.',chapters:['Impulse','Tone','Harmonics','Space','Rhythm','Shimmer'],captions:['Deep bass. A breathing pulse.','A clear, soft fundamental.','Warm harmonics. Softly woven together.','Air, space and floating tones.','Scroll sideways to change the pulse, too.','Bright harmonies. A gentle resonance.']}
};
const params=new URLSearchParams(location.search),still=params.get('preview')==='1';
const state={chapter:2,tone:45,space:35,shape:55,lift:0,dragging:false,frequency:440};
let language='en',sound=null,enabled=false,visible=false,audioPending=false;
const canvas=document.querySelector('#sculpture'),audioButton=document.querySelector('#sound');
const art=createScene(canvas);
const sculpture=art?createSculpture(art,state,still):null;
function render(lang){
 language=lang;const words=copy[lang];
 document.querySelectorAll('[data-copy]').forEach(el=>{const value=words[el.dataset.copy];if(value)el.innerHTML=value;});
 document.querySelector('[data-language]').textContent=lang==='de'?'EN':'DE';
 document.querySelector('[data-language]').setAttribute('aria-label',lang==='de'?'Switch to English':'Auf Deutsch wechseln');
 canvas.setAttribute('aria-label',lang==='de'?'Silberne Klangskulptur. Mit dem Regler oder durch Ziehen verformen.':'Silver sound sculpture. Reshape it with the slider or by dragging.');
 document.querySelector('.sound-chapters').setAttribute('aria-label',lang==='de'?'Klangkapitel':'Sound chapters');
 document.querySelector('.room-options').setAttribute('aria-label',lang==='de'?'Raum':'Room');
 document.querySelector('.sound-chapters').innerHTML=words.chapters.map((chapter,i)=>`<button data-chapter="${i}" aria-current="${i===state.chapter?'step':'false'}"><b>${String(i+1).padStart(2,'0')}</b><span>${chapter}</span></button>`).join('');
 updateCopy();
}
function updateCopy(){
 audioButton.textContent=copy[language][enabled?'soundOff':'soundOn'];audioButton.setAttribute('aria-pressed',String(enabled));
 document.querySelector('.chapter-caption').textContent=copy[language].captions[state.chapter];
 document.querySelector('#frequency').textContent=`${state.frequency.toFixed(0)} Hz / ${noteName(state.frequency)}`;
 document.querySelector('.current-sound-chapter').textContent=`${String(state.chapter+1).padStart(2,'0')} / ${copy[language].chapters[state.chapter].toUpperCase()}`;
 document.querySelector('.resonanz').style.setProperty('--chapter-progress',`${(state.chapter+1)/6*100}%`);
 document.querySelector('#shape').setAttribute('aria-label',copy[language].shape);
 document.querySelectorAll('[data-chapter]').forEach(button=>button.setAttribute('aria-current',Number(button.dataset.chapter)===state.chapter?'step':'false'));
}
// Small points follow the same drawn wave, without another WebGL layer or animation loop.
const wave=document.querySelector('.sound-wave'),wavePath=wave.querySelector('path'),waveLength=wavePath.getTotalLength();
const dust=document.createElementNS('http://www.w3.org/2000/svg','g');dust.setAttribute('class','wave-dust');dust.setAttribute('fill','#dfff65');dust.setAttribute('opacity','.4');
for(let i=0;i<170;i++){
 const u=((i*0.61803398875)%1),p=wavePath.getPointAtLength(waveLength*u),dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
 dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y+Math.sin(i*8.317)*(6+Math.sin(u*Math.PI)*21));dot.setAttribute('r',.3+(i%4)*.11);dust.append(dot);
}wave.prepend(dust);
const bridge=createBridge(render,value=>{
 visible=value;art?.setVisible(value);document.querySelector('.resonanz').classList.toggle('is-muted-page',!value);
 if(!value){enabled=false;sound?.pause();updateCopy();}
});
function change(){const profile=soundProfile(state);state.frequency=profile.frequency;state.tone=profile.brightness*100;sound?.update(state);art?.invalidate();updateCopy();}
function noteName(frequency){const midi=Math.round(69+12*Math.log2(frequency/440));const notes=language==='de'?['C','C♯','D','D♯','E','F','F♯','G','G♯','A','B','H']:['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];return notes[(midi%12+12)%12]+(Math.floor(midi/12)-1);}
function select(index){state.chapter=Math.max(0,Math.min(5,index));change();}
document.querySelector('.sound-chapters').addEventListener('click',event=>{const button=event.target.closest('[data-chapter]');if(button)select(Number(button.dataset.chapter));});
document.querySelector('#shape').addEventListener('input',event=>{state.shape=Number(event.target.value);change();});
function updateRooms(){document.querySelectorAll('[data-room]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.room)===state.space)));}
document.querySelector('.room-options').addEventListener('click',event=>{const button=event.target.closest('[data-room]');if(!button)return;state.space=Number(button.dataset.room);updateRooms();change();});
audioButton.addEventListener('click',async()=>{
 if(audioPending)return;audioPending=true;
 try {
  if(enabled){enabled=false;await sound.pause();}
  else{sound??=createSound();sound.update(state);await sound.resume();enabled=visible&&!document.hidden;if(!enabled)await sound.pause();}
  updateCopy();
 }catch{document.querySelector('.chapter-caption').textContent=copy[language].error;}finally{audioPending=false;}
});
let drag=null;
function beginDrag(event){
 if(event.button!==0)return;
 // On mobile the visible range stays a native slider; the canvas supports two axes.
 if(event.currentTarget.id==='shape'&&matchMedia('(max-width:700px)').matches)return;
 event.preventDefault();
 const bounds=canvas.getBoundingClientRect();
 drag={id:event.pointerId,x:event.clientX,y:event.clientY,value:state.shape,lift:state.lift,gain:100/Math.max(160,bounds.width*.4),height:bounds.height};
 state.dragging=true;event.currentTarget.setPointerCapture(event.pointerId);
}
function dragShape(event){
 if(!drag||event.pointerId!==drag.id)return;
 state.shape=Math.max(0,Math.min(100,drag.value+(event.clientX-drag.x)*drag.gain));
 state.lift=Math.max(-1,Math.min(1,drag.lift-(event.clientY-drag.y)/drag.height*2.4));
 document.querySelector('#shape').value=state.shape;change();
}
const release=()=>{drag=null;state.dragging=false;};
for(const target of [canvas,document.querySelector('#shape')]){
 target.addEventListener('pointerdown',beginDrag);target.addEventListener('pointermove',dragShape);
 target.addEventListener('pointerup',release);target.addEventListener('pointercancel',release);target.addEventListener('lostpointercapture',release);
}
canvas.addEventListener('dblclick',()=>{state.shape=55;state.lift=0;document.querySelector('#shape').value=55;change();});
let wheel=0,lastWheel=0;
document.querySelector('.resonance-stage').addEventListener('wheel',event=>{
 if(event.ctrlKey)return;
 const unit=event.deltaMode===1?16:event.deltaMode===2?innerWidth:1;
 const dx=(event.shiftKey&&!event.deltaX?event.deltaY:event.deltaX)*unit;
 if(event.shiftKey||Math.abs(dx)>Math.abs(event.deltaY*unit)){
  event.preventDefault();state.shape=Math.max(0,Math.min(100,state.shape+dx*.11));document.querySelector('#shape').value=state.shape;change();return;
 }
 const direction=Math.sign(event.deltaY);
 if((state.chapter===0&&direction<0)||(state.chapter===5&&direction>0))return;
 event.preventDefault();wheel+=event.deltaY*(event.deltaMode===1?18:1);
 if(Math.abs(wheel)>70&&performance.now()-lastWheel>400){select(state.chapter+Math.sign(wheel));wheel=0;lastWheel=performance.now();}
},{passive:false});
addEventListener('pagehide',()=>sound?.dispose(),{once:true});
updateRooms();change();
await Promise.all([document.fonts.ready,sculpture?.ready]);art?.resize();art?.renderStill();bridge.ready();
