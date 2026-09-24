// Hardware hints choose a conservative starting point; sustained frame delays
// lower only GPU resolution. HTML text and project pages keep native resolution.
const LEVELS = [
  { name: 'low', dpr: .75, pixels: 550_000, bloomLevels: 5 },
  { name: 'balanced', dpr: 1, pixels: 1_000_000, bloomLevels: 6 },
  { name: 'full', dpr: 1.5, pixels: 1_800_000, bloomLevels: 8 },
];
export function deviceQuality({ cores = navigator.hardwareConcurrency, memory = navigator.deviceMemory,
  saveData = navigator.connection?.saveData, coarse = matchMedia('(pointer: coarse)').matches } = {}) {
  if ((cores > 0 && cores <= 2) || (memory > 0 && memory <= 2)) return 0;
  return saveData || coarse || (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4) ? 1 : 2;
}
export function createRenderBudget(level = deviceQuality()) {
  let current = level, total = 0, count = 0, slowWindows = 0;
  return {
    get profile() { return LEVELS[current]; },
    ratio(width, height, dpr = devicePixelRatio || 1) {
      return Math.min(dpr, LEVELS[current].dpr, Math.sqrt(LEVELS[current].pixels / Math.max(1, width * height)));
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
  };
}
