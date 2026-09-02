// EPIC_ORRERY_BACKGROUND_V6
import * as THREE from 'three';
import { createOrreryMachine } from './orreryMachine.js';

/**
 * Hintergrund: die grosse Orrery-Maschine.
 *
 * Sie steht schraeg hinter und um die drei Sockel und bleibt fast schwarz.
 * Sichtbar wird sie durch die Lichtfront, die vom Kern nach aussen wandert,
 * und durch zwei Laternen auf ihren Schienen. Die Maschine laeuft auch
 * hinter dem geoeffneten Lebenslauf weiter, nur gedaempft.
 */
export function createBackground({ renderer = null } = {}) {
  const group = new THREE.Group();
  group.name = 'orrery-background-v6';

  const machine = createOrreryMachine({ renderer });
  group.add(machine.group);

  // Kompatibilitaets-Uniform: die Intro-Steuerung animiert ambient.value.
  const ambient = { value: 0.18 };
  let effectsEnabled = true;
  let symbolOnly = false;
  let documentOpen = false;
  let readerOpen = false;
  let disposed = false;

  function syncEffects() {
    machine.setEffectsEnabled(effectsEnabled && !symbolOnly);
  }

  function syncDocumentState() {
    machine.setDocumentOpen(documentOpen || readerOpen);
  }

  return {
    group,
    ambient,
    ready: machine.ready,

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
      machine.setSuspended(value);
    },

    setCompact(value) {
      machine.setCompact(Boolean(value));
    },

    setPointerNdc(x, y, active = true) {
      machine.setPointerNdc(x, y, active);
    },

    setPixelRatio(value) {
      machine.setPixelRatio(value);
    },

    triggerSparseIllumination() {
      if (disposed) return false;
      return machine.triggerSparseIllumination();
    },

    update(elapsed, delta) {
      if (disposed) return;
      machine.setAmbient(THREE.MathUtils.clamp(Number(ambient.value || 0), 0, 1));
      machine.update(elapsed, delta);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      machine.dispose();
      group.clear();
    },
  };
}
