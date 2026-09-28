import * as THREE from 'three';

// Three's public shader-error hook is shared per renderer and restored after
// the last registered material is disposed. Never suppress unrelated errors.
const renderers = new WeakMap();
export function guardHologramShader(renderer, marker, fallback) {
  if (!renderer) return () => {};
  let state = renderers.get(renderer);
  if (!state) {
    state = { previous: renderer.debug.onShaderError, entries: new Set() };
    state.handler = (gl, program, vertex, fragment) => {
      const source = `${gl.getShaderSource(vertex)}\n${gl.getShaderSource(fragment)}`;
      const matches = [...state.entries].filter(entry => source.includes(`#define ${entry.marker} 1`));
      if (!matches.length) {
        if (state.previous) state.previous(gl, program, vertex, fragment);
        else console.error('WebGL shader error:', gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment));
        return;
      }
      console.warn('Hologram shader unavailable; using static particles.', gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment));
      // A shader can fail while Three is drawing it. Replace/dispose after the
      // current render completes, never mutate renderer state inside the hook.
      for (const entry of matches) {
        if (entry.pending) continue;
        entry.pending = true;
        queueMicrotask(() => { if (state.entries.has(entry)) entry.fallback(); });
      }
    };
    renderer.debug.onShaderError = state.handler;
    renderers.set(renderer, state);
  }
  const entry = { marker, fallback, pending: false };
  state.entries.add(entry);
  return () => {
    state.entries.delete(entry);
    if (state.entries.size) return;
    if (renderer.debug.onShaderError === state.handler) renderer.debug.onShaderError = state.previous;
    renderers.delete(renderer);
  };
}

export function createStaticParticles(color, size = 1.4) {
  const pixels = new Uint8Array(16 * 16 * 4);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const i = (y * 16 + x) * 4, d = Math.hypot((x - 7.5) / 8, (y - 7.5) / 8);
    pixels.set([255, 255, 255, Math.round(Math.max(0, 1 - d) ** 2 * 255)], i);
  }
  const map = new THREE.DataTexture(pixels, 16, 16);
  map.needsUpdate = true;
  const material = new THREE.PointsMaterial({ color, map, size, sizeAttenuation: false,
    transparent: true, opacity: .42, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  material.name = 'Hologram static fallback';
  // The fallback texture is owned by this material, including direct disposal.
  material.addEventListener('dispose', () => map.dispose());
  return material;
}
