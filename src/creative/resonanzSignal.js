const citron='223,255,101';
/**
 * The citron trace draws the instrument's own waveform: the chapter's partials at the current
 * pitch, swelling where each strike happened. Room echoes trail as fading, delayed copies.
 */
export function createSignal(canvas,{state,field,profile}){
 const context=canvas.getContext('2d'),count=240,ys=new Float32Array(count+1);
 const dust=Array.from({length:150},(_,i)=>({x:(i*.61803398875)%1,offset:Math.sin(i*8.317),size:.7+(i%4)*.3,phase:i*1.7}));
 let width=0,height=0,ratio=1,stroke=null,haze=null;
 function resize(){
  const box=canvas.getBoundingClientRect();width=box.width;height=box.height;if(!width||!height)return;
  ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  const edge=(alpha)=>{const g=context.createLinearGradient(0,0,width,0);g.addColorStop(0,`rgba(${citron},0)`);g.addColorStop(.16,`rgba(${citron},${alpha})`);g.addColorStop(.84,`rgba(${citron},${alpha})`);g.addColorStop(1,`rgba(${citron},0)`);return g;};
  stroke=edge(1);haze=edge(.09);
 }
 function path(dx=0,scale=1,mid){
  context.beginPath();
  for(let j=0;j<=count;j++){const x=j/count*width+dx,y=mid+(ys[j]-mid)*scale;j?context.lineTo(x,y):context.moveTo(x,y);}
 }
 /** time: performance seconds; calm draws a still waveform for reduced motion. */
 function draw(time,calm=false){
  if(!width)return;
  const p=profile(),mid=height*.58,amplitude=height*.21,periods=Math.min(13,Math.max(2.2,p.frequency/40));
  const drift=calm?0:time*.22,pulse=calm?1:1-p.pulse*2.4*(.5+.5*Math.sin(time*Math.PI*2*p.rate)),bed=(.35+.65*p.bed)*pulse;
  for(let j=0;j<=count;j++){
   const x=j/count;let w=0;
   for(let n=0;n<p.levels.length;n++)w+=p.levels[n]*Math.sin(Math.PI*2*p.ratios[n]*(x*periods-drift)+n);
   ys[j]=mid-(w*amplitude*.5*bed*Math.pow(Math.sin(Math.PI*x),.6)+(calm?0:field.wave(x,time,'x'))*amplitude*1.1);
  }
  context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,width,height);context.lineJoin='round';
  // Dry rooms draw one crisp line; the cathedral trails five softer echoes.
  const echoes=state.space<20?0:state.space<60?2:5;
  for(let k=echoes;k>0;k--){
   path(k*(7+state.space*.11),Math.pow(.82,k),mid);
   context.strokeStyle=`rgba(${citron},${(.2*Math.pow(.72,k)).toFixed(3)})`;context.lineWidth=1;context.stroke();
  }
  path(0,1,mid);context.strokeStyle=haze;context.lineWidth=7;context.stroke();
  context.strokeStyle=stroke;context.lineWidth=1.3;context.stroke();
  // Fine citron dust gathers along the line and lifts where the field carries energy.
  for(const d of dust){
   const j=Math.round(d.x*count),x=d.x*width,lift=calm?0:Math.min(1.6,field.light(d.x,time,'x'));
   const spread=(5+Math.sin(Math.PI*d.x)*20)*(1+lift*1.4),y=ys[j]+d.offset*spread+(calm?0:Math.sin(time*.7+d.phase)*1.6);
   context.fillStyle=`rgba(${citron},${Math.min(.95,(.18+lift*.55)*Math.sin(Math.PI*d.x)).toFixed(3)})`;context.fillRect(x,y,d.size,d.size);
  }
  if(calm)return;
  // Where a strike lands, a hairline ring opens on the trace.
  for(const s of field.strikes){
   const age=time-s.time;if(age<0||age>1.4)continue;
   context.beginPath();context.arc(s.x*width,mid,4+age*34,0,Math.PI*2);
   context.strokeStyle=`rgba(${citron},${(.55*s.velocity*(1-age/1.4)).toFixed(3)})`;context.lineWidth=1;context.stroke();
  }
 }
 return {resize,draw};
}
/** Small, honest diagram: one period of the waveform above the eight partial levels. */
export function toneDiagram(profile){
 let wave='';
 for(let j=0;j<=96;j++){
  const x=j/96;let w=0;for(let n=0;n<profile.levels.length;n++)w+=profile.levels[n]*Math.sin(Math.PI*2*profile.ratios[n]*x*2+n);
  wave+=`${j?'L':'M'}${(2+x*150).toFixed(1)} ${(33-w*24).toFixed(1)}`;
 }
 const bars=profile.levels.map((level,n)=>{const x=168+n*8;return `M${x} 64V${(64-Math.min(1,level*1.6)*56).toFixed(1)}`;}).join('');
 return {wave,bars};
}
