import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
/** These assets and the decoder load only inside an opened example. */
export async function loadBlenderAsset(url) {
 const draco=new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG).setWorkerLimit(1);
 const loader=new GLTFLoader().setDRACOLoader(draco);
 try {return (await loader.loadAsync(url)).scene;}
 finally {draco.dispose();}
}
export function modelUnavailable(canvas,error){
 console.warn('Creative model unavailable:',error);
 canvas.hidden=true;canvas.dataset.modelReady='error';document.documentElement.classList.add('no-webgl');
}
