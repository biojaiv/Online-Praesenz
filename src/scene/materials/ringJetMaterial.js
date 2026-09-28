import * as THREE from 'three';
import vertexShader from '../shaders/ringJet.vert.glsl?raw';
import fragmentShader from '../shaders/ringJet.frag.glsl?raw';
import common from '../shaders/hologramCommon.glsl?raw';
import { createHologramControls, HOLOGRAM_PERIOD } from './hologramControls.js';
import { guardHologramShader, createStaticParticles } from './shaderFallback.js';

export function createRingJetMaterial(uniforms, { renderer, reduced = false, quality = 2 } = {}) {
  const controls = createHologramControls(uniforms, { reduced, quality });
  const material = new THREE.ShaderMaterial({
    name: 'HologramRingJet', uniforms, defines: { VL_HOLOGRAM_JET: 1, HOLOGRAM_PERIOD: HOLOGRAM_PERIOD.toFixed(1) },
    vertexShader: common + vertexShader, fragmentShader: common + fragmentShader,
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  material.userData.shaderRole = 'ring-jet';
  let points, mirror, fallback = false, release = () => {};
  function fillStaticPositions() {
    if (!points) return;
    const { position, aAngle, aPhase } = points.geometry.attributes;
    const origin = uniforms.uOriginY.value;
    const height = Math.max(0, Math.min(uniforms.uHeight.value * uniforms.uHeightScale.value, uniforms.uEndY.value - origin) - .08);
    for (let i = 0; i < position.count; i++) {
      const t = aPhase.getX(i), a = aAngle.getX(i), r = uniforms.uRadius.value;
      position.setXYZ(i, Math.cos(a) * r, origin + t * height, Math.sin(a) * r);
    }
    position.needsUpdate = true;
  }
  return {
    material, ...controls,
    bind(mesh) {
      points = mesh;
      release = guardHologramShader(renderer, 'VL_HOLOGRAM_JET', () => {
        if (fallback) return;
        fallback = true; fillStaticPositions();
        points.material = createStaticParticles(0x78bfff, .9);
        points.material.opacity = .25 * uniforms.uReveal.value;
        points.userData.shaderFallback = true;
        if (mirror) { mirror.material = points.material; mirror.userData.shaderFallback = true; }
        material.dispose(); controls.dispose(); release();
      });
    },
    setMirror(mesh) { mirror = mesh; if (fallback) { mirror.material = points.material; mirror.userData.shaderFallback = true; } },
    refreshGeometry() { if (fallback) fillStaticPositions(); },
    update(delta, visible = true) {
      controls.update(delta, visible);
      if (fallback) points.material.opacity = .25 * uniforms.uReveal.value;
    },
    dispose() { controls.dispose(); release(); },
  };
}
