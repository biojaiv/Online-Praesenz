import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import { createOrreryLighting } from './orreryLighting.js';
import { createDistantStars } from './distantStars.js';
import { deviceQuality } from './renderBudget.js';

const MODEL_URL = new URL('../../Elemente/Orrery/Hintergrund_web.glb', import.meta.url).href;

/** Authored Blender geometry and materials, revealed by occasional local PBR lighting. */
export function createBackground({ camera = null, random = Math.random } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const group = new THREE.Group();
  group.name = 'blender-background';
  group.userData.source = 'Elemente/Orrery/Hintergrund.blend';
  const stars = createDistantStars();
  group.add(stars.points);
  const ambient = { value: .18 };
  let machine = null, sourceScene = null, disposed = false;
  let effectsEnabled = true, symbolOnly = false, documentOpen = false;
  let readerOpen = false, suspended = false, compact = false, pixelRatio = 1;

  function syncState() {
    if (!machine) return;
    machine.setEffectsEnabled(effectsEnabled && !symbolOnly);
    machine.setDocumentOpen(documentOpen || readerOpen);
    machine.setSuspended(suspended);
    machine.setCompact(compact);
    machine.setPixelRatio(pixelRatio);
  }
  function releaseSource() {
    if (!sourceScene) return;
    // Geometry is shared with the scene instances and released by the machine.
    const materials = new Set(), geometry = new Set();
    sourceScene.traverse(object => {
      if (object.geometry) geometry.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material) materials.add(material);
      }
    });
    materials.forEach(material => material.dispose());
    if (!machine) geometry.forEach(item => item.dispose());
    sourceScene = null;
  }
  const draco = new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG)
    .setWorkerLimit(deviceQuality() === 2 ? 2 : 1);
  const ready = new GLTFLoader().setDRACOLoader(draco).loadAsync(MODEL_URL).then(gltf => {
    sourceScene = gltf.scene;
    if (disposed) { releaseSource(); return false; }
    const source = sourceScene.children.find(object => object.userData.sourceName === 'V2 GESAMTMODELL');
    if (!source) throw new Error('V2 GESAMTMODELL fehlt im GLB.');
    machine = createOrreryLighting(source, { reduced, camera, random });
    group.add(machine.group);
    syncState();
    return true;
  }).catch(error => {
    releaseSource();
    if (!disposed) console.warn('Blender-Hintergrund konnte nicht geladen werden:', error);
    return false;
  }).finally(() => draco.dispose());

  return {
    group, ambient, ready,
    getInspectionCandidates: camera => machine?.getInspectionCandidates(camera) ?? [],
    setInspectionPoint: (point, radius) => machine?.setInspectionPoint(point, radius),
    setEffectsEnabled(value) {
      effectsEnabled = Boolean(value);
      group.visible = effectsEnabled && !symbolOnly;
      machine?.setEffectsEnabled(group.visible);
    },
    setSymbolOnly(value) {
      symbolOnly = Boolean(value);
      group.visible = effectsEnabled && !symbolOnly;
      machine?.setEffectsEnabled(group.visible);
    },
    setDocumentOpen(value) { documentOpen = Boolean(value); machine?.setDocumentOpen(documentOpen || readerOpen); },
    setReaderOpen(value) { readerOpen = Boolean(value); machine?.setDocumentOpen(documentOpen || readerOpen); },
    setSuspended(value) { suspended = Boolean(value); machine?.setSuspended(suspended); },
    setCompact(value) { compact = Boolean(value); machine?.setCompact(compact); },
    setPointerNdc() {},
    setPixelRatio(value) { pixelRatio = value; stars.setPixelRatio(value); machine?.setPixelRatio(value); },
    triggerSparseIllumination() { return !reduced && (machine?.triggerSparseIllumination() ?? false); },
    update(elapsed, delta) { if (!disposed) machine?.update(elapsed, delta); },
    dispose() {
      if (disposed) return;
      disposed = true;
      draco.dispose();
      releaseSource();
      machine?.dispose();
      stars.dispose();
      group.clear();
    },
  };
}
