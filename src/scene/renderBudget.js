// Hardware hints choose a conservative starting point; sustained frame delays
// lower GPU cost. Desktop geometry keeps native resolution within a pixel cap.
const LEVELS = [
  { name: 'low', dpr: .75, pixels: 550_000, bloomLevels: 5 },
  { name: 'balanced', dpr: 1, pixels: 1_000_000, bloomLevels: 6 },
  { name: 'full', dpr: 1.5, pixels: 3_300_000, bloomLevels: 8 },
];
export function deviceQuality({ cores = navigator.hardwareConcurrency, memory = navigator.deviceMemory,
  saveData = navigator.connection?.saveData, coarse = matchMedia('(pointer: coarse)').matches } = {}) {
  if ((cores > 0 && cores <= 2) || (memory > 0 && memory <= 2)) return 0;
  return saveData || coarse || (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4) ? 1 : 2;
}
export function createRenderBudget(level = deviceQuality(), { nativeDesktop = false } = {}) {
  // The borderless desktop stage must not magnify a sub-native framebuffer.
  // Keep one sample per CSS pixel through QHD even after adaptive downgrades;
  // shader detail, bloom and HiDPI supersampling may still become cheaper.
  // Touch/low-memory devices retain the smaller budgets above.
  const levels = nativeDesktop ? LEVELS.map(profile => ({
    ...profile, dpr: Math.max(1, profile.dpr), pixels: Math.max(2560 * 1440, profile.pixels),
  })) : LEVELS;
  let current = level, total = 0, count = 0, slowWindows = 0;
  return {
    get profile() { return levels[current]; },
    ratio(width, height, dpr = devicePixelRatio || 1) {
      return Math.min(dpr, levels[current].dpr, Math.sqrt(levels[current].pixels / Math.max(1, width * height)));
    },
    sample(milliseconds) {
      // A resumed tab or one shader compilation must not change quality.
      if (milliseconds <= 0 || milliseconds > 1000) { this.reset(); return false; }
      total += milliseconds; count++;
      if (total < 2500 || count < 12) return false;
      slowWindows = total / count > 52 ? slowWindows + 1 : 0;
      total = 0; count = 0;
      if (slowWindows < 2 || current === 0) return false;
      current--; this.reset(); return true;
    },
    reset() { total = 0; count = 0; slowWindows = 0; },
    restart() { current = level; this.reset(); },
  };
}
