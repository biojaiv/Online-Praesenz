// EPIC_DARK_MACHINE_BACKGROUND_V5_5_2
import * as THREE from 'three';
import { createProceduralOrreryField } from './proceduralOrreryField.js';

/**
 * Dark machine-world background.
 *
 * The oversized structure stays almost black. A compact autonomous light
 * travels between mechanical fragments and reveals only the local area around
 * it. The world keeps moving behind the opened CV and the HTML reader.
 */
export function createBackground({ camera = null, renderer = null } = {}) {
  const group = new THREE.Group();
  group.name = 'dark-machine-background-v5.5.2';
  group.userData.kind = 'dark-machine-background-v5.5.2';

  const machineWorld = createProceduralOrreryField({ camera, renderer });
  group.add(machineWorld.group);

  // Compatibility uniform used by the existing intro controller.
  const ambient = { value: 0.016 };
  let effectsEnabled = true;
  let symbolOnly = false;
  let documentOpen = false;
  let readerOpen = false;
  let disposed = false;

  function syncEffects() {
    machineWorld.setEffectsEnabled(effectsEnabled && !symbolOnly);
  }

  function syncDocumentState() {
    machineWorld.setDocumentOpen(documentOpen || readerOpen);
  }

  return {
    group,
    ambient,
    ready: machineWorld.ready,
    traceCount: 0,

    setEffectsEnabled(value) {
      effectsEnabled = Boolean(value);
      syncEffects();
    },

    setSymbolOnly(value) {
      symbolOnly = Boolean(value);
      syncEffects();
    },

    setDocumentOpen(value) {
      documentOpen = Boolean(value);
      syncDocumentState();
    },

    setReaderOpen(value) {
      readerOpen = Boolean(value);
      syncDocumentState();
    },

    setSuspended(value) {
      machineWorld.setSuspended(value);
    },

    setCompact(value) {
      machineWorld.setCompact(Boolean(value));
    },

    setPointerNdc(x, y, active = true) {
      machineWorld.setPointerNdc(x, y, active);
    },

    setPixelRatio(value) {
      machineWorld.setPixelRatio(value);
    },

    triggerSparseIllumination() {
      if (disposed) return false;
      return machineWorld.triggerSparseIllumination();
    },

    update(elapsed, delta) {
      if (disposed) return;
      // The intro can animate ambient.value up to 1. The actual machine world
      // remains dark and never turns into a visible wallpaper.
      const requestedAmbient = THREE.MathUtils.clamp(
        0.007 + Number(ambient.value || 0) * 0.011,
        0.007,
        documentOpen || readerOpen ? 0.022 : 0.028,
      );
      machineWorld.setAmbient(requestedAmbient);
      machineWorld.update(elapsed, delta);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      machineWorld.dispose();
      group.clear();
    },
  };
}
