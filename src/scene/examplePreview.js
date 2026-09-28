import * as THREE from 'three';
import { t, getLanguage, onLanguageChange } from '../i18n.js';
import { projectsIn } from '../data/projects.js';
import { GALLERY, galleryY } from '../data/projectGalleryLayout.js';
import { HOLOGRAM_HEIGHT, HOLOGRAM_LIFT, HOLOGRAM_FRONT } from './projectionLayout.js';
import { LIGHT_PALETTE } from './palette.js';

/** The same two opaque textures remain on screen before and after activation. */
export function createExamplePreview({ reduced = false } = {}) {
 const group=new THREE.Group();group.name='project-book';
 const height=HOLOGRAM_HEIGHT,width=height*800/1428,meshes=[],wings=[];
 let open=false,amount=0,reveal=1,target=1,disposed=false;
 for(const [i,category] of ['webseiten','systemintegration'].entries()){
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=1428;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:true,toneMapped:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
  mesh.name=i?'example-preview-systemintegration':'example-preview';mesh.userData.key='projekte';mesh.userData.section=category;
  const pivot=new THREE.Group();pivot.position.x=i?.065:-.065;mesh.position.x=(i?1:-1)*width/2;pivot.add(mesh);group.add(pivot);meshes.push(mesh);
  const pictures=projectsIn(category).map(()=>new Image()),picture=pictures[0],accent=i?'#83d5e5':'#efb46c';
  function paragraph(text,y){
   const words=text.split(/\s+/);let line='';
   for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>704&&line){ctx.fillText(line,48,y);y+=49;line=word;}else line=next;}
   if(line)ctx.fillText(line,48,y);
  }
  function draw(){
   if(disposed)return;
   ctx.fillStyle=LIGHT_PALETTE.deep;ctx.fillRect(0,0,800,1428);
   ctx.textAlign='left';ctx.fillStyle=accent;ctx.font='500 27px "Barlow Condensed",sans-serif';ctx.fillText(`VL // 02 · ${i?'B':'A'}`,48,70);
   ctx.textAlign='center';ctx.fillStyle='#e2edf6';ctx.font='600 64px "Barlow Condensed",sans-serif';ctx.fillText(t(i?'projects.integration':'projects.websites'),400,175,704);
   ctx.fillStyle='#acbac8';ctx.font='30px Barlow,sans-serif';ctx.fillText(t(i?'projects.infrastructure':'gallery.subtitle'),400,230,704);
   if(!i){
    const projects=projectsIn(category);
    projects.forEach((project,index)=>{
     const y=galleryY(index,projects.length),image=pictures[index],g=GALLERY;
     ctx.fillStyle='#0a1521';ctx.strokeStyle='#354652';ctx.lineWidth=2;
     ctx.beginPath();ctx.roundRect(g.x,y,g.width,g.height,10);ctx.fill();ctx.stroke();
     if(image.complete&&image.naturalWidth){
      const scale=Math.min(g.thumbWidth/image.naturalWidth,g.thumbHeight/image.naturalHeight);
      const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
      ctx.drawImage(image,g.x+g.thumbX+(g.thumbWidth-w)/2,y+g.thumbY+(g.thumbHeight-h)/2,w,h);
     }
     ctx.textAlign='left';ctx.fillStyle='#e2edf6';ctx.font='600 41px "Barlow Condensed",sans-serif';
     ctx.fillText(project.id==='systems'?'TIEFGANG':t(project.title),430,y+105,272);
     ctx.fillStyle='#afc2d1';ctx.font='29px "Barlow Condensed",sans-serif';ctx.fillText(t('gallery.'+project.id),430,y+157,280);
     ctx.fillStyle=accent;ctx.font='36px Barlow,sans-serif';ctx.fillText('↗',706,y+104);
    });
    ctx.textAlign='center';ctx.fillStyle=accent;ctx.font='30px "Barlow Condensed",sans-serif';ctx.fillText(t('gallery.hint'),400,1305,704);
    texture.needsUpdate=true;return;
   }
   ctx.fillStyle='#030a12';ctx.fillRect(48,280,704,470);
   if(picture.complete&&picture.naturalWidth){const scale=Math.min(704/picture.naturalWidth,470/picture.naturalHeight);const w=picture.naturalWidth*scale,h=picture.naturalHeight*scale;ctx.globalAlpha=.5;ctx.drawImage(picture,48+(704-w)/2,280+(470-h)/2,w,h);ctx.globalAlpha=1;}
   ctx.fillStyle=accent;ctx.font='500 28px "Barlow Condensed",sans-serif';ctx.fillText(i?'DEBIAN · KVM · NFTABLES':'SVG · GSAP · JAVASCRIPT',400,820,704);
   ctx.fillStyle='#d4e8f8';ctx.font='500 39px "Barlow Condensed",sans-serif';ctx.fillText(t(projectsIn(category)[0].title),400,910,704);
   ctx.textAlign='left';ctx.fillStyle='#afc2d1';ctx.font='31px Barlow,sans-serif';
   if(i){paragraph(t('recovery.short'),995);ctx.fillStyle=accent;ctx.font='500 28px "Barlow Condensed",sans-serif';ctx.textAlign='center';ctx.fillText(t('recovery.planned'),400,1235,704);}
   else{paragraph(t('example.previewNote'),995);for(const [j,line] of t('example.previewFacts').split('|').entries())ctx.fillText('◇ '+line,48,1090+j*65,704);}
   ctx.textAlign='center';ctx.fillStyle=accent;ctx.font='500 32px "Barlow Condensed",sans-serif';ctx.fillText(t(i?'projects.play':'projects.open'),400,1360);
   texture.needsUpdate=true;
  }
  function load(){projectsIn(category).forEach((project,index)=>{pictures[index].src=project.preview(getLanguage());});draw();}
  pictures.forEach(image=>{image.onload=draw;});load();wings.push({mesh,pivot,texture,material,pictures,draw,load});
 }
 function pose(){wings.forEach((wing,i)=>{wing.pivot.rotation.y=(i?1:-1)*THREE.MathUtils.lerp(.98,.14,amount);wing.material.opacity=reveal;});group.visible=reveal>.01;}
 pose();const unsubscribe=onLanguageChange(()=>wings.forEach(w=>w.load()));
 document.fonts.ready.then(()=>{if(!disposed)wings.forEach(w=>w.draw());});
 return {group,mesh:meshes[0],meshes,
  setOrigin(y){group.position.set(0,y+HOLOGRAM_LIFT+height/2,HOLOGRAM_FRONT);},
  setOpen(value){open=value;if(reduced){amount=value?1:0;pose();}},
  bounds(out){group.updateWorldMatrix(true,false);return out.set(new THREE.Vector3(-width-.1,-height/2,-width),new THREE.Vector3(width+.1,height/2,.2)).applyMatrix4(group.matrixWorld);},
  setReveal(value,immediate=false){target=value;if(immediate){reveal=value;pose();}},
  update(_time,delta){const k=1-Math.exp(-Math.min(delta,.1)*5);amount+=((open?1:0)-amount)*k;reveal+=(target-reveal)*k;pose();},
  dispose(){disposed=true;unsubscribe();wings.forEach(w=>{w.pictures.forEach(image=>{image.onload=null;});w.texture.dispose();w.material.dispose();w.mesh.geometry.dispose();});}
 };
}
