import { circleMotionSpeed } from './orreryPaths.js';

// Use the complete authored world exactly once, including its own satellites,
// stage rings and accessories. Material groups and maps remain attached.
export function buildBlenderOrrery(source, { createMaterial, centre }) {
  const root = source.clone(true);
  const main = root.children.find(object => object.userData.sourceName === '01 HAUPTMASCHINE / Lage');
  main.position.copy(centre);
  const rotors = [], materials = new Map();
  const satellites = root.children.filter(object => /NEBENMASCHINE \/ Lage$/.test(object.userData.sourceName));
  const preserve = (sourceMaterial, distant) => {
    const key = `${sourceMaterial.uuid}:${distant}`;
    if (!materials.has(key)) materials.set(key, createMaterial(sourceMaterial, distant));
    return materials.get(key);
  };
  root.traverse(object => {
    const speed = object.userData.Winkelgeschwindigkeit;
    if (Number.isFinite(speed)) {
      const webSpeed = circleMotionSpeed(object.userData.sourceName || '', speed);
      object.userData.webAngularSpeed = webSpeed;
      rotors.push({ object, speed: webSpeed, axis: object.userData.Achse_Web.toLowerCase() });
    }
    if (object.isMesh) {
      let distant = false;
      for (let parent = object; parent; parent = parent.parent) {
        if (satellites.includes(parent)) { distant = true; break; }
      }
      object.material = Array.isArray(object.material)
        ? object.material.map(material => preserve(material, distant)) : preserve(object.material, distant);
      object.castShadow = false;
      object.receiveShadow = false;
      object.renderOrder = -10;
    }
  });
  return { root, main, rotors, satellites, materials: [...materials.values()] };
}
