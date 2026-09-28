import * as THREE from 'three';
import { loadBlenderAsset, modelUnavailable } from './blenderAsset.js';
const asset=new URL('../../Elemente/Beispiele/RESONANZ_web.glb',import.meta.url).href;
const lightAsset=new URL('../../Elemente/Beispiele/RESONANZ_low_web.glb',import.meta.url).href;
/** A few photographic softboxes create long chrome highlights without runtime shadows. */
function silverStudio(renderer){
 const studio=new THREE.Scene();studio.background=new THREE.Color('#302029');
 const geometry=new THREE.PlaneGeometry(1,1),materials=[];
 function panel(x,y,z,w,h,color){
  const material=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});materials.push(material);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,1);mesh.lookAt(0,0,0);studio.add(mesh);
 }
 panel(-3,6,3,9,2,new THREE.Color(6,5.3,5));
 panel(5,1,4,1.1,8,new THREE.Color(5,4.7,4.6));
 panel(-5,-2,4,1.6,7,new THREE.Color(4.2,3.4,3.6));
 panel(0,-5,-3,10,1.1,new THREE.Color(2.2,.8,1.1));
 panel(1,4,-5,7,.8,new THREE.Color(4,3.5,3.5));
 panel(-8,3,1,5,9,new THREE.Color(3.6,3.3,3.2));
 panel(8,-1,0,4,8,new THREE.Color(3.2,2.8,2.8));
 const generator=new THREE.PMREMGenerator(renderer),environment=generator.fromScene(studio,.035,.1,100);
 generator.dispose();geometry.dispose();materials.forEach(m=>m.dispose());return environment;
}
export function createSculpture(art,state,still){
 const root=new THREE.Group();root.name='RESONANZ · Blender lamellae';art.scene.add(root);
 const environment=silverStudio(art.renderer);art.scene.environment=environment.texture;
 art.camera.position.set(0,.6,18);art.camera.lookAt(0,.6,0);
 art.setFraming((width,height,camera)=>{
  camera.aspect=width/height;
  camera.position.z=Math.max(11.7,5.45/(Math.tan(camera.fov*Math.PI/360)*camera.aspect));
 });
 let instances,poses=[],positions=[],directions=[],lastTime=0;
 const response={shape:state.shape,lift:0};
 const dummy=new THREE.Object3D(),twist=new THREE.Quaternion(),bend=new THREE.Quaternion(),axis=new THREE.Vector3(1,0,0),tangent=new THREE.Vector3(),target=new THREE.Vector3();
 const ready=loadBlenderAsset(art.low?lightAsset:asset).then(scene=>{
  scene.updateMatrixWorld(true);const lamellae=[];
  scene.traverse(object=>{if(object.isMesh)lamellae.push(object);});
  lamellae.sort((a,b)=>a.userData.lamellaIndex-b.userData.lamellaIndex);
  const geometry=lamellae[0].geometry,material=lamellae[0].material;
  material.color.set('#dbd2d1');material.roughness=.16;material.metalness=1;material.envMapIntensity=1.25;
  instances=new THREE.InstancedMesh(geometry,material,lamellae.length);
  instances.name='82 shared Blender lamellae';instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);instances.frustumCulled=false;
  poses=lamellae.map(object=>{const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();object.matrixWorld.decompose(p,q,s);return {p,q,s};});
  positions=poses.map(({p})=>p.clone());
  directions=poses.map((_,i)=>poses[Math.min(i+1,poses.length-1)].p.clone().sub(poses[Math.max(0,i-1)].p).normalize());
  root.add(instances);root.userData.source='RESONANZ.blend';art.renderer.domElement.dataset.modelReady='true';art.invalidate();
 }).catch(error=>modelUnavailable(art.renderer.domElement,error));
 art.setUpdate(time=>{
  if(!instances)return;
  const t=still||art.motion.matches?0:time;
  const dt=Math.min(.05,Math.max(1/120,time-lastTime||1/30));lastTime=time;
  const follow=still||art.motion.matches?1:1-Math.exp(-dt*(state.dragging?24:13));
  response.shape=THREE.MathUtils.lerp(response.shape,state.shape,follow);
  response.lift=THREE.MathUtils.lerp(response.lift,state.lift||0,follow);
  const shape=(response.shape-55)/(response.shape<55?55:45),amount=Math.abs(shape);
  const tone=(state.tone-45)/100,space=(state.space-35)/100;
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
  }
  for(let i=0;i<poses.length;i++){
   const {q,s}=poses[i],u=i/(poses.length-1);
   dummy.position.copy(positions[i]);
   tangent.copy(positions[Math.min(i+1,poses.length-1)]).sub(positions[Math.max(0,i-1)]).normalize();
   bend.setFromUnitVectors(directions[i],tangent);
   dummy.quaternion.copy(bend).multiply(q);
   twist.setFromAxisAngle(axis,shape*Math.sin(u*5)*.8+response.lift*Math.sin(u*4)*.65);dummy.quaternion.multiply(twist);
   const breath=state.chapter===4?Math.sin(t*2.5-i*.24)*.045:Math.sin(t*.55+i*.15)*.008;
   const spacing=1-amount*.26;
   dummy.scale.copy(s);dummy.scale.y*=spacing*(1+tone*.3+breath);dummy.scale.z*=spacing*(1+shape*.12+breath);
   if(state.chapter===0){dummy.scale.y*=.7;dummy.scale.z*=.7;}
   dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);
  }
  instances.instanceMatrix.needsUpdate=true;root.rotation.y=.08+Math.sin(t*.15)*.025;
  root.userData.shape=response.shape;root.userData.lift=response.lift;
 });
 art.setContinuous(!still);addEventListener('pagehide',()=>environment.dispose(),{once:true});return {root,ready};
}
