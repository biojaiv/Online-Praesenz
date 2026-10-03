/** A warm, harmonic instrument. Shape controls three octaves and timbre; every fin can be struck. */
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const outputLevel=.15;
const presets=[
 // Fundamental, soft triangle, octave, then quiet harmonic partials.
 [.72,.18,.13,.025,.008,0,0,0],
 [.84,.10,.045,0,0,0,0,0],
 [.50,.12,.28,.14,.065,.020,.008,0],
 [.61,.15,.14,.065,.027,.012,.003,0],
 [.64,.16,.19,.055,.016,.004,0,0],
 [.54,.06,.23,.095,.10,.025,.014,.004]
];
/** Room tails in seconds. Strikes, ripples and the trace share them. */
export const roomDecay=space=>.4+Math.pow(clamp(space/85),1.35)*2.8;
// Impulse and rhythm let their strikes lead; the sustained bed steps back.
const bed=[.52,1,1,.82,.5,.62];
const pentatonic=[0,2,4,7,9];
/** Fins are tuned along the spine: two pentatonic octaves on the drone's own pitch class. */
export function finNote(state,index,count=82){
 let base=soundProfile(state).frequency;while(base>=220)base/=2;while(base<110)base*=2;
 const step=Math.round(clamp(index/(count-1))*10);
 return base*Math.pow(2,(12*Math.floor(step/5)+pentatonic[step%5])/12);
}
export function noteName(frequency,language='de'){
 const midi=Math.round(69+12*Math.log2(frequency/440));
 const notes=language==='de'?['C','C♯','D','D♯','E','F','F♯','G','G♯','A','B','H']:['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
 return notes[(midi%12+12)%12]+(Math.floor(midi/12)-1);
}
export function soundProfile({shape=55,lift=0,space=35,chapter=2}) {
 const u=clamp(shape/100);
 const brightness=clamp(.18+u*.59+lift*.25,.04,1);
 const frequency=65.406*Math.pow(2,u*3)*[.75,1,1,1,.75,1][chapter];
 const levels=presets[chapter].map((gain,i)=>gain*(i<2?1.05-u*.12:.22+brightness*1.1));
 const total=levels.reduce((a,b)=>a+b,0);for(let i=0;i<levels.length;i++)levels[i]/=total;
 return {frequency,brightness,levels,ratios:[1,1,2,3,4,5,6,8],
  cutoff:420+Math.pow(brightness,1.4)*2200,
  noise:chapter===3?.008:0,
  room:clamp(space/100+(chapter===3?.16:0),0,.9),
  pulse:chapter===4?.07:chapter===0?.05:.018,bed:bed[chapter],
  rate:chapter===4?.65+u*1.55:.18+u*.35,
  vibrato:chapter===5?2.5:chapter===3?1.8:.6,
  pan:(u-.5)*.42,detune:chapter===3?2:chapter===5?1.2:0
 };
}

function hold(parameter,time){
 if(parameter.cancelAndHoldAtTime)parameter.cancelAndHoldAtTime(time);
 else{const value=parameter.value;parameter.cancelScheduledValues(time);parameter.setValueAtTime(value,time);}
}

/** The live instrument and the offline audio checks share this exact graph. */
export function createSoundGraph(context,{silent=false,drone=true}={}) {
 const master=context.createGain(),mix=context.createGain(),filter=context.createBiquadFilter();
 const dry=context.createGain(),wet=context.createGain(),convolver=context.createConvolver(),hall=context.createConvolver(),hallWet=context.createGain();
 const airFilter=context.createBiquadFilter(),ceiling=context.createBiquadFilter();
 const panner=context.createStereoPanner(),compressor=context.createDynamicsCompressor();
 const initialLevel=silent?0:outputLevel;
 master.gain.setValueAtTime(initialLevel,context.currentTime);
 let envelope={from:initialLevel,to:initialLevel,start:context.currentTime,end:context.currentTime};
 mix.gain.value=.70;filter.type='lowpass';filter.Q.value=.5;
 ceiling.type='lowpass';ceiling.frequency.value=3200;ceiling.Q.value=.5;
 airFilter.type='lowpass';airFilter.frequency.value=1600;airFilter.Q.value=.5;
 compressor.threshold.value=-18;compressor.knee.value=18;compressor.ratio.value=2;compressor.attack.value=.03;compressor.release.value=.3;
 let seed=19;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 function room(seconds,predelay,darkness){
  const impulse=context.createBuffer(2,Math.ceil(context.sampleRate*seconds),context.sampleRate),onset=Math.round(context.sampleRate*predelay);
  for(let channel=0;channel<2;channel++){
   const data=impulse.getChannelData(channel);let smooth=0;
   for(let i=onset;i<data.length;i++){
    smooth=smooth*darkness+(random()*2-1)*(1-darkness);
    data[i]=smooth*Math.min(1,(i-onset)/(context.sampleRate*.025))*Math.pow(1-i/data.length,3);
   }
  }
  return impulse;
 }
 convolver.buffer=room(2.2,.018,.82);hall.buffer=room(4.6,.045,.86);
 mix.connect(filter);filter.connect(dry);filter.connect(convolver);filter.connect(hall);convolver.connect(airFilter);airFilter.connect(wet);hall.connect(hallWet);hallWet.connect(airFilter);
 // Strikes bypass the drone's tremolo and filter, but share the rooms.
 const strikeBus=context.createGain(),strikeFilter=context.createBiquadFilter();
 strikeFilter.type='lowpass';strikeFilter.frequency.value=2300;strikeFilter.Q.value=.4;strikeBus.gain.value=.62;
 strikeBus.connect(strikeFilter);strikeFilter.connect(dry);strikeFilter.connect(convolver);strikeFilter.connect(hall);
 dry.connect(panner);wet.connect(panner);panner.connect(ceiling);ceiling.connect(compressor);compressor.connect(master);master.connect(context.destination);
 const voices=['sine','triangle','sine','sine','sine','sine','sine','sine'].map(type=>{
  const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;gain.gain.value=0;
  oscillator.connect(gain);gain.connect(mix);oscillator.start();return {oscillator,gain};
 });
 const noise=context.createBufferSource(),noiseGain=context.createGain(),noiseBuffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
 const noiseData=noiseBuffer.getChannelData(0);let brown=0;
 for(let i=0;i<noiseData.length;i++){brown=(brown+.035*(random()*2-1))/1.015;noiseData[i]=brown*4;}
 noise.buffer=noiseBuffer;noise.loop=true;noiseGain.gain.value=0;noise.connect(noiseGain);noiseGain.connect(mix);noise.start();
 const tremolo=context.createOscillator(),tremoloDepth=context.createGain(),vibrato=context.createOscillator(),vibratoDepth=context.createGain();
 tremoloDepth.gain.value=0;vibratoDepth.gain.value=0;tremolo.connect(tremoloDepth);tremoloDepth.connect(mix.gain);tremolo.start();
 vibrato.frequency.value=.8;vibrato.connect(vibratoDepth);voices.forEach(({oscillator})=>vibratoDepth.connect(oscillator.detune));vibrato.start();
 const set=(parameter,value,time,instant)=>{
  hold(parameter,time);
  if(instant)parameter.setValueAtTime(value,time);
  else parameter.setTargetAtTime(value,time,.11);
 };
 function update(state,instant=false){
  const p=soundProfile(state),time=context.currentTime;
  voices.forEach(({oscillator,gain},i)=>{
   set(oscillator.frequency,p.frequency*p.ratios[i],time,instant);
   set(oscillator.detune,(i%2?1:-1)*p.detune,time,instant);
   set(gain.gain,p.levels[i],time,instant);
  });
  set(filter.frequency,p.cutoff,time,instant);
  const cathedral=clamp((p.room-.4)/.45);
  set(noiseGain.gain,p.noise,time,instant);set(dry.gain,1-p.room*.25,time,instant);set(wet.gain,p.room*.46*(1-cathedral*.7),time,instant);set(hallWet.gain,p.room*.34*cathedral,time,instant);
  set(mix.gain,drone?.70*p.bed:0,time,instant);decay=roomDecay(state.space??35);
  set(panner.pan,p.pan,time,instant);set(tremoloDepth.gain,drone?p.pulse:0,time,instant);set(tremolo.frequency,p.rate,time,instant);set(vibratoDepth.gain,p.vibrato,time,instant);
  return p;
 }
 let decay=roomDecay(35);const ringing=new Set();
 const partials=[
  [[1,1,1],[2,.3,.55],[3,.1,.32],[4,.04,.2]],
  [[1,1,1],[2,.22,.4],[3,.07,.22]],
  // A slightly detuned twin makes the shimmer chapter beat softly, without bell-like ratios.
  [[1,.75,1],[1.0045,.5,1],[2,.32,.6],[3,.11,.35],[4,.045,.25]]
 ];
 /** A soft mallet on one fin: harmonic partials, 5 ms attack, room-dependent decay. */
 function strike(frequency,{velocity=.7,pan=0,when=context.currentTime,chapter=2,length=decay}={}){
  if(ringing.size>=14)return;
  const time=Math.max(when,context.currentTime),out=context.createGain(),stereo=context.createStereoPanner();
  out.gain.value=clamp(velocity)*.8;stereo.pan.value=clamp(pan,-1,1);out.connect(stereo);stereo.connect(strikeBus);
  const oscillators=[],series=chapter===0?partials[1]:chapter===5?partials[2]:partials[0];let end=time;
  for(const [ratio,gain,share] of series){
   const f=frequency*ratio;if(f>3400)continue;
   const oscillator=context.createOscillator(),envelope=context.createGain(),tail=Math.max(.14,length*share*(f>900?.7:1));
   oscillator.frequency.value=f;envelope.gain.setValueAtTime(0,time);envelope.gain.linearRampToValueAtTime(gain,time+.005);envelope.gain.setTargetAtTime(0,time+.005,tail/3);
   oscillator.connect(envelope);envelope.connect(out);oscillator.start(time);oscillator.stop(time+.005+tail*2.4);end=Math.max(end,time+.005+tail*2.4);oscillators.push(oscillator);
  }
  const voice={oscillators,out};ringing.add(voice);
  oscillators.at(-1).onended=()=>{ringing.delete(voice);out.disconnect();stereo.disconnect();};
  return end;
 }
 function fade(audible,duration=.24,time=context.currentTime){
  const progress=envelope.end===envelope.start?1:clamp((time-envelope.start)/(envelope.end-envelope.start));
  const level=envelope.from+(envelope.to-envelope.from)*progress;
  // Anchor both ends, including silence before a scheduled attack. Truncating a
  // previous ramp at its interpolated value also makes interrupted fades smooth.
  master.gain.cancelScheduledValues(time);
  master.gain.linearRampToValueAtTime(level,time);
  master.gain.linearRampToValueAtTime(audible?outputLevel:0,time+duration);
  envelope={from:level,to:audible?outputLevel:0,start:time,end:time+duration};
 }
 return {update,fade,strike,get time(){return context.currentTime;},dispose(){voices.forEach(({oscillator})=>oscillator.stop());ringing.forEach(voice=>voice.oscillators.forEach(oscillator=>oscillator.stop()));noise.stop();tremolo.stop();vibrato.stop();master.disconnect();}};
}
/** Constructed only after the explicit sound-button gesture. */
export function createSound(){
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Web Audio unavailable');
 const context=new Audio(),graph=createSoundGraph(context,{silent:true});
 let revision=0,disposed=false;
 return {update:graph.update,
  /** Schedules a strike at a performance.now() time (seconds); returns false while silent. */
  strike(frequency,options={},at=performance.now()/1000){
   if(disposed||context.state!=='running')return false;
   graph.strike(frequency,{...options,when:graph.time+Math.max(0,at-performance.now()/1000)});return true;
  },
  async resume(){
   const request=++revision;if(disposed)return;
   await context.resume();
   if(request===revision&&!disposed)graph.fade(true);
  },
  async pause(){
   const request=++revision;if(disposed||context.state!=='running')return;
   graph.fade(false,.12);
   // A short release avoids cutting a waveform mid-cycle. Never resume on visibility.
   await new Promise(resolve=>setTimeout(resolve,145));
   if(request===revision&&!disposed&&context.state==='running')await context.suspend();
  },
  dispose(){if(disposed)return;disposed=true;revision++;graph.dispose();return context.close();},
  get state(){return context.state;}
 };
}
