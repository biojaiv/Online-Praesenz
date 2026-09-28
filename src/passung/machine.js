import * as THREE from 'three';
import {loadBlenderAsset,modelUnavailable} from '../creative/blenderAsset.js';
import {BLUEPRINT_SECTION_X,createBlueprint} from './blueprint.js';
import {createReflectiveFloor} from './reflectiveFloor.js';

const assetUrl=new URL('../../Elemente/Beispiele/PASSUNG_web.glb',import.meta.url).href;
const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const ease=t=>t*t*(3-2*t);
const screwWithdrawal=amount=>ease(clamp((amount-.70)/.30,0,1));
const AUTO_TURN_SPEED=Math.PI/90; // Clockwise relative to the viewer: one turn in three minutes.
const wrapAngle=value=>THREE.MathUtils.euclideanModulo(value+Math.PI,Math.PI*2)-Math.PI;
export function expansionAt(progress){
 const p=clamp(progress,0,3);
 if(p<1)return lerp(.70,1,ease(p));
 if(p<2)return lerp(1,.65,ease(p-1));
 return lerp(.65,0,ease(p-2));
}

function studio(renderer){
 const scene=new THREE.Scene();scene.background=new THREE.Color(.12,.135,.16);
 const geometry=new THREE.PlaneGeometry(1,1),materials=[];
 function panel(position,width,height,color){
  const material=new THREE.MeshBasicMaterial({color:new THREE.Color(...color),side:THREE.DoubleSide});materials.push(material);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.scale.set(width,height,1);mesh.lookAt(0,1,0);scene.add(mesh);
 }
 panel([-4,7,3],10,3,[3.8,3.9,4.1]);
 panel([6,3,7],2.0,9,[4.0,4.1,4.2]);
 panel([-5,1,-4],5,8,[.08,.09,.11]);
 panel([0,5,-6],8,2,[3.0,3.1,3.3]);
 panel([7,-1,-1],1.5,7,[.018,.02,.025]);
 panel([-6,2,7],5,5,[1.5,1.6,1.7]);
 // The machined front faces reflect below and behind the shallow camera.
 panel([7,-1.6,-9],5.5,9,[1.1,1.13,1.18]);
 panel([9,2,-8],1.2,8,[.03,.034,.04]);
 const generator=new THREE.PMREMGenerator(renderer),map=generator.fromScene(scene,.04,.1,100);
 generator.dispose();geometry.dispose();materials.forEach(material=>material.dispose());return map;
}

function shadowTexture(){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(128,128,5,128,128,125);
 gradient.addColorStop(0,'rgba(24,41,59,.28)');gradient.addColorStop(.35,'rgba(24,41,59,.16)');gradient.addColorStop(1,'rgba(24,41,59,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
 return new THREE.CanvasTexture(canvas);
}

export function createMachine(art,{still=false,onFrame=()=>{}}={}){
 const {scene,renderer,camera}=art;
 renderer.localClippingEnabled=true;renderer.toneMappingExposure=1.02;
 const environment=studio(renderer);scene.environment=environment.texture;
 const ambient=new THREE.HemisphereLight(0xeaf1ff,0x798796,.65);scene.add(ambient);
 const key=new THREE.DirectionalLight(0xffffff,1.8);key.position.set(-3,7,6);scene.add(key);
 const fill=new THREE.DirectionalLight(0xe8efff,.85);fill.position.set(7,3,-5);scene.add(fill);
 for(const light of [ambient,key,fill])light.layers.enable(1);
 const floor=createReflectiveFloor(scene,camera,{low:art.low});
 renderer.info.autoReset=false;
 const root=new THREE.Group();root.name='PASSUNG · Blender precision drive';scene.add(root);
 const solidClip=new THREE.Plane(new THREE.Vector3(1,0,0),0);
 const wireClip=new THREE.Plane(new THREE.Vector3(-1,0,0),0);
 const wireMaterial=new THREE.LineBasicMaterial({color:0x1354f5,transparent:true,opacity:.58,depthWrite:false,toneMapped:false,clippingPlanes:[wireClip]});
 const planeCanvas=document.createElement('canvas');planeCanvas.width=64;planeCanvas.height=1;
 const planeContext=planeCanvas.getContext('2d'),planeGradient=planeContext.createLinearGradient(0,0,64,0);
 planeGradient.addColorStop(0,'#ffffff');planeGradient.addColorStop(.35,'#b5b5b5');planeGradient.addColorStop(1,'#373737');
 planeContext.fillStyle=planeGradient;planeContext.fillRect(0,0,64,1);
 const planeMaterial=new THREE.MeshBasicMaterial({color:0x105aff,alphaMap:new THREE.CanvasTexture(planeCanvas),side:THREE.DoubleSide,forceSinglePass:true,transparent:true,opacity:.30,depthWrite:false,toneMapped:false});
 const section=new THREE.Mesh(new THREE.PlaneGeometry(4.05,4.34),planeMaterial);
 section.rotation.y=Math.PI/2;section.position.set(0,2.17,0);section.renderOrder=2;root.add(section);
 const border=new THREE.LineSegments(new THREE.EdgesGeometry(section.geometry),new THREE.LineBasicMaterial({color:0x1558ee,transparent:true,opacity:.65,depthWrite:false,toneMapped:false}));section.add(border);
 // Subtle grid and contact shadows sit on the polished, reflective floor.
 const grid=new THREE.GridHelper(18,36,0xb8c7d6,0xd8e0e7);grid.position.set(.8,.01,0);
 grid.material.transparent=true;grid.material.opacity=.10;grid.material.depthWrite=false;scene.add(grid);
 const texture=shadowTexture(),shadowMaterial=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false});
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(6.5,6),shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.set(-.25,.015,0);scene.add(shadow);
 const footGeometry=new THREE.PlaneGeometry(3.5,1.1),footMaterial=shadowMaterial.clone();footMaterial.opacity=.7;
 for(const z of [-1.52,1.52]){const foot=new THREE.Mesh(footGeometry,footMaterial);foot.rotation.x=-Math.PI/2;foot.position.set(-.5,.023,z);scene.add(foot);}
 const floatingShadow=new THREE.Mesh(new THREE.PlaneGeometry(4,4),shadowMaterial.clone());floatingShadow.rotation.x=-Math.PI/2;floatingShadow.position.set(3,.02,0);floatingShadow.material.opacity=.32;scene.add(floatingShadow);
 let model=null,parts=[],pickMeshes=[],wires=[],cad=null,target=0,current=0,last=null,quiet=art.motion.matches,ready=false,disposed=false,angle=0;
 const rotationPauses=new Set(['hidden']);
 const autoRotating=()=>ready&&!still&&rotationPauses.size===0;
 function syncMotion(){art.setContinuous(autoRotating()||(!quiet&&!still&&Math.abs(target-current)>.001));}
 function setRotationPaused(reason,value){
  const before=rotationPauses.has(reason);
  if(value)rotationPauses.add(reason);else rotationPauses.delete(reason);
  if(before===Boolean(value))return;
  last=null;syncMotion();art.invalidate();
 }
 const targetPoint=new THREE.Vector3(1.0,2.12,0);
 const orbitOffset=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
 const annotationPoints=[],framingBounds=[],viewMatrix=new THREE.Matrix4(),boundPoint=new THREE.Vector3();
 function cacheBounds(object,meshesOnly){
  const box=new THREE.Box3(),inverse=new THREE.Matrix4().copy(object.matrixWorld).invert();
  object.traverse(child=>{
   if(!child.geometry||(meshesOnly&&!child.isMesh))return;
   child.geometry.computeBoundingBox();
   box.union(child.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,child.matrixWorld)));
  });
  if(box.isEmpty())return;
  const corners=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z));
  framingBounds.push({object,corners});
 }
 let halfWidth=0,halfHeight=0,frameInset=0,canvasHeight=600;
 function frameAssembly(blueprint,withdrawal){
  if(!halfWidth)return;
  // Orbit around the vertical axis. The assembly, clipping plane and ground
  // stay in one coordinate system, including the blue construction drawing.
  orbitOffset.set(8.5,3.68,16).applyAxisAngle(up,angle);
  camera.position.copy(targetPoint).add(orbitOffset);camera.lookAt(targetPoint);camera.updateMatrixWorld();
  // Reserve room for the two annotation rows only near full separation.
  const annotationReveal=still?0:ease(clamp((expansionAt(current)-.94)/.055,0,1));
  const annotationScale=lerp(1,Math.max(1.16,canvasHeight/Math.max(120,canvasHeight-100)),annotationReveal);
  const width=(halfWidth+.50*withdrawal)*annotationScale;
  const centre=.62*withdrawal-frameInset*blueprint;
  const height=halfHeight*width/halfWidth;
  let left=-width+centre,right=width+centre,top=height,bottom=-height;
  if(Math.abs(angle)>.00001){
   // Eight cached corners per group keep the rotated screws and CAD in view;
   // no vertex traversal or new geometry is needed during a drag.
   for(const {object,corners} of framingBounds){
    if(object===cad?.group&&blueprint<=.005)continue;
    viewMatrix.multiplyMatrices(camera.matrixWorldInverse,object.matrixWorld);
    for(const corner of corners){
     boundPoint.copy(corner).applyMatrix4(viewMatrix);
     left=Math.min(left,boundPoint.x-.18);right=Math.max(right,boundPoint.x+.18);
     bottom=Math.min(bottom,boundPoint.y-.18);top=Math.max(top,boundPoint.y+.18);
    }
   }
   const aspect=halfWidth/halfHeight,cx=(left+right)/2,cy=(top+bottom)/2;
   const w=Math.max(right-left,(top-bottom)*aspect)/2,h=w/aspect;
   left=cx-w;right=cx+w;top=cy+h;bottom=cy-h;
  }
  if(camera.left!==left||camera.right!==right||camera.top!==top||camera.bottom!==bottom){
   camera.left=left;camera.right=right;camera.top=top;camera.bottom=bottom;
   camera.updateProjectionMatrix();
  }
 }
 art.setFraming((width,height,cam)=>{
  canvasHeight=height;
  const aspect=width/height;
  const h=Math.max(2.76,4.10/aspect);
  // Give the longer drawing a gutter, then return that space to the moving parts.
  halfWidth=h*aspect;halfHeight=h;
  frameInset=matchMedia('(max-width:760px)').matches ? .36 : matchMedia('(max-width:1100px)').matches ? .24 : 0;
  frameAssembly(clamp(1-current,0,1),screwWithdrawal(expansionAt(current)));
  cam.near=.1;cam.far=90;
 });

 function pose(){
  if(!ready)return;
  const amount=expansionAt(current);
  // The cover carries its screws first; their shafts withdraw in the final
  // part of the exploded movement and return to the same bores on assembly.
  const withdrawal=screwWithdrawal(amount);
  for(const part of parts){
   part.position.x=part.userData.assembledX+part.userData.explodeX*amount+(part.userData.withdrawX||0)*withdrawal;
  }
  root.updateMatrixWorld(true);
  // A deeper blue section follows the concept; both representations still
  // meet on the same plane throughout the scroll transition.
  const cut=lerp(BLUEPRINT_SECTION_X,-2.95,ease(Math.min(current,1)));
  solidClip.constant=-cut;wireClip.constant=cut;section.position.x=cut;
  const blueprint=clamp(1-current,0,1);
  frameAssembly(blueprint,withdrawal);
  wireMaterial.opacity=.58*blueprint;
  wires.forEach(wire=>wire.visible=blueprint>.005&&(!Number.isFinite(wire.userData.minX)||wire.userData.minX+wire.parent.position.x<cut));
  cad?.setState(cut,blueprint);
  section.visible=blueprint>.005;planeMaterial.opacity=.30*blueprint;border.material.opacity=.65*blueprint;
  floatingShadow.position.x=1.8+amount*2;floatingShadow.material.opacity=.16+amount*.13;
  root.updateMatrixWorld(true);
  renderer.domElement.dataset.progress=current.toFixed(3);
  renderer.domElement.dataset.expansion=amount.toFixed(3);
  renderer.domElement.dataset.angle=angle.toFixed(4);
  renderer.domElement.dataset.autoRotating=String(autoRotating());
  onFrame(current);
 }
 art.setUpdate(time=>{
  renderer.info.reset();
  const elapsed=last===null?0:clamp(time-last,0,.5),dt=Math.min(elapsed,.06);last=time;
  const moving=Math.abs(target-current)>.001;
  current=quiet||still||!moving?target:lerp(current,target,1-Math.exp(-dt*13));
  if(autoRotating())angle=wrapAngle(angle+AUTO_TURN_SPEED*elapsed);
  pose();syncMotion();
 });
 function setProgress(value,instant=false){
  target=clamp(value,0,3);
  if(instant||quiet||still)current=target;
  syncMotion();art.invalidate();
 }
 function setQuiet(value){quiet=Boolean(value);current=target;last=null;syncMotion();art.invalidate();}
 function setAngle(value){
  if(!ready||still||!Number.isFinite(value))return;
  angle=wrapAngle(value);
  art.invalidate();
 }
 const loaded=loadBlenderAsset(assetUrl).then(asset=>{
  if(disposed)return;
  model=asset;model.name='PASSUNG.blend';model.userData.source='PASSUNG.blend';root.add(model);
  let guidePaths=[],draft=null;
  model.traverse(object=>{
   if(object.userData.part){object.userData.assembledX=object.position.x;parts.push(object);}
   if(object.userData.blueprintPaths)guidePaths=JSON.parse(object.userData.blueprintPaths);
   if(object.userData.blueprintDraft)draft=JSON.parse(object.userData.blueprintDraft);
   if(object.isMesh){
    const materials=Array.isArray(object.material)?object.material:[object.material];
    materials.forEach(material=>{material.clippingPlanes=[solidClip];material.envMapIntensity=.80;material.needsUpdate=true;});
   }
  });
  model.updateMatrixWorld(true);
  if(draft){cad=createBlueprint(draft,wireClip,{low:art.low});root.add(cad.group);}
  // Merge material edges within each moving group: one line draw per part.
  for(const part of parts){
   if(draft&&part.userData.part==='housing')continue;
   const positions=[],inverse=new THREE.Matrix4().copy(part.matrixWorld).invert();
   part.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const geometry=new THREE.EdgesGeometry(mesh.geometry,26);
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
    for(const value of geometry.attributes.position.array)positions.push(value);
    geometry.dispose();
   });
   if(cad){
    const initialX=part.userData.assembledX+part.userData.explodeX*expansionAt(0);
    for(let i=0;i<positions.length;i+=3)positions[i]=cad.extendX(positions[i]+initialX)-initialX;
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   geometry.computeBoundingBox();
   const wire=new THREE.LineSegments(geometry,wireMaterial);wire.renderOrder=1;wire.userData.minX=geometry.boundingBox.min.x;part.add(wire);wires.push(wire);
  }
  if(!cad&&guidePaths.length){
   const guides=[];
   for(const path of guidePaths)for(let i=1;i<path.length;i++)for(const [x,y,z] of [path[i-1],path[i]])guides.push(x,z,-y);
   const guideGeometry=new THREE.BufferGeometry();guideGeometry.setAttribute('position',new THREE.Float32BufferAttribute(guides,3));
   const guide=new THREE.LineSegments(guideGeometry,wireMaterial);root.add(guide);wires.push(guide);
  }
  root.updateMatrixWorld(true);
  parts.forEach(part=>{
   cacheBounds(part,true);
   const points=[],inverse=new THREE.Matrix4().copy(part.matrixWorld).invert();
   part.traverse(child=>{
    if(!child.isMesh)return;
    pickMeshes.push(child);
    const position=child.geometry.attributes.position;
    const matrix=new THREE.Matrix4().multiplyMatrices(inverse,child.matrixWorld);
    for(let i=0;i<position.count;i+=Math.max(1,Math.floor(position.count/48)))points.push(new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(matrix));
   });
   annotationPoints.push({part,points});
  });
  if(cad)cacheBounds(cad.group,false);
  root.traverse(object=>object.layers.enable(1));
  ready=true;renderer.domElement.dataset.modelReady='true';pose();art.resize();art.invalidate();
 }).catch(error=>modelUnavailable(renderer.domElement,error));
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function pickPart(x,y){
  if(!ready)return null;
  pointer.set(x*2-1,1-y*2);raycaster.setFromCamera(pointer,camera);
  // Only real solid surfaces are selectable: no reflection or clipped rear faces.
  for(const hit of raycaster.intersectObjects(pickMeshes,false)){
   if(!hit.object.isMesh||solidClip.distanceToPoint(hit.point)<0)continue;
   let part=hit.object;
   while(part&&!part.userData.part)part=part.parent;
   if(part)return part.userData.part;
  }
  return null;
 }
 const annotationPoint=new THREE.Vector3();
 function annotationAnchors(topIds){
  return annotationPoints.map(({part,points})=>{
   const top=topIds.has(part.userData.part);let x=0,y=top?Infinity:-Infinity;
   for(const p of points){
    annotationPoint.copy(p).applyMatrix4(part.matrixWorld).project(camera);
    const py=(1-annotationPoint.y)/2;
    if(top?py<y:py>y){x=(annotationPoint.x+1)/2;y=py;}
   }
   return {id:part.userData.part,x,y};
  });
 }
 const point=new THREE.Vector3();
 function hotspot(){
  point.set(.74,.54,1.48).applyMatrix4(root.matrixWorld).project(camera);
  return {x:(point.x+1)/2,y:(1-point.y)/2,visible:camera.position.z>0&&Math.abs(point.x)<.96&&Math.abs(point.y)<.96};
 }
 function dispose(){disposed=true;environment.dispose();floor.dispose();}
 addEventListener('pagehide',dispose,{once:true});
 if(import.meta.env.DEV)window.__passungMachine={get parts(){return parts;},get current(){return current;},get target(){return target;},get angle(){return angle;},get ready(){return ready;},expansionAt,pickPart,setRotationPaused};
 return {ready:loaded,setProgress,setQuiet,setAngle,setRotationPaused,pickPart,annotationAnchors,get expansion(){return expansionAt(current);},hotspot,get angle(){return angle;},get loaded(){return ready;}};
}
