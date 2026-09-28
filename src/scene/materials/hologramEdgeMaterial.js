import * as THREE from 'three';
import vertexShader from '../shaders/hologramEdge.vert.glsl?raw';
import fragmentShader from '../shaders/hologramEdge.frag.glsl?raw';
import common from '../shaders/hologramCommon.glsl?raw';
import { createHologramControls, HOLOGRAM_PERIOD } from './hologramControls.js';
import { guardHologramShader, createStaticParticles } from './shaderFallback.js';

/** The existing particle contour: no full-sheet quad and no extra draw call. */
export function createHologramEdgeMaterial({ renderer, reduced = false, quality = 2 } = {}) {
  const uniforms = {
    uOpacity: { value: 0 }, uHalfWidth: { value: 1 }, uHalfHeight: { value: 1 },
    uPixelRatio: { value: 1 }, uHover: { value: 0 },
    // Preserve the original contour's linear RGB, rather than converting it twice.
    uAccent: { value: new THREE.Color(.47, .75, 1) },
  };
  const controls = createHologramControls(uniforms, { reduced, quality });
  const material = new THREE.ShaderMaterial({
    name: 'HologramEdge', uniforms, defines: { VL_HOLOGRAM_EDGE: 1, HOLOGRAM_PERIOD: HOLOGRAM_PERIOD.toFixed(1) },
    vertexShader: common + vertexShader, fragmentShader: common + fragmentShader,
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  material.userData.shaderRole = 'hologram-edge';
  let points, fallback = false, release = () => {};
  function fillStaticPositions() {
    if (!points) return;
    const { position, aOffset } = points.geometry.attributes;
    const w = uniforms.uHalfWidth.value, h = uniforms.uHalfHeight.value;
    for (let i = 0; i < position.count; i++) {
      const d = aOffset.getX(i) * 4 * (w + h);
      if (d < 2 * w) position.setXYZ(i, -w + d, -h, 0);
      else if (d < 2 * (w + h)) position.setXYZ(i, w, -h + d - 2 * w, 0);
      else if (d < 4 * w + 2 * h) position.setXYZ(i, w - d + 2 * (w + h), h, 0);
      else position.setXYZ(i, -w, h - d + 4 * w + 2 * h, 0);
    }
    position.needsUpdate = true;
  }
  return {
    material, uniforms, ...controls,
    bind(mesh) {
      points = mesh;
      release = guardHologramShader(renderer, 'VL_HOLOGRAM_EDGE', () => {
        if (fallback) return;
        fallback = true; fillStaticPositions();
        points.material = createStaticParticles(uniforms.uAccent.value);
        points.material.opacity = uniforms.uOpacity.value;
        points.userData.shaderFallback = true;
        material.dispose(); controls.dispose(); release();
      });
    },
    setWindow(width, height) {
      uniforms.uHalfWidth.value = width * .5; uniforms.uHalfHeight.value = height * .5;
      if (fallback) fillStaticPositions();
    },
    update(delta, visible = true) {
      controls.update(delta, visible);
      if (fallback) points.material.opacity = uniforms.uOpacity.value;
    },
    dispose() { controls.dispose(); release(); },
  };
}
