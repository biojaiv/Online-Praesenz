import * as THREE from 'three';

// The concept gives the blue construction more axial space than the metal.
// Keep the front section anchored while extending the rear by a modest amount.
export const BLUEPRINT_SECTION_X=.12;
const REAR_EXTENSION=.55;

/** Spatial drafting built from the Blender housing profile and drilling data.
 * Coordinates in the authoring data are Blender's X (shaft), Y and Z (up).
 * Every path is actual 3D geometry and shares the metal's clipping plane.
 */
export function createBlueprint(draft, clippingPlane, {low=false}={}){
 const group=new THREE.Group();group.name='PASSUNG · CAD sections';
 const {outline,bore,holes,axis}=draft;
 const extendX=x=>x-REAR_EXTENSION*THREE.MathUtils.clamp((BLUEPRINT_SECTION_X-x)/(BLUEPRINT_SECTION_X-draft.layers[1][0]),0,1);
 const layers=draft.layers.map(([x,scale])=>[extendX(x),scale]);
 // Extend the straight foot span, keeping its end radii and drilled holes round.
 const feet={...draft.feet,rear:draft.feet.rear-REAR_EXTENSION};
 const rear=layers[0][0],front=layers.at(-1)[0];
 const stations=Array.from({length:8},(_,i)=>THREE.MathUtils.lerp(rear,BLUEPRINT_SECTION_X+.10,i/7));
 const buffers={contours:[],channels:[],hidden:[],construction:[]};
 const materials=[];
 const blue=new THREE.Color(0x1046d9),distant=new THREE.Color(0x5c8be6),color=new THREE.Color();
 // Keep authoring coordinates until the buffer boundary: glTF's Y is up.
 const world=([x,y,z])=>[x,z,-y];
 function segment(kind,a,b){buffers[kind].push(...world(a),...world(b));}
 function path(kind,points,closed=false){
  for(let i=1;i<points.length;i++)segment(kind,points[i-1],points[i]);
  if(closed)segment(kind,points.at(-1),points[0]);
 }
 function scaleAt(x){
  for(let i=1;i<layers.length;i++)if(x<=layers[i][0]){
   const [a,s]=layers[i-1],[b,t]=layers[i];
   return THREE.MathUtils.lerp(s,t,THREE.MathUtils.clamp((x-a)/(b-a),0,1));
  }
  return layers.at(-1)[1];
 }
 function section(x){const s=scaleAt(x);return outline.map(([y,z])=>[x,y*s,axis+(z-axis)*s]);}
 function circle(kind,x,y,z,r,steps=low?32:56){
  path(kind,Array.from({length:steps},(_,i)=>{const a=i*Math.PI*2/steps;return [x,y+Math.cos(a)*r,z+Math.sin(a)*r];}),true);
 }
 function tick(kind,x,y,z){segment(kind,[x,y-.055,z-.045],[x,y+.055,z+.045]);}

 // Several cross sections reveal the full length of the housing walls.
 for(const [i,x] of stations.entries()){
  path(i===0||i===stations.length-2?'contours':'channels',section(x),true);
  circle('channels',x,0,axis,bore);
 }
 for(let i=0;i<outline.length;i+=low?8:4){
  const [y,z]=outline[i];
  path(y<0?'channels':'hidden',layers.map(([x,s])=>[x,y*s,axis+(z-axis)*s]));
 }
 // Drilled channels connect matching circles on successive sections.
 for(const [y,z,r] of holes){
  const kind=y<0?'channels':'hidden';
  for(const x of [rear,stations[2],stations[4],stations[6]])circle(kind,x,y,z,r,low?20:32);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   segment(kind,[rear,y+Math.cos(a)*r,z+Math.sin(a)*r],[front,y+Math.cos(a)*r,z+Math.sin(a)*r]);
  }
  segment('construction',[rear-.02,y-r*1.9,z],[rear-.02,y+r*1.9,z]);
  segment('construction',[rear-.02,y,z-r*1.9],[rear-.02,y,z+r*1.9]);
 }
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,y=Math.cos(a)*bore,z=axis+Math.sin(a)*bore;
  segment(i<6?'hidden':'channels',[rear,y,z],[front,y,z]);
 }

 // Feet and their vertical counterbores use the Blender construction values.
 for(const y of feet.centres){
  const rim=[];
  for(let i=0;i<=24;i++){const a=-Math.PI/2+i*Math.PI/24;rim.push([feet.front+feet.radius*Math.cos(a),y+feet.radius*Math.sin(a)]);}
  for(let i=0;i<=24;i++){const a=Math.PI/2+i*Math.PI/24;rim.push([feet.rear+feet.radius*Math.cos(a),y+feet.radius*Math.sin(a)]);}
  for(const z of [feet.bottom,feet.top])path('contours',rim.map(([x,py])=>[x,py,z]),true);
  for(let i=0;i<rim.length;i+=8){const [x,py]=rim[i];segment('channels',[x,py,feet.bottom],[x,py,feet.top]);}
  for(const [z,r] of [[feet.bottom,feet.bore],[feet.top-.13,feet.bore],[feet.top,feet.counterbore]]){
   path('channels',Array.from({length:32},(_,i)=>{const a=i*Math.PI/16;return [feet.rear+Math.cos(a)*r,y+Math.sin(a)*r,z];}),true);
  }
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])segment('hidden',
   [feet.rear+Math.cos(a)*feet.bore,y+Math.sin(a)*feet.bore,feet.bottom],
   [feet.rear+Math.cos(a)*feet.bore,y+Math.sin(a)*feet.bore,feet.top]);
 }

 // A faint three-dimensional construction cage extends behind the object.
 // No invented dimensions: these are extents, centre lines and section ticks.
 const back=rear-.30,sides=[-1.96,1.96],heights=[.045,4.10];
 for(const x of [back,BLUEPRINT_SECTION_X]){
  path('construction',[[x,sides[0],heights[0]],[x,sides[1],heights[0]],[x,sides[1],heights[1]],[x,sides[0],heights[1]]],true);
 }
 for(const y of sides)for(const z of heights)segment('construction',[back,y,z],[front,y,z]);
 for(let z=.5;z<4.1;z+=.5)segment('construction',[back,sides[0],z],[back,sides[1],z]);
 for(let y=-1.5;y<1.9;y+=.5)segment('construction',[back,y,heights[0]],[back,y,heights[1]]);
 for(let x=back-.13;x<BLUEPRINT_SECTION_X;x+=.26){
  segment('construction',[x,-2.12,.018],[x,2.12,.018]);
  segment('construction',[x,sides[0],4.10],[x,sides[1],4.10]);
 }
 for(let y=-2.0;y<=2.01;y+=.4)segment('construction',[back-.19,y,.018],[front,y,.018]);
 segment('hidden',[back-.21,0,axis],[front,0,axis]);
 segment('hidden',[back,-2.10,axis],[back,2.10,axis]);
 segment('hidden',[back,0,.0],[back,0,4.2]);
 const dimensionX=back-.105,dimensionY=-2.08;
 segment('channels',[dimensionX,dimensionY,.045],[dimensionX,dimensionY,4.10]);
 for(const z of [.045,axis,4.10]){
  segment('construction',[rear,-1.5,z],[dimensionX,dimensionY-.09,z]);
  tick('channels',dimensionX,dimensionY,z);
 }

 function lineObject(name,positions,opacity,dashed=false){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const colors=[];
  for(let i=0;i<positions.length;i+=3){
   const depth=THREE.MathUtils.clamp((positions[i]-back)/(BLUEPRINT_SECTION_X-back),0,1);
   const facing=THREE.MathUtils.clamp((positions[i+2]+1.9)/3.8,0,1);
   color.copy(distant).lerp(blue,.28+depth*.47+facing*.18);colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const options={color:0xffffff,vertexColors:true,transparent:true,opacity,depthWrite:false,toneMapped:false,clippingPlanes:[clippingPlane]};
  const material=dashed?new THREE.LineDashedMaterial({...options,dashSize:.055,gapSize:.038}):new THREE.LineBasicMaterial(options);
  materials.push({material,opacity});
  const object=new THREE.LineSegments(geometry,material);object.name=name;object.renderOrder=1;
  if(dashed)object.computeLineDistances();group.add(object);return object;
 }
 lineObject('CAD · housing contours',buffers.contours,.94);
 lineObject('CAD · bore walls and intermediate sections',buffers.channels,.64);
 lineObject('CAD · hidden lines and axes',buffers.hidden,.35,true);
 lineObject('CAD · depth grid and extension lines',buffers.construction,.22);

 // Lightweight translucent wall strips give the wire drawing physical volume.
 // They are generated from the exact profile, with no copy of the heavy meshes.
 const skin=[],skinColors=[],shellBlue=new THREE.Color(0x336df1);
 function triangle(a,b,c){
  for(const point of [a,b,c]){
   skin.push(...world(point));
   const weight=point[1]<0?.78:1.0;
   skinColors.push(shellBlue.r*weight,shellBlue.g*weight,shellBlue.b*weight);
  }
 }
 for(let j=1;j<layers.length;j++){
  const a=section(layers[j-1][0]),b=section(layers[j][0]);
  for(let i=0;i<outline.length;i+=low?4:2){
   const k=(i+(low?4:2))%outline.length;
   triangle(a[i],a[k],b[k]);triangle(a[i],b[k],b[i]);
  }
 }
 const shellGeometry=new THREE.BufferGeometry();
 shellGeometry.setAttribute('position',new THREE.Float32BufferAttribute(skin,3));shellGeometry.setAttribute('color',new THREE.Float32BufferAttribute(skinColors,3));
 const shellMaterial=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.06,side:THREE.DoubleSide,forceSinglePass:true,depthWrite:false,toneMapped:false,clippingPlanes:[clippingPlane]});
 materials.push({material:shellMaterial,opacity:low?.038:.06});
 const shell=new THREE.Mesh(shellGeometry,shellMaterial);shell.name='CAD · translucent housing depth';group.add(shell);

 // The moving section outline stays attached to the actual metal cut.
 const cutGeometry=new THREE.BufferGeometry().setFromPoints(outline.map(([y,z])=>new THREE.Vector3(0,z-axis,-y)));
 const cutMaterial=new THREE.LineBasicMaterial({color:0x104aed,transparent:true,opacity:.92,depthWrite:false,toneMapped:false});
 materials.push({material:cutMaterial,opacity:.92});
 const cutLine=new THREE.LineLoop(cutGeometry,cutMaterial);cutLine.name='CAD · current section contour';cutLine.renderOrder=1;group.add(cutLine);
 group.userData.stations=stations;group.userData.source='PASSUNG.blend';
 return {group,extendX,setState(cut,opacity){
  group.visible=opacity>.005;
  for(const entry of materials)entry.material.opacity=entry.opacity*opacity;
  const scale=scaleAt(cut);cutLine.position.set(cut-.003,axis,0);cutLine.scale.set(1,scale,scale);
  cutLine.visible=cut>=rear&&cut<=front;
 }};
}
