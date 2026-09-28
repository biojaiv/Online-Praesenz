export const HOLOGRAM_PERIOD = 1024;

/** Uniform state belongs to one effect, driven only by the existing scene loop. */
export function createHologramControls(uniforms, { reduced = false, quality = 2 } = {}) {
  let compact = false, disposed = false, activation = -1;
  let hovered = false, clock = 0, level = quality, motionReduced = reduced;
  Object.assign(uniforms, {
    uTime: { value: 0 },
    uMotion: { value: 0 },
    uQuality: { value: level },
    uEnhanced: { value: 1 },
    uActivation: { value: -1 },
  });
  function syncMotion() {
    uniforms.uMotion.value = !motionReduced && !compact && level > 0 ? 1 : 0;
    uniforms.uQuality.value = level;
    if (!uniforms.uMotion.value) activation = uniforms.uActivation.value = -1;
  }
  syncMotion();
  return {
    activate() { if (!disposed && uniforms.uMotion.value) activation = 0; },
    setHovered(value) { if (value && !hovered) this.activate(); hovered = !!value; },
    setQuality(value) { level = Math.max(0, Math.min(2, value)); syncMotion(); },
    setReducedMotion(value) { motionReduced = !!value; syncMotion(); },
    setCompact(value) { compact = !!value; syncMotion(); },
    setEnhanced(value) { uniforms.uEnhanced.value = value ? 1 : 0; },
    update(delta, visible = true) {
      if (disposed || !visible || !uniforms.uMotion.value) return;
      const dt = Math.min(.1, Math.max(0, Number(delta) || 0));
      clock = (clock + dt) % HOLOGRAM_PERIOD;
      uniforms.uTime.value = clock;
      if (activation >= 0) {
        activation += dt / .62;
        if (activation >= 1) activation = -1;
      }
      uniforms.uActivation.value = activation;
    },
    dispose() { disposed = true; },
  };
}
