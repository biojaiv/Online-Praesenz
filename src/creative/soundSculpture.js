import * as THREE from 'three';
import { loadBlenderAsset, modelUnavailable } from './blenderAsset.js';
import { soundProfile } from './resonanzAudio.js';
const asset=new URL('../../Elemente/Beispiele/RESONANZ_web.glb',import.meta.url).href;
const lightAsset=new URL('../../Elemente/Beispiele/RESONANZ_low_web.glb',import.meta.url).href;
/**
 * Each room is a different photographic studio. Reverb blurs sound the way roughness blurs
 * reflections: dry has small hard boxes, the studio long softboxes, the cathedral tall windows.
 */
const rooms={
 0:{background:'#1a0911',roughness:.1,intensity:1.05,panels:[[-2.6,3.2,4,1.3,1.3,[9,8.2,7.8]],[4.2,.6,3.2,.55,3.4,[7,6.4,6.2]],[0,-5,-2,8,.7,[1.2,.4,.6]],[-6,1,0,1.2,6,[2.2,1.9,1.9]]]},
 35:{background:'#302029',roughness:.16,intensity:1.25,panels:[[-3,6,3,9,2,[6,5.3,5]],[5,1,4,1.1,8,[5,4.7,4.6]],[-5,-2,4,1.6,7,[4.2,3.4,3.6]],[0,-5,-3,10,1.1,[2.2,.8,1.1]],[1,4,-5,7,.8,[4,3.5,3.5]],[-8,3,1,5,9,[3.6,3.3,3.2]],[8,-1,0,4,8,[3.2,2.8,2.8]]]},
 85:{background:'#3d2431',roughness:.25,intensity:1.4,panels:[
  ...Array.from({length:9},(_,k)=>{const a=k/9*Math.PI*2+.2;return [Math.cos(a)*7.5,2.6,Math.sin(a)*7.5,.62,7.5,[4.6,3.9,3.4]];}),
  [0,9,0,6,6,[3.4,2.6,2.9]],[0,-5,0,14,1.6,[1.8,.7,1]]]}
};
function studio(renderer,room){
 const setup=rooms[room],scene=new THREE.Scene();scene.background=new THREE.Color(setup.background);
 const geometry=new THREE.PlaneGeometry(1,1),materials=[];
 for(const [x,y,z,w,h,color] of setup.panels){
  const material=new THREE.MeshBasicMaterial({color:new THREE.Color(...color),side:THREE.DoubleSide});materials.push(material);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,1);mesh.lookAt(0,0,0);scene.add(mesh);
 }
 const generator=new THREE.PMREMGenerator(renderer),environment=generator.fromScene(scene,.035,.1,100);
 generator.dispose();geometry.dispose();materials.forEach(m=>m.dispose());return environment;
}
// How strongly each chapter's harmonics lay standing waves over the fins.
const standing=[.1,.5,.62,.3,.14,.24];
const paint=(colours,o,glow,alpha)=>{colours[o]=.98-glow*.1;colours[o+1]=.86+glow*.12;colours[o+2]=.86-glow*.3;colours[o+3]=alpha;};
const silver=new THREE.Color(1,1,1),rose=new THREE.Color(1.55,1.12,1.2),light=new THREE.Color(2.3,2.45,1.5);
/**
 * The sculpture is the instrument: the authored Blender spine morphs with the shape control,
 * the chapter's partials appear as standing waves, and every strike travels along the fins.
 */
export function createSculpture(art,state,still,{field,onFrame}={}){
 const root=new THREE.Group();root.name='RESONANZ · Blender lamellae';art.scene.add(root);
 const environments={};const environment=room=>environments[room]??=studio(art.renderer,room);
 let room=state.space;art.scene.environment=environment(room).texture;
 const size=new THREE.Vector2(1,1);
 art.camera.position.set(0,.6,18);art.camera.lookAt(0,.6,0);
 art.setFraming((width,height,camera)=>{
  camera.aspect=width/height;
  camera.position.z=Math.max(11.7,5.45/(Math.tan(camera.fov*Math.PI/360)*camera.aspect));
  camera.updateMatrixWorld();size.set(width,height);
 });
 let instances,strings,material,poses=[],positions=[],directions=[],centres=[],tips=[],lastTime=0,rim=[];
 const response={shape:state.shape,lift:0,hover:0,hoverIndex:-1,roughness:rooms[room].roughness,levels:soundProfile(state).levels.slice(),mix:[0,0,0,0,0,0]};
 response.mix[state.chapter]=1;
 const dummy=new THREE.Object3D(),twist=new THREE.Quaternion(),bend=new THREE.Quaternion(),axis=new THREE.Vector3(1,0,0),tangent=new THREE.Vector3(),target=new THREE.Vector3();
 const up=new THREE.Vector3(),normal=new THREE.Vector3(),point=new THREE.Vector3(),tip=new THREE.Vector3(),colour=new THREE.Color();
 // Canvas pixels of every fin centre, its rim and its apparent radius; used for picking and labels.
 const projected={x:new Float32Array(0),y:new Float32Array(0),r:new Float32Array(0),tipX:new Float32Array(0),tipY:new Float32Array(0),ready:false};
 const ready=loadBlenderAsset(art.low?lightAsset:asset).then(scene=>{
  scene.updateMatrixWorld(true);const lamellae=[];
  scene.traverse(object=>{if(object.isMesh)lamellae.push(object);});
  lamellae.sort((a,b)=>a.userData.lamellaIndex-b.userData.lamellaIndex);
  const geometry=lamellae[0].geometry;material=lamellae[0].material;
  material.color.set('#dbd2d1');material.roughness=response.roughness;material.metalness=1;material.envMapIntensity=rooms[room].intensity;
  instances=new THREE.InstancedMesh(geometry,material,lamellae.length);
  instances.name='82 shared Blender lamellae';instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);instances.frustumCulled=false;
  instances.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(lamellae.length*3).fill(1),3);instances.instanceColor.setUsage(THREE.DynamicDrawUsage);
  poses=lamellae.map(object=>{const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();object.matrixWorld.decompose(p,q,s);return {p,q,s};});
  positions=poses.map(({p})=>p.clone());centres=poses.map(({p})=>p.clone());tips=poses.map(({p})=>p.clone());
  directions=poses.map((_,i)=>poses[Math.min(i+1,poses.length-1)].p.clone().sub(poses[Math.max(0,i-1)].p).normalize());
  // Three fine strings run between neighbouring fins, as in the concept sheet.
  geometry.computeBoundingBox();const box=geometry.boundingBox;
  rim=[.35,2.45,4.55].map(a=>new THREE.Vector3(0,Math.sin(a)*box.max.y*.93,Math.cos(a)*box.max.z*.93));tip.set(0,box.max.y*.96,0);
  const segments=(poses.length-1)*rim.length,line=new THREE.BufferGeometry();
  line.setAttribute('position',new THREE.BufferAttribute(new Float32Array(segments*6),3).setUsage(THREE.DynamicDrawUsage));
  line.setAttribute('color',new THREE.BufferAttribute(new Float32Array(segments*8),4).setUsage(THREE.DynamicDrawUsage));
  strings=new THREE.LineSegments(line,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,depthWrite:false}));
  strings.name='Resonant strings';strings.frustumCulled=false;
  for(const name of ['x','y','r','tipX','tipY'])projected[name]=new Float32Array(poses.length);
  root.add(instances,strings);root.userData.source='RESONANZ.blend';art.renderer.domElement.dataset.modelReady='true';art.invalidate();
 }).catch(error=>modelUnavailable(art.renderer.domElement,error));
 function project(vector,index,key){
  point.copy(vector).applyMatrix4(root.matrixWorld).project(art.camera);
  projected[key==='tip'?'tipX':'x'][index]=(point.x+1)*.5*size.x;projected[key==='tip'?'tipY':'y'][index]=(1-point.y)*.5*size.y;
 }
 art.setUpdate(time=>{
  if(!instances)return;
  const calm=still||art.motion.matches,t=calm?0:time,now=performance.now()/1000;
  const dt=Math.min(.05,Math.max(1/120,time-lastTime||1/30));lastTime=time;
  const follow=calm?1:1-Math.exp(-dt*(state.dragging?24:13));
  response.shape=THREE.MathUtils.lerp(response.shape,state.shape,follow);
  response.lift=THREE.MathUtils.lerp(response.lift,state.lift||0,follow);
  if(state.hover>=0)response.hoverIndex=state.hover;
  response.hover=THREE.MathUtils.lerp(response.hover,state.hover>=0?1:0,calm?1:1-Math.exp(-dt*9));
  if(room!==state.space){room=state.space;art.scene.environment=environment(room).texture;material.envMapIntensity=rooms[room].intensity;}
  response.roughness=THREE.MathUtils.lerp(response.roughness,rooms[room].roughness,calm?1:1-Math.exp(-dt*4));material.roughness=response.roughness;
  const shape=(response.shape-55)/(response.shape<55?55:45),amount=Math.abs(shape);
  const tone=(state.tone-45)/100,space=(state.space-35)/100,profile=soundProfile(state);
  // Chapters blend into each other rather than switching: one weight per chapter.
  const blend=calm?1:1-Math.exp(-dt*2.6),mix=response.mix;
  for(let c=0;c<6;c++)mix[c]=THREE.MathUtils.lerp(mix[c],c===state.chapter?1:0,blend);
  for(let n=0;n<response.levels.length;n++)response.levels[n]=THREE.MathUtils.lerp(response.levels[n],profile.levels[n],blend);
  const [impulse,pure,,air,,shimmer]=mix,strength=mix.reduce((sum,w,c)=>sum+w*standing[c],0);
  field?.prune(now);
  // Morph the entire spine: a compact spiral opens into a long, rolling wave.
  // The authored Blender pose is preserved at the centre of the control.
  for(let i=0;i<poses.length;i++){
   const u=i/(poses.length-1),a=u*Math.PI*2;
   if(shape>=0)target.set((u-.5)*10.6,Math.sin(a+.45)*1.6+.6,Math.cos(a)*.8);
   else{
    const radius=4.15-3.5*u,angle=u*Math.PI*2.65-2.6;
    target.set(Math.cos(angle)*radius,Math.sin(angle)*radius*.7+.6,Math.sin(u*Math.PI)*1.1);
   }
   positions[i].copy(poses[i].p).lerp(target,amount);
   positions[i].y+=Math.sin(u*Math.PI)*response.lift*1.25;
   positions[i].z+=Math.sin(a*1.5)*response.lift*.95+Math.sin(u*Math.PI)*space*.8;
   // The room chapter spreads the fins apart, as if the air between them had grown.
   positions[i].x*=1+air*.07;positions[i].z*=1+air*.1;positions[i].y+=air*Math.sin(t*.5+u*3)*.12;
  }
  const stringPositions=strings.geometry.attributes.position.array,stringColours=strings.geometry.attributes.color.array;
  for(let i=0;i<poses.length;i++){
   const {q,s}=poses[i],u=i/(poses.length-1);
   // Standing waves: the same partial levels the oscillators play, as modes of a string.
   let wave=0;
   // Square roots keep quiet upper partials visible next to the fundamental.
   if(!calm)for(let n=0;n<response.levels.length;n++){const h=profile.ratios[n];wave+=Math.sqrt(response.levels[n])*Math.sin(h*Math.PI*u)*Math.cos(t*Math.PI*2*.16*h+n*.9);}
   wave*=strength;
   const struck=calm||!field?0:field.wave(u,now),lit=calm||!field?0:field.light(u,now);
   const near=response.hoverIndex<0?0:response.hover*Math.exp(-(((i-response.hoverIndex)/2.6)**2));
   tangent.copy(positions[Math.min(i+1,poses.length-1)]).sub(positions[Math.max(0,i-1)]).normalize();
   normal.copy(up.set(0,1,0)).addScaledVector(tangent,-tangent.y).normalize();
   dummy.position.copy(positions[i]).addScaledVector(normal,struck*.32);
   bend.setFromUnitVectors(directions[i],tangent);
   dummy.quaternion.copy(bend).multiply(q);
   // Shimmer rolls a slow twist along the spine, so highlights travel across the chrome.
   const roll=shimmer*(calm?0:Math.sin(t*1.5-u*13)*.42)+impulse*Math.sin(u*9)*.3;
   twist.setFromAxisAngle(axis,shape*Math.sin(u*5)*.8+response.lift*Math.sin(u*4)*.65+struck*.7+wave*.5+roll);dummy.quaternion.multiply(twist);
   // A pure tone evens the authored silhouette into a single breathing spindle.
   const spindle=.32+1.05*Math.pow(Math.sin(Math.PI*Math.min(1,u*1.12)),.75),radius=s.y/1.2,even=1+pure*.62*(spindle/Math.max(.15,radius)-1);
   const spacing=1-amount*.26,swell=(1+wave*.32+struck*.24+near*.11)*even*(1-impulse*.24);
   dummy.scale.copy(s);dummy.scale.y*=spacing*(1+tone*.3)*swell;dummy.scale.z*=spacing*(1+shape*.12)*swell;
   dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);
   // A struck fin flashes pale citron light, then cools through rose back to silver.
   const sparkle=calm?0:shimmer*Math.pow(Math.max(0,Math.sin(t*2.3+i*2.399)),28)*1.3;
   const glow=Math.min(1.4,lit*1.3+near*.35+sparkle);
   colour.copy(silver).lerp(rose,Math.min(1,glow*1.6)).lerp(light,Math.min(1,Math.max(0,glow-.3)*1.3));instances.setColorAt(i,colour);
   // String ends sit on this fin's rim; neighbours share the segment.
   for(let k=0;k<rim.length;k++){
    point.copy(rim[k]).applyMatrix4(dummy.matrix);
    if(i<poses.length-1){const o=((i*rim.length+k)*2)*3;stringPositions[o]=point.x;stringPositions[o+1]=point.y;stringPositions[o+2]=point.z;}
    if(i>0){const o=(((i-1)*rim.length+k)*2+1)*3;stringPositions[o]=point.x;stringPositions[o+1]=point.y;stringPositions[o+2]=point.z;}
    const alpha=Math.min(.95,.13+glow*.6+Math.abs(wave)*.12);
    if(i<poses.length-1)paint(stringColours,((i*rim.length+k)*2)*4,glow,alpha);
    if(i>0)paint(stringColours,(((i-1)*rim.length+k)*2+1)*4,glow,alpha);
   }
   centres[i].copy(dummy.position);tips[i].copy(tip).applyMatrix4(dummy.matrix);
  }
  instances.instanceMatrix.needsUpdate=true;instances.instanceColor.needsUpdate=true;
  strings.geometry.attributes.position.needsUpdate=true;strings.geometry.attributes.color.needsUpdate=true;
  root.rotation.y=.08+Math.sin(t*.15)*(.025+air*.045);
  root.userData.shape=response.shape;root.userData.lift=response.lift;
  root.updateMatrixWorld(true);
  for(let i=0;i<poses.length;i++){project(centres[i],i);project(tips[i],i,'tip');projected.r[i]=Math.hypot(projected.tipX[i]-projected.x[i],projected.tipY[i]-projected.y[i]);}
  projected.ready=true;onFrame?.(projected);
 });
 art.setContinuous(!still);addEventListener('pagehide',()=>Object.values(environments).forEach(e=>e.dispose()),{once:true});
 return {root,ready,projected,
  get count(){return poses.length||82;},
  /** The fin under a canvas point, or -1. Generous on small fins so taps feel reliable. */
  pick(x,y,tolerance=1){
   if(!projected.ready)return -1;let best=-1,score=Infinity;
   for(let i=0;i<projected.x.length;i++){const d=Math.hypot(x-projected.x[i],y-projected.y[i])/Math.max(14,projected.r[i]*1.08);if(d<score){score=d;best=i;}}
   return score<=tolerance?best:-1;
  }
 };
}
