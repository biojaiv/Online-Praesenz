/** Direct, on-demand vertical-axis orbit; vertical touch gestures stay native. */
export function createMachineRotation(canvas,machine,reset,labels){
 const controller=new AbortController(),options={signal:controller.signal};
 const stage=canvas.closest('.machine-stage');
 const label=document.createElement('div');label.className='part-label';label.hidden=true;
 label.setAttribute('role','tooltip');stage.append(label);
 let drag=null,pointer=null,hoverFrame=0;
 function clearHover(){
  pointer=null;label.hidden=true;delete canvas.dataset.hoveredPart;
  machine.setRotationPaused('hover',false);
 }
 function refresh(){
  if(!pointer||drag||document.querySelector('dialog[open]')){label.hidden=true;return;}
  const bounds=canvas.getBoundingClientRect();
  const x=pointer.x-bounds.left,y=pointer.y-bounds.top;
  const part=machine.pickPart(x/bounds.width,y/bounds.height);
  machine.setRotationPaused('hover',Boolean(part));
  label.hidden=!part;
  if(!part){delete canvas.dataset.hoveredPart;return;}
  canvas.dataset.hoveredPart=part;label.textContent=labels()[part];
  // Keep the label near the pointer without covering the selected surface.
  label.style.left=Math.max(8,Math.min(x+15,bounds.width-label.offsetWidth-8))+'px';
  label.style.top=Math.max(8,Math.min(y+18,bounds.height-label.offsetHeight-8))+'px';
 }
 function track(event){
  if(event.pointerType==='touch')return;
  pointer={x:event.clientX,y:event.clientY};
  if(!hoverFrame)hoverFrame=requestAnimationFrame(()=>{hoverFrame=0;refresh();});
 }
 canvas.addEventListener('pointermove',track,options);
 canvas.addEventListener('pointerenter',track,options);
 canvas.addEventListener('pointerleave',clearHover,options);
 function cancel(){
  const previous=drag;drag=null;canvas.classList.remove('is-dragging');
  machine.setRotationPaused('drag',false);
  if(previous&&canvas.hasPointerCapture(previous.id))canvas.releasePointerCapture(previous.id);
 }
 canvas.addEventListener('pointerdown',event=>{
  if(!event.isPrimary){cancel();return;}
  if(event.button!==0||!machine.loaded)return;
  cancel();
  machine.setRotationPaused('drag',true);
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,angle:machine.angle,
   scale:Math.PI*2/Math.max(280,canvas.clientWidth),active:event.pointerType!=='touch'};
  if(drag.active){canvas.setPointerCapture(event.pointerId);canvas.classList.add('is-dragging');canvas.focus({preventScroll:true});}
 },options);
 canvas.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  if(event.pointerType==='mouse'&&!(event.buttons&1)){cancel();return;}
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.active){
   if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;
   if(Math.abs(dy)>=Math.abs(dx)){cancel();return;}
   drag.active=true;canvas.setPointerCapture(event.pointerId);canvas.classList.add('is-dragging');
  }
  machine.setAngle(drag.angle-dx*drag.scale);
 },options);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{
  if(drag?.id===event.pointerId)cancel();
 },options);
 canvas.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   event.preventDefault();machine.setAngle(machine.angle+(event.key==='ArrowLeft'?1:-1)*Math.PI/18);
  }else if(event.key==='Home'){event.preventDefault();machine.setAngle(0);}
 },options);
 reset.addEventListener('click',()=>{cancel();machine.setAngle(0);canvas.focus({preventScroll:true});},options);
 addEventListener('blur',()=>{cancel();clearHover();},options);
 addEventListener('pagehide',()=>{cancel();clearHover();cancelAnimationFrame(hoverFrame);label.remove();controller.abort();},{once:true});
 canvas.tabIndex=0;canvas.dataset.rotatable='true';
 return {cancel,refresh,clearHover};
}
