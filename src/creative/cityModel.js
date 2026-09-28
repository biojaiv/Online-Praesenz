import * as THREE from 'three';
import { loadBlenderAsset, modelUnavailable } from './blenderAsset.js';
import { cityYears } from './cityHistory.js';
import { createCityLife } from './cityLife.js';
const asset=new URL('../../Elemente/Beispiele/PALIMPSEST_web.glb',import.meta.url).href;
/** Editable Blender model, with Cycles illumination baked into one shared atlas. */
export function createCity(art) {
 const root=new THREE.Group(),anchors=[],outlines=[],marker=new THREE.Vector3();
 let selected=1,viewBounds=null,path=[],lengths=[],stations=[],life=null;
 let progress=1,targetProgress=1,lastTime=0,lifeTime=0;
 root.name='PALIMPSEST · Blender paper city';art.scene.add(root);
 root.scale.x=1.22;
 art.camera.position.set(12,17,25);art.camera.lookAt(0,.4,1.1);
 art.setFraming((width,height,camera)=>{
  const aspect=width/height,mobile=matchMedia('(max-width:700px)').matches;
  const bounds=viewBounds||{minX:-12,maxX:12,minY:-11,maxY:11};
  const h=Math.max((bounds.maxY-bounds.minY)/1.91,(bounds.maxX-bounds.minX)/(2*aspect*(mobile?.80:.94)));
  const cx=(bounds.minX+bounds.maxX)/2-h*aspect*(mobile?0:.06),cy=(bounds.minY+bounds.maxY)/2;
  camera.left=cx-h*aspect;camera.right=cx+h*aspect;camera.top=cy+h;camera.bottom=cy-h;
 });
 function select(index){selected=index;outlines.forEach((line,i)=>{line.visible=i===index;});art.invalidate();}
 function setProgress(value,immediate=false){targetProgress=THREE.MathUtils.clamp(value,0,3);if(immediate)progress=targetProgress;art.invalidate();}
 function update(time,animate=true){
  const dt=time&&lastTime?Math.min(.07,Math.max(0,time-lastTime)):0;lastTime=time;
  if(art.motion.matches)progress=targetProgress;
  else if(dt)progress=THREE.MathUtils.lerp(progress,targetProgress,1-Math.exp(-dt*9));
  if(Math.abs(progress-targetProgress)<.0001)progress=targetProgress;
  if(path.length){
   const index=Math.min(2,Math.floor(progress)),u=progress-index;
   const distance=THREE.MathUtils.lerp(lengths[stations[index]],lengths[stations[index+1]],u);
   // Arc length sampling stays on every turn of the exported red polyline.
   let lo=0,hi=lengths.length-1;
   while(lo+1<hi){const mid=(lo+hi)>>1;if(lengths[mid]<=distance)lo=mid;else hi=mid;}
   const span=lengths[hi]-lengths[lo];marker.copy(path[lo]).lerp(path[hi],span?(distance-lengths[lo])/span:0);
   root.userData.timelineProgress=progress;root.userData.timelineTarget=targetProgress;
   root.userData.marker=marker.toArray();
  }
  if(animate&&!art.motion.matches)lifeTime+=dt;
  life?.update(lifeTime,animate&&!art.motion.matches,selected);
 }
 const ready=loadBlenderAsset(asset).then(scene=>{
  root.add(scene);root.updateMatrixWorld(true);
  art.camera.updateMatrixWorld(true);
  // Fit the actual geometry, rather than the empty corners of its world-aligned box.
  viewBounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
  const point=new THREE.Vector3(),matrix=new THREE.Matrix4();
  scene.traverse(object=>{
   if(!object.isMesh)return;matrix.multiplyMatrices(art.camera.matrixWorldInverse,object.matrixWorld);
   const positions=object.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    point.fromBufferAttribute(positions,i).applyMatrix4(matrix);
    viewBounds.minX=Math.min(viewBounds.minX,point.x);viewBounds.maxX=Math.max(viewBounds.maxX,point.x);
    viewBounds.minY=Math.min(viewBounds.minY,point.y);viewBounds.maxY=Math.max(viewBounds.maxY,point.y);
   }
  });
  art.resize();
  for(const year of cityYears){
   const node=scene.getObjectByName('anchor_'+year);
   anchors.push(root.worldToLocal(node.getWorldPosition(new THREE.Vector3())));
   outlines.push(scene.getObjectByName('highlight_'+year));
  }
  scene.traverse(object=>{
   if(!object.isMesh)return;
   object.castShadow=false;object.receiveShadow=false;
   if(object.name==='Timeline'||object.name.startsWith('highlight_')){
    object.material.dispose();object.material=new THREE.MeshBasicMaterial({color:0xe73925});
   }else {object.material.toneMapped=false;object.material.side=THREE.DoubleSide;}
  });
  const timeline=scene.getObjectByName('Timeline');
  const points=timeline.userData.pathPoints;
  if(!points?.length||timeline.userData.stationIndices?.length!==4)throw new Error('Missing Blender timeline path');
  for(let i=0;i<points.length;i+=3){path.push(new THREE.Vector3(points[i],points[i+1],points[i+2]));lengths.push(i?lengths.at(-1)+path.at(-1).distanceTo(path.at(-2)):0);}
  stations=timeline.userData.stationIndices;
  life=createCityLife(art,root,scene);
  root.userData.source='PALIMPSEST.blend';select(selected);
  // A single soft contact patch anchors the thin bottom sheet without a shadow pass.
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
  const context=canvas.getContext('2d');context.filter='blur(10px)';context.fillStyle='#66533b54';context.fillRect(20,20,216,88);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(19.1,7.3),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));
  shadow.name='Paper contact shadow';shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-3.61,8.35);root.add(shadow);
  update(0,false);art.renderer.domElement.dataset.modelReady='true';art.invalidate();
 }).catch(error=>modelUnavailable(art.renderer.domElement,error));
 return {root,anchors,marker,select,ready,setProgress,update,get travelling(){return Math.abs(progress-targetProgress)>.0001;}};
}
