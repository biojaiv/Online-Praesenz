import * as THREE from 'three';
/** Render only on demand, except for explicitly visible motion. No postprocessing. */
export function createScene(canvas, {background = null, orthographic = false, lowFrameRate = 30, respectReducedMotion = true} = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, alpha:!background, antialias:true, powerPreference:'low-power'}); }
  catch { canvas.hidden = true; document.documentElement.classList.add('no-webgl'); return null; }
  const scene = new THREE.Scene();
  if (background) scene.background = new THREE.Color(background);
  const camera = orthographic ? new THREE.OrthographicCamera(-10,10,8,-8,.1,100) : new THREE.PerspectiveCamera(38,1,.1,100);
  const low = navigator.connection?.saveData || navigator.hardwareConcurrency <= 4 || matchMedia('(pointer:coarse)').matches;
  const motion = matchMedia('(prefers-reduced-motion:reduce)');
  const maxDpr = low ? 1 : 1.5;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  let visible = false, continuous = false, frame = 0, disposed = false, lost = false, last = 0;
  let update = () => {}, framing = null;
  function draw(time = 0) {
    frame = 0;
    if (!visible || disposed || lost) return;
    if (time - last >= 1000/(low?lowFrameRate:30) || !continuous || (respectReducedMotion && motion.matches)) {
      last = time; update(time / 1000); renderer.render(scene,camera);
    }
    if (continuous && !(respectReducedMotion && motion.matches) && !frame) frame = requestAnimationFrame(draw);
  }
  function invalidate() { if (!frame && visible && !disposed && !lost) frame=requestAnimationFrame(draw); }
  const resize = () => {
    const {width,height}=canvas.getBoundingClientRect(); if(!width||!height)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1,maxDpr,Math.sqrt(900000/(width*height))));
    renderer.setSize(width,height,false);
    if(framing)framing(width,height,camera);
    else if(orthographic){const h=Math.max(8.4,10/(width/height));camera.left=-h*width/height;camera.right=h*width/height;camera.top=h;camera.bottom=-h;}else {camera.aspect=width/height;camera.position.z=Math.max(11.7,6.2/(Math.tan(camera.fov*Math.PI/360)*camera.aspect));}
    camera.updateProjectionMatrix();invalidate();
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;invalidate();});
  motion.addEventListener('change',invalidate);
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();motion.removeEventListener('change',invalidate);
    const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));});
    materials.forEach(m=>Object.values(m).forEach(value=>{if(value?.isTexture)textures.add(value);}));
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();
  }
  addEventListener('pagehide',dispose,{once:true});
  if(import.meta.env.DEV)window.__creativeScene={renderer,scene,camera,get visible(){return visible;},get pendingFrame(){return frame;}};
  return {scene,camera,renderer,motion,low,invalidate,resize,dispose,
    setFraming(fn){framing=fn;resize();},
    renderStill(){if(!disposed&&!lost){update(0);renderer.render(scene,camera);}},
    setUpdate(fn){update=fn;},setVisible(value){visible=value;cancelAnimationFrame(frame);frame=0;invalidate();},
    setContinuous(value){if(continuous===value)return;continuous=value;invalidate();}
  };
}
