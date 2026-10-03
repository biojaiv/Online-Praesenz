import './style.css';
import { createSculpture } from './soundSculpture.js';
import { createBridge } from './bridge.js';
import { createScene } from './scene.js';
import { createSound, soundProfile, finNote, noteName, roomDecay } from './resonanzAudio.js';
import { createField } from './resonanzField.js';
import { createSignal, toneDiagram } from './resonanzSignal.js';
const copy={
 de:{form:'FORM DES TONS',studio:'STUDIO FÜR KLANG',about:'Über Klang',soundOn:'Ton einschalten',soundOff:'Ton ausschalten',headline:'Ein Ton.<br>Tausend<br><em>Formen.</em>',instruction:'Tippe eine Lamelle an.<br>Ziehe, um den Klang zu formen.',gesture:'Tippen: anschlagen · ↔ Tonhöhe · ↕ Kapitel',shape:'Zieh am Klang',dry:'Trocken',cathedral:'Kathedrale',back:'← Portfolio',credit:'Ein interaktives Klangexperiment · VL',
  storyKicker:'INSTRUMENT · SKULPTUR · PARTITUR',aboutTitle:'Ein Klang, den du anschlagen kannst',aboutText:'RESONANZ ist Instrument und Skulptur zugleich. Jede der 82 Lamellen ist auf eine Stufe einer pentatonischen Tonleiter gestimmt. Antippen schlägt sie an; schnelles Überstreichen mit der Maus spielt sie wie eine Harfe. Senkrechtes Scrollen wechselt das Kapitel, Doppelklick setzt die Form zurück. Mit Fokus auf dem Formgriff schlagen Leertaste oder Eingabetaste an, die Pfeiltasten formen. Die Zuordnung von Klang und Form ist eine gestalterische Interpretation, keine Messung. Ton startet erst über den Knopf in der Fußzeile.',
  stepStrike:'Anschlagen',stepStrikeText:'Ein Tippen schickt eine Welle durch die Lamellen, über die Signalspur und durch den Schriftzug.',stepShape:'Formen',stepShapeText:'Seitlich ändern sich Tonhöhe und Form, senkrechtes Ziehen verändert die Klanghelligkeit.',stepRoom:'Raum',stepRoomText:'Trocken, Studio oder Kathedrale verändern Nachhall und Spiegelungen zugleich.',
  gateKicker:'KLANGEXPERIMENT · MIT TON',gateTitle:'Diese Seite ist ein Instrument.',gateText:'Schalte den Ton ein, um die 82 Lamellen zu hören. Er beginnt leise und lässt sich unten jederzeit wieder ausschalten.',gateOn:'Ton einschalten',gateSkip:'Erst ohne Ton ansehen',soundHint:'Der Ton ist aus. Hier einschalten ↓',
  return:'Zurück zum Instrument ↑',fallback:'Die Klangsteuerung funktioniert auch ohne die 3D-Darstellung.',error:'Audio ist in diesem Browser nicht verfügbar.',canvas:'Silberne Klangskulptur. Antippen schlägt eine Lamelle an, Ziehen verformt sie.',
  chapters:['Impuls','Ton','Obertöne','Raum','Rhythmus','Schimmer'],captions:['Ein einzelner Anschlag. Die Welle läuft durch jede Lamelle.','Ein reiner Grundton. Die Skulptur atmet in einer Welle.','Obertöne legen stehende Wellen über die Lamellen.','Je größer der Raum, desto länger klingt jeder Anschlag nach.','Ein Muster aus Anschlägen. Seitlich ziehen ändert das Tempo.','Einzelne Lamellen klingen wie ein Windspiel.']},
 en:{form:'FORM OF SOUND',studio:'STUDIO FOR SOUND',about:'About sound',soundOn:'Enable sound',soundOff:'Disable sound',headline:'One tone.<br>Endless<br><em>forms.</em>',instruction:'Tap a fin.<br>Drag to shape the sound.',gesture:'Tap: strike · ↔ Pitch · ↕ Chapters',shape:'Shape the sound',dry:'Dry',cathedral:'Cathedral',back:'← Portfolio',credit:'An interactive sound experiment · VL',
  storyKicker:'INSTRUMENT · SCULPTURE · SCORE',aboutTitle:'A sound you can strike',aboutText:'RESONANZ is an instrument and a sculpture at once. Each of the 82 fins is tuned to a step of a pentatonic scale. Tap to strike one, or sweep the mouse quickly across the fins to play them like a harp. Vertical scrolling changes chapter and a double-click resets the form. With the shape handle focused, Space or Enter strikes and the arrow keys shape. The mapping between sound and form is a design interpretation, not a measurement. Sound starts only through the button in the footer.',
  stepStrike:'Strike',stepStrikeText:'A tap sends a wave through the fins, along the trace and through the lettering.',stepShape:'Shape',stepShapeText:'Sideways changes pitch and form; vertical dragging changes brightness.',stepRoom:'Room',stepRoomText:'Dry, studio or cathedral change the reverb and the reflections together.',
  gateKicker:'SOUND EXPERIMENT · WITH AUDIO',gateTitle:'This page is an instrument.',gateText:'Turn the sound on to hear the 82 fins. It starts quietly and can be switched off below at any time.',gateOn:'Turn sound on',gateSkip:'Look without sound first',soundHint:'Sound is off. Turn it on here ↓',
  return:'Back to the instrument ↑',fallback:'Sound controls remain available without the 3D view.',error:'Audio is unavailable in this browser.',canvas:'Silver sound sculpture. Tap to strike a fin, drag to reshape it.',
  chapters:['Impulse','Tone','Harmonics','Space','Rhythm','Shimmer'],captions:['A single strike. The wave runs through every fin.','A pure fundamental. The sculpture breathes as one wave.','Harmonics lay standing waves across the fins.','The larger the room, the longer every strike rings.','A pattern of strikes. Drag sideways to change the tempo.','Single fins chime like a wind chime.']}
};
const params=new URLSearchParams(location.search),still=params.get('preview')==='1';
const state={chapter:2,tone:45,space:35,shape:55,lift:0,dragging:false,frequency:440,hover:-1};
let language='en',sound=null,enabled=false,visible=false,audioPending=false;
const stage=document.querySelector('.resonance-stage'),canvas=document.querySelector('#sculpture'),audioButton=document.querySelector('#sound'),shapeInput=document.querySelector('#shape');
const handle=document.querySelector('.shape-control'),pitch=document.querySelector('.pitch-note'),glow=document.querySelector('.stage-glow');
const motion=matchMedia('(prefers-reduced-motion:reduce)'),wide=matchMedia('(min-width:701px)');
// The handle and the pitch label hang on real fins and travel with them.
const anchors={handle:58,pitch:30};
const field=createField();
const art=createScene(canvas);
const sculpture=art?createSculpture(art,state,still,{field,onFrame:place}):null;
const signal=createSignal(document.querySelector('.sound-trace'),{state,field,profile:()=>soundProfile(state)});
const title=document.querySelector('#resonance-title');
title.setAttribute('aria-label','RESONANZ');title.innerHTML=[...'RESONANZ'].map(letter=>`<span aria-hidden="true">${letter}</span>`).join('');
const letters=[...title.children];let letterX=[],moved=false;
function measure(){
 const box=stage.getBoundingClientRect();
 letterX=letters.map(letter=>{const r=letter.getBoundingClientRect();return (r.left+r.width/2-box.left)/box.width;});
 signal.resize();drawStill();
}
new ResizeObserver(measure).observe(stage);
function render(lang){
 language=lang;const words=copy[lang];
 document.querySelectorAll('[data-copy]').forEach(el=>{const value=words[el.dataset.copy];if(value)el.innerHTML=value;});
 document.querySelector('[data-language]').textContent=lang==='de'?'EN':'DE';
 document.querySelector('[data-language]').setAttribute('aria-label',lang==='de'?'Switch to English':'Auf Deutsch wechseln');
 canvas.setAttribute('aria-label',words.canvas);
 document.querySelector('.sound-chapters').setAttribute('aria-label',lang==='de'?'Klangkapitel':'Sound chapters');
 document.querySelector('.room-options').setAttribute('aria-label',lang==='de'?'Raum':'Room');
 document.querySelectorAll('[data-room] small').forEach(small=>{const seconds=roomDecay(Number(small.parentElement.dataset.room));small.textContent=`${seconds.toLocaleString(lang,{maximumFractionDigits:1,minimumFractionDigits:1})} s`;});
 document.querySelector('.sound-chapters').innerHTML=words.chapters.map((chapter,i)=>`<button data-chapter="${i}" aria-current="${i===state.chapter?'step':'false'}"><b>${String(i+1).padStart(2,'0')}</b><span>${chapter}</span></button>`).join('');
 updateCopy();
}
function updateCopy(){
 audioButton.textContent=copy[language][enabled?'soundOff':'soundOn'];audioButton.setAttribute('aria-pressed',String(enabled));
 document.querySelector('.chapter-caption').textContent=copy[language].captions[state.chapter];
 document.querySelector('#frequency').textContent=`${state.frequency.toFixed(0)} Hz / ${noteName(state.frequency,language)}`;
 document.querySelector('.current-sound-chapter').textContent=`${String(state.chapter+1).padStart(2,'0')} / ${copy[language].chapters[state.chapter].toUpperCase()}`;
 const root=document.querySelector('.resonanz');root.style.setProperty('--chapter-progress',`${(state.chapter+1)/6*100}%`);root.style.setProperty('--chapter-fill',String(state.chapter/5));root.dataset.acoustics=String(state.space);
 shapeInput.setAttribute('aria-label',copy[language].shape);
 document.querySelectorAll('[data-chapter]').forEach(button=>button.setAttribute('aria-current',Number(button.dataset.chapter)===state.chapter?'step':'false'));
}
const bridge=createBridge(render,value=>{
 visible=value;art?.setVisible(value);document.querySelector('.resonanz').classList.toggle('is-muted-page',!value);
 if(!value){enabled=false;sound?.pause();updateCopy();}
 else showGate();
 conduct.update();wake();
});
function change(){
 const profile=soundProfile(state);state.frequency=profile.frequency;state.tone=profile.brightness*100;sound?.update(state);art?.invalidate();updateCopy();
 const diagram=toneDiagram(profile);document.querySelector('.diagram-wave').setAttribute('d',diagram.wave);document.querySelector('.diagram-partials').setAttribute('d',diagram.bars);
 drawStill();
}
function drawStill(){if(motion.matches||still)signal.draw(0,true);}
/** One strike: the shared field drives fins, trace and type; the instrument plays if enabled. */
function strike(index,velocity,{at=performance.now()/1000,label=false,audible=true}={}){
 const count=sculpture?.count??82,u=index/(count-1),p=sculpture?.projected;
 const x=p?.ready?(canvas.offsetLeft+p.x[index])/stage.clientWidth:.25+u*.55,frequency=finNote(state,index,count);
 field.add({u,x,velocity,time:at,decay:roomDecay(state.space)*(state.chapter===0?.75:1)});
 if(enabled&&audible)sound?.strike(frequency,{velocity,pan:(x-.5)*1.1,chapter:state.chapter},at);
 if(label){showNote(index,frequency);if(!enabled)remindSound();}
 wake();art?.invalidate();
}
const notes=[...document.querySelectorAll('.strike-note')];let noteIndex=0;
function showNote(index,frequency){
 const p=sculpture?.projected;if(!p?.ready)return;
 const note=notes[noteIndex++%notes.length];note.textContent=noteName(frequency,language);
 note.style.left=`${canvas.offsetLeft+p.tipX[index]}px`;note.style.top=`${canvas.offsetTop+p.tipY[index]}px`;
 note.animate(motion.matches?[{opacity:1},{opacity:0}]:[{opacity:0,transform:'translate(-50%,-30%)'},{opacity:1,transform:'translate(-50%,-120%)',offset:.14},{opacity:0,transform:'translate(-50%,-300%)'}],{duration:1600,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
}
function place(projected){
 if(!wide.matches){if(moved){handle.style.transform=pitch.style.transform='';moved=false;}return;}
 const left=canvas.offsetLeft,top=canvas.offsetTop;moved=true;
 const hx=left+projected.x[anchors.handle];handle.classList.toggle('is-flipped',hx>stage.clientWidth*.74);
 handle.style.transform=`translate(${hx.toFixed(1)}px,${(top+projected.y[anchors.handle]).toFixed(1)}px)`;
 // The pitch label hangs from the lower rim of its fin, into the free space below the neck.
 const i=anchors.pitch,below=projected.tipY[i]>projected.y[i],x=below?projected.tipX[i]:2*projected.x[i]-projected.tipX[i],y=below?projected.tipY[i]:2*projected.y[i]-projected.tipY[i];
 pitch.style.transform=`translate(${(left+x).toFixed(1)}px,${(top+y).toFixed(1)}px)`;
}
// Players give each chapter its own behaviour: a heartbeat, a room test, a rhythm, a wind chime.
const rhythm=[[0,.9],null,[4,.5],[2,.45],[7,.75],null,[4,.45],[9,.6]];
function compose(step){
 const u=state.shape/100,count=sculpture?.count??82,fin=degree=>Math.round(degree/10*(count-1));
 if(state.chapter===0)return {index:0,velocity:.95,wait:2.7-u*1.2};
 if(state.chapter===3)return {index:fin(2+(step*3)%7),velocity:.75,wait:4.2};
 if(state.chapter===4){const beat=rhythm[step%8];return {index:beat?fin(beat[0]):-1,velocity:beat?.[1]??0,wait:1/((.65+u*1.55)*2)};}
 if(state.chapter===5)return {index:fin(4+Math.random()*6),velocity:.2+Math.random()*.3,wait:.2-Math.log(1-Math.random())/1.4};
 return null;
}
const conduct=Object.assign(()=>{
 const now=performance.now()/1000,c=conduct.state;
 if(c.chapter!==state.chapter||c.next<now-.25){c.chapter=state.chapter;c.step=0;c.next=now+.45;}
 while(c.next<now+.15){const event=compose(c.step++);if(!event){c.next=now+.5;break;}if(event.index>=0)strike(event.index,event.velocity,{at:c.next});c.next+=event.wait;}
},{state:{chapter:-1,step:0,next:0},timer:0,update(){
 const run=visible&&!still&&!motion.matches;
 if(run&&!conduct.timer)conduct.timer=setInterval(conduct,50);
 if(!run&&conduct.timer){clearInterval(conduct.timer);conduct.timer=0;}
}});
// Trace, lettering and glow share one light 2D loop at about 30 fps.
let loop=0,lastDraw=0,settled=true;
function frame(ms){
 loop=0;const now=ms/1000;
 if(ms-lastDraw>=33){
  lastDraw=ms;signal.draw(now);
  const energy=field.energy(now);
  if(energy>.004||!settled){letters.forEach((letter,i)=>{letter.style.transform=`translateY(${(-field.wave(letterX[i],now,'x')*.036).toFixed(4)}em)`;});settled=energy<=.004;}
  glow.style.opacity=String(Math.min(1,[.32,.52,.78][state.space<20?0:state.space<60?1:2]+energy*.22).toFixed(3));
 }
 if(visible&&!motion.matches&&!still)loop=requestAnimationFrame(frame);
}
function wake(){if(!loop&&visible&&!motion.matches&&!still)loop=requestAnimationFrame(frame);}
motion.addEventListener('change',()=>{conduct.update();wake();drawStill();});
function select(index){
 const next=Math.max(0,Math.min(5,index));if(next===state.chapter)return;
 state.chapter=next;change();
 // A quiet sweep marks the change of chapter, visible only.
 if(!motion.matches)strike(0,.45,{audible:false});
}
document.querySelector('.sound-chapters').addEventListener('click',event=>{const button=event.target.closest('[data-chapter]');if(button)select(Number(button.dataset.chapter));});
shapeInput.addEventListener('input',event=>{state.shape=Number(event.target.value);change();});
shapeInput.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();strike(anchors.handle,.85,{label:true});}});
function updateRooms(){document.querySelectorAll('[data-room]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.room)===state.space)));}
document.querySelector('.room-options').addEventListener('click',event=>{
 const button=event.target.closest('[data-room]');if(!button)return;state.space=Number(button.dataset.room);updateRooms();change();
 // Strike once in the new room so its tail is heard and seen.
 strike(anchors.handle,.7);
});
async function setSound(on){
 if(audioPending||on===enabled)return;audioPending=true;
 try {
  if(!on){enabled=false;await sound.pause();}
  else{sound??=createSound();sound.update(state);await sound.resume();enabled=visible&&!document.hidden;if(!enabled)await sound.pause();hideGate();}
  updateCopy();
 }catch{document.querySelector('.chapter-caption').textContent=copy[language].error;}finally{audioPending=false;}
}
audioButton.addEventListener('click',()=>setSound(!enabled));
/**
 * The page is meant to be heard, but sound stays opt-in: on first sight a small dialog over
 * the stage asks for it. Declining leaves the pulsing footer button and a reminder on taps.
 */
const gate=document.querySelector('.sound-gate'),hint=document.querySelector('.sound-hint');
let gateShown=still,hintAt=-Infinity,hintTimer=0;
function showGate(){
 if(gateShown||enabled)return;gateShown=true;gate.hidden=false;
 gate.querySelector('.sound-gate__on').focus({preventScroll:true});
}
function hideGate(){if(gate.hidden)return;const inside=gate.contains(document.activeElement);gate.hidden=true;if(inside)audioButton.focus({preventScroll:true});}
gate.querySelector('.sound-gate__on').addEventListener('click',async()=>{
 await setSound(true);
 // A short rising strum answers at once, so the sound is clearly on.
 if(enabled){const now=performance.now()/1000;[10,22,34,46,58,70].forEach((fin,i)=>strike(fin,.45+i*.06,{at:now+.08+i*.1}));}
});
gate.querySelector('.sound-gate__skip').addEventListener('click',hideGate);
function remindSound(){
 const now=performance.now();if(!gate.hidden||now-hintAt<9000)return;hintAt=now;
 hint.textContent=copy[language].soundHint;hint.hidden=false;clearTimeout(hintTimer);hintTimer=setTimeout(()=>{hint.hidden=true;},3600);
}
let drag=null,strum=null;const plucked=new Map();
const local=event=>{const box=canvas.getBoundingClientRect();return [event.clientX-box.left,event.clientY-box.top];};
function beginDrag(event){
 if(event.button!==0)return;
 // On mobile the visible range stays a native slider; the canvas supports two axes.
 if(event.currentTarget===shapeInput&&!wide.matches)return;
 event.preventDefault();
 const bounds=canvas.getBoundingClientRect();
 drag={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),travel:0,target:event.currentTarget,value:state.shape,lift:state.lift,gain:100/Math.max(160,bounds.width*.4),height:bounds.height};
 state.dragging=true;event.currentTarget.setPointerCapture(event.pointerId);
}
function dragShape(event){
 if(!drag){if(event.currentTarget===canvas)brush(event);return;}
 if(event.pointerId!==drag.id)return;
 drag.travel=Math.max(drag.travel,Math.hypot(event.clientX-drag.x,event.clientY-drag.y));
 if(drag.travel<6)return;
 state.shape=Math.max(0,Math.min(100,drag.value+(event.clientX-drag.x)*drag.gain));
 state.lift=Math.max(-1,Math.min(1,drag.lift-(event.clientY-drag.y)/drag.height*2.4));
 shapeInput.value=state.shape;change();
}
function release(event){
 // A short tap without travel strikes the fin under the pointer.
 if(drag&&event.type==='pointerup'&&drag.target===canvas&&drag.travel<6&&performance.now()-drag.time<450){
  const [x,y]=local(event),index=sculpture?.pick(x,y,1.5)??-1;if(index>=0)strike(index,.85,{label:true});
 }
 drag=null;state.dragging=false;
}
/** Sweeping the mouse quickly across neighbouring fins plucks them like harp strings. */
function brush(event){
 if(event.pointerType!=='mouse'||!sculpture)return;
 const [x,y]=local(event),index=sculpture.pick(x,y,1.05),now=performance.now();
 if(state.hover!==index){state.hover=index;art?.invalidate();}
 if(index>=0&&strum?.index>=0&&index!==strum.index&&Math.abs(index-strum.index)<=6){
  const speed=Math.hypot(x-strum.x,y-strum.y)/Math.max(8,now-strum.time)*1000;
  if(speed>240){
   const step=Math.sign(index-strum.index);
   for(let i=strum.index+step;i!==index+step;i+=step)if(now-(plucked.get(i)||0)>160){plucked.set(i,now);strike(i,Math.min(.55,.2+speed/5000));}
  }
 }
 strum={index,x,y,time:now};
}
for(const target of [canvas,shapeInput]){
 target.addEventListener('pointerdown',beginDrag);target.addEventListener('pointermove',dragShape);
 target.addEventListener('pointerup',release);target.addEventListener('pointercancel',release);target.addEventListener('lostpointercapture',()=>{drag=null;state.dragging=false;});
}
canvas.addEventListener('pointerleave',()=>{state.hover=-1;strum=null;art?.invalidate();});
canvas.addEventListener('dblclick',()=>{state.shape=55;state.lift=0;shapeInput.value=55;change();});
let wheel=0,lastWheel=0;
stage.addEventListener('wheel',event=>{
 if(event.ctrlKey)return;
 const unit=event.deltaMode===1?16:event.deltaMode===2?innerWidth:1;
 const dx=(event.shiftKey&&!event.deltaX?event.deltaY:event.deltaX)*unit;
 if(event.shiftKey||Math.abs(dx)>Math.abs(event.deltaY*unit)){
  event.preventDefault();state.shape=Math.max(0,Math.min(100,state.shape+dx*.11));shapeInput.value=state.shape;change();return;
 }
 const direction=Math.sign(event.deltaY);
 if((state.chapter===0&&direction<0)||(state.chapter===5&&direction>0))return;
 event.preventDefault();wheel+=event.deltaY*(event.deltaMode===1?18:1);
 if(Math.abs(wheel)>70&&performance.now()-lastWheel>400){select(state.chapter+Math.sign(wheel));wheel=0;lastWheel=performance.now();}
},{passive:false});
addEventListener('pagehide',()=>{sound?.dispose();clearInterval(conduct.timer);cancelAnimationFrame(loop);},{once:true});
updateRooms();change();
if(import.meta.env.DEV)window.__resonanz={state,field,sculpture,strike,select};
await Promise.all([document.fonts.ready,sculpture?.ready]);art?.resize();art?.renderStill();measure();bridge.ready();
// A first, silent strike shows that the fins can be played.
if(!still&&!motion.matches)setTimeout(()=>strike(anchors.handle,.8),900);
