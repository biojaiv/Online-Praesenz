import * as THREE from 'three';
import { createProceduralOrreryField } from './proceduralOrreryField.js';

/**
 * Dark machine-world background.
 *
 * No motherboard wallpaper and no permanently glowing concentric circles.
 * The oversized structure is almost invisible until an autonomous travelling
 * light pulse reveals a local section. Fog and sparse dust remain visible.
 */
export function createBackground({ camera = null, renderer = null } = {}) {
  const group = new THREE.Group();
  group.name = 'dark-machine-background-v5.4';

  const machineWorld = createProceduralOrreryField({ camera, renderer });
  group.add(machineWorld.group);

  // Compatibility uniform used by the existing intro controller.
  const ambient = { value: 0.025 };
  let effectsEnabled = true;
  let symbolOnly = false;
  let documentOpen = false;
  let compact = false;

  return {
    group,
    ambient,
    ready: machineWorld.ready,
    traceCount: 0,

    setEffectsEnabled(value) {
      effectsEnabled = Boolean(value);
      machineWorld.setEffectsEnabled(effectsEnabled && !symbolOnly);
    },

    setSymbolOnly(value) {
      symbolOnly = Boolean(value);
      machineWorld.setEffectsEnabled(effectsEnabled && !symbolOnly);
    },

    setDocumentOpen(value) {
      documentOpen = Boolean(value);
      // The world intentionally remains visible and animated behind the CV.
      machineWorld.setDocumentOpen(documentOpen);
    },

    setSuspended(value) {
      machineWorld.setSuspended(value);
    },

    setReaderOpen(value) {
      machineWorld.setDocumentOpen(Boolean(value) || documentOpen);
    },

    setCompact(value) {
      compact = Boolean(value);
      machineWorld.setCompact(compact);
    },

    setPointerNdc(x, y, active = true) {
      machineWorld.setPointerNdc(x, y, active);
    },

    setPixelRatio(value) {
      machineWorld.setPixelRatio(value);
    },

    triggerSparseIllumination() {
      return machineWorld.triggerSparseIllumination();
    },

    update(elapsed, delta) {
      // Intro code can still animate ambient.value. Keep the actual world
      // extremely dark even when that compatibility value briefly reaches 1.
      const requestedAmbient = THREE.MathUtils.clamp(
        0.012 + Number(ambient.value || 0) * 0.018,
        0.012,
        documentOpen ? 0.032 : 0.038,
      );
      machineWorld.setAmbient(requestedAmbient);
      machineWorld.update(elapsed, delta);
    },

    dispose() {
      machineWorld.dispose();
      group.clear();
    },
  };
}
