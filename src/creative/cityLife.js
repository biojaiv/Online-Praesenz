import * as THREE from 'three';

/** Each paper layer has its own clock. Only the selected era advances. */
export function createCityLife(art, root, scene) {
 const tram=scene.getObjectByName('Tram_1911_1964'),figure=scene.getObjectByName('Walking_figure');
 let metadata;scene.traverse(object=>{if(object.userData.doorways)metadata=object.userData;});
 if(!metadata?.smokeEmitters)throw new Error('Missing authored city entrances / smoke emitters');
 const unpack=(flat,stride)=>Array.from({length:flat.length/stride},(_,i)=>flat.slice(i*stride,(i+1)*stride));
 const doors=unpack(metadata.doorways,5),emitters=unpack(metadata.smokeEmitters,5);
 const levels=[[3.635,-6.5,4.4,10.5],[1.285,-2.05,4.5,12.8],[-1.065,2.85,5.3,15],[-3.415,8.35,5.7,17.4]];
 const clocks=[0,0,0,0];let lastTime=0,previousEra=-1;
 const ink=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
 tram.material.dispose();tram.material=ink;
 const walkMaterial=ink.clone(),figureGeometry=figure.geometry.clone();
 const perEra=art.low?4:7,phases=new Float32Array(perEra*4);
 figureGeometry.setAttribute('walkingPhase',new THREE.InstancedBufferAttribute(phases,1).setUsage(THREE.DynamicDrawUsage));
 walkMaterial.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float walkingPhase;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float leg=1.0-smoothstep(0.02,0.115,position.y); float stepWave=sin(walkingPhase+sign(position.x)*1.5708); transformed.z+=stepWave*leg*0.052; transformed.y+=max(0.0,stepWave)*leg*0.014;');
 };
 walkMaterial.customProgramCacheKey=()=> 'city-walking-legs-v1';
 const walkers=new THREE.InstancedMesh(figureGeometry,walkMaterial,perEra*4);
 walkers.name='Walking residents';walkers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);walkers.frustumCulled=false;
 const figureScale=figure.scale.clone().multiplyScalar(1.2),figureRotation=figure.quaternion.clone();
 figure.material.dispose();figure.removeFromParent();figure.geometry.dispose();root.add(walkers);
 const routes=levels.flatMap(([y,z,depth],era)=>{
  const all=doors.filter(d=>Math.round(d[3])===era),front=all.filter(d=>d[2]>=z);
  const pool=front.length?front:all;
  if(!pool.length)throw new Error('Missing entrance for era '+era);
  return Array.from({length:perEra},(_,i)=>{
   const [x,base,zz,,width]=pool[i%pool.length],direction=x<0?1:-1;
   const room=Math.max(.15,Math.min(.40,z+depth*.5-.12-zz));
   const spread=Math.min(1.06,width*.45)*(i%2?.8:1);
   const points=[
    new THREE.Vector3(x,base,zz-.17),
    new THREE.Vector3(x,base,zz+.14),
    new THREE.Vector3(x+direction*spread*.4,base,zz+room*.8),
    new THREE.Vector3(x+direction*spread,base,zz+room)
   ];
   return {era,curve:new THREE.CatmullRomCurve3(points,false,'centripetal'),offset:i*2.49,duration:i%4===0?8.5:13+i*.6,running:i%4===0};
  });
 });
 const tramStart=tram.position.clone(),dummy=new THREE.Object3D(),point=new THREE.Vector3(),tangent=new THREE.Vector3();
 function residents(era){
  for(let i=era*perEra;i<(era+1)*perEra;i++){
   const route=routes[i],clock=clocks[era],phase=((clock+route.offset)/route.duration)%1;
   let progress=0,direction=1,moving=false;
   if(phase>.10&&phase<.46){progress=(phase-.10)/.36;moving=true;}
   else if(phase>=.46&&phase<.56)progress=1;
   else if(phase>=.56&&phase<.92){progress=1-(phase-.56)/.36;direction=-1;moving=true;}
   progress=.5-.5*Math.cos(progress*Math.PI);
   route.curve.getPointAt(progress,point);route.curve.getTangentAt(progress,tangent).multiplyScalar(direction);
   dummy.position.copy(point);dummy.position.y+=moving?Math.abs(Math.sin(clock*(route.running?12:8)+i))*.016:0;
   dummy.quaternion.copy(figureRotation);dummy.rotateY(Math.atan2(tangent.x,tangent.z));
   dummy.scale.copy(figureScale).multiplyScalar(.91+(i%4)*.045);dummy.updateMatrix();walkers.setMatrixAt(i,dummy.matrix);
   phases[i]=moving?clock*(route.running?12:8)+i:0;
  }
  walkers.instanceMatrix.needsUpdate=true;figureGeometry.attributes.walkingPhase.needsUpdate=true;
 }
 for(let era=0;era<4;era++)residents(era);
 // A few tiny, truly three-dimensional bird silhouettes, in one instanced draw.
 const birdGeometry=new THREE.BufferGeometry();
 birdGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
  0,0,-.16, -.036,0,.045, .036,0,.045,
  -.02,0,-.045, -.27,.01,-.005, -.19,0,.085,
  -.02,0,-.045, -.19,0,.085, 0,0,.04,
  .02,0,-.045, .27,.01,-.005, .19,0,.085,
  .02,0,-.045, .19,0,.085, 0,0,.04,
  0,0,.04, -.045,0,.13, .045,0,.13
 ],3));
 const birdCount=art.low?3:5,birdTime={value:0};
 birdGeometry.setAttribute('birdPhase',new THREE.InstancedBufferAttribute(Float32Array.from({length:birdCount},(_,i)=>i*1.7),1));
 const birdMaterial=new THREE.MeshBasicMaterial({color:0x555149,side:THREE.DoubleSide,toneMapped:false});
 birdMaterial.onBeforeCompile=shader=>{
  shader.uniforms.birdTime=birdTime;shader.vertexShader='uniform float birdTime; attribute float birdPhase;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y+=abs(position.x)*sin(birdTime*7.2+birdPhase)*0.72;');
 };
 birdMaterial.customProgramCacheKey=()=> 'city-bird-flight-v1';
 const birds=new THREE.InstancedMesh(birdGeometry,birdMaterial,birdCount);
 birds.name='Birds of the active era';birds.frustumCulled=false;birds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(birds);
 const perEmitter=art.low?6:10,count=emitters.length*perEmitter;
 const positions=new Float32Array(count*3),sizes=new Float32Array(count),alphas=new Float32Array(count);
 const geometry=new THREE.BufferGeometry();
 for(const [name,array,size] of [['position',positions,3],['size',sizes,1],['alpha',alphas,1]])geometry.setAttribute(name,new THREE.BufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));
 const material=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,toneMapped:false,uniforms:{uScale:{value:30}},
  vertexShader:`attribute float size; attribute float alpha; uniform float uScale; varying float vAlpha;
   void main(){ vAlpha=alpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_PointSize=size*uScale; }`,
  fragmentShader:`varying float vAlpha;
   void main(){ vec2 p=gl_PointCoord*2.0-1.0; float r=dot(p,p); if(r>1.0)discard;
    float edge=exp(-r*3.5)*(1.0-smoothstep(.65,1.0,r));
    gl_FragColor=vec4(vec3(.40,.38,.34),edge*vAlpha); }`
 });
 const smoke=new THREE.Points(geometry,material);smoke.name='Chimney smoke';smoke.frustumCulled=false;root.add(smoke);
 const bufferSize=new THREE.Vector2();
 function update(time,animated,era=1){
  const dt=lastTime?Math.min(.08,Math.max(0,time-lastTime)):0;lastTime=time;
  if(animated)clocks[era]+=dt;
  if(animated||era!==previousEra)residents(era);
  // Other epochs retain exactly their last pose and phase.
  if(era===1)tram.position.z=tramStart.z+Math.sin(clocks[1]*.29)*1.46;
  birds.visible=animated;smoke.visible=animated&&emitters.some(e=>Math.round(e[3])===era);
  birds.userData.era=era;smoke.userData.era=era;
  root.userData.activeEra=era;root.userData.eraClocks=[...clocks];
  previousEra=era;
  if(!animated)return;
  const clock=clocks[era],[y,z,depth,width]=levels[era];birdTime.value=clock;
  for(let i=0;i<birdCount;i++){
   const a=clock*(.24+i*.015)+i*1.76,rx=width*(.14+i*.011),rz=depth*(.25+i*.02);
   dummy.position.set(Math.cos(a)*rx,y+[2.4,3.0,3.0,1.6][era]+Math.sin(a*1.3+i)*.17,z+Math.sin(a)*rz);
   dummy.rotation.set(.04,Math.atan2(Math.sin(a)*rx,-Math.cos(a)*rz),Math.sin(a)*.16);
   dummy.scale.setScalar(.64+(i%3)*.12);dummy.updateMatrix();birds.setMatrixAt(i,dummy.matrix);
  }
  birds.instanceMatrix.needsUpdate=true;
  art.renderer.getDrawingBufferSize(bufferSize);material.uniforms.uScale.value=bufferSize.y/(art.camera.top-art.camera.bottom);
  for(let e=0;e<emitters.length;e++){
   const [x,y,z,layer,strength]=emitters[e],active=Math.round(layer)===era;
   for(let k=0;k<perEmitter;k++){
    const i=e*perEmitter+k;
    if(!active){alphas[i]=0;continue;}
    const age=(clock*(.17+.01*(e%3))+k/perEmitter)%1,drift=Math.sin(age*5+e);
    positions[i*3]=x+age*(.7+strength*.4)+drift*.12*age;
    positions[i*3+1]=y+age*(.8+strength*1.5);
    positions[i*3+2]=z+Math.sin(age*4+e)*age*.19;
    sizes[i]=.14+age*(.44+strength*.68);alphas[i]=Math.sin(age*Math.PI)*(.28+strength*.31);
   }
  }
  for(const key of ['position','size','alpha'])geometry.attributes[key].needsUpdate=true;
 }
 return {update};
}
