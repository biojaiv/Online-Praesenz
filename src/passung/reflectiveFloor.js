import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

/** A softly fading planar reflection; only the assembly uses reflection layer 1. */
export function createReflectiveFloor(scene,camera,{low=false}={}){
 const size=low?320:512;
 const floor=new Reflector(new THREE.PlaneGeometry(24,24),{
  textureWidth:size,textureHeight:size,multisample:0,clipBias:.001,
  color:0xe1e9f2,
  shader:{
   name:'PASSUNG polished floor',
   uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},texel:{value:new THREE.Vector2(1/size,1/size)}},
   vertexShader:`
    uniform mat4 textureMatrix;
    varying vec4 vReflection;
    varying vec3 vGround;
    varying vec4 vScreen;
    void main(){
     vReflection=textureMatrix*vec4(position,1.0);
     vGround=(modelMatrix*vec4(position,1.0)).xyz;
     gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
     vScreen=gl_Position;
    }`,
   fragmentShader:`
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform vec2 texel;
    varying vec4 vReflection;
    varying vec3 vGround;
    varying vec4 vScreen;
    void main(){
     vec2 uv=vReflection.xy/vReflection.w;
     vec2 blur=texel*1.25;
     vec4 reflected=texture2D(tDiffuse,uv)*0.4;
     reflected+=texture2D(tDiffuse,uv+vec2(blur.x,0.0))*0.15;
     reflected+=texture2D(tDiffuse,uv-vec2(blur.x,0.0))*0.15;
     reflected+=texture2D(tDiffuse,uv+vec2(0.0,blur.y))*0.15;
     reflected+=texture2D(tDiffuse,uv-vec2(0.0,blur.y))*0.15;
     float distanceToPart=length((vGround.xz-vec2(1.0,0.0))*vec2(0.72,1.0));
     float edge=1.0-smoothstep(5.0,10.0,distanceToPart);
     float polish=1.0-smoothstep(1.3,7.5,distanceToPart);
     float reflectionAlpha=reflected.a*0.34*polish;
     float surfaceAlpha=0.045*edge*(1.0-reflectionAlpha);
     float alpha=reflectionAlpha+surfaceAlpha;
     float frameFade=smoothstep(0.0,0.16,vScreen.y/vScreen.w*0.5+0.5);
     vec3 reflectedColor=reflected.rgb/max(reflected.a,0.0001);
     gl_FragColor=vec4((reflectedColor*reflectionAlpha+color*surfaceAlpha)/max(alpha,0.0001),alpha*frameFade);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`
  }
 });
 floor.name='PASSUNG · reflective floor';floor.rotation.x=-Math.PI/2;floor.position.set(1,.035,0);
 floor.material.transparent=true;floor.material.depthWrite=false;floor.renderOrder=-1;
 // Exclude the floor, grid and contact shadows from the reflected scene.
 floor.getReflectionCamera(camera).layers.set(1);
 scene.add(floor);
 return floor;
}
