/** A warm, harmonic instrument. Shape still controls three octaves and timbre. */
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
  pulse:chapter===4?.17:chapter===0?.085:.018,
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
export function createSoundGraph(context,{silent=false}={}) {
 const master=context.createGain(),mix=context.createGain(),filter=context.createBiquadFilter();
 const dry=context.createGain(),wet=context.createGain(),convolver=context.createConvolver();
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
 const impulse=context.createBuffer(2,Math.ceil(context.sampleRate*2.2),context.sampleRate);
 const onset=Math.round(context.sampleRate*.018);
 for(let channel=0;channel<2;channel++){
  const data=impulse.getChannelData(channel);let smooth=0;
  for(let i=onset;i<data.length;i++){
   smooth=smooth*.82+(random()*2-1)*.18;
   data[i]=smooth*Math.min(1,(i-onset)/(context.sampleRate*.025))*Math.pow(1-i/data.length,3);
  }
 }
 convolver.buffer=impulse;mix.connect(filter);filter.connect(dry);filter.connect(convolver);convolver.connect(airFilter);airFilter.connect(wet);
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
  set(noiseGain.gain,p.noise,time,instant);set(dry.gain,1-p.room*.25,time,instant);set(wet.gain,p.room*.46,time,instant);
  set(panner.pan,p.pan,time,instant);set(tremoloDepth.gain,p.pulse,time,instant);set(tremolo.frequency,p.rate,time,instant);set(vibratoDepth.gain,p.vibrato,time,instant);
  return p;
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
 return {update,fade,dispose(){voices.forEach(({oscillator})=>oscillator.stop());noise.stop();tremolo.stop();vibrato.stop();master.disconnect();}};
}
/** Constructed only after the explicit sound-button gesture. */
export function createSound(){
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Web Audio unavailable');
 const context=new Audio(),graph=createSoundGraph(context,{silent:true});
 let revision=0,disposed=false;
 return {update:graph.update,
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
