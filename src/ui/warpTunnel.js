import { createRenderBudget } from '../scene/renderBudget.js';

const RECTANGLES = 5;
const CYCLE_SECONDS = 16;
const ORANGE = '232, 164, 90';

function createField(canvas, budget) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return { draw() {}, dispose() {} };
  let previousSize = '';

  return {
    draw(width, height, box, time) {
      const ratio = budget.ratio(width, height);
      const size = `${width}/${height}/${ratio}`;
      if (size !== previousSize) {
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        previousSize = size;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const outer = Math.min(12, Math.max(5, Math.min(width, height) * .018));
      const page = {
        left: box.left, top: box.top,
        right: box.right, bottom: box.bottom,
      };
      const from = {
        left: outer, top: outer,
        right: width - outer, bottom: height - outer,
      };
      const approach = (start, end, progress) => start + (end - start) * progress;

      context.lineWidth = width < 600 ? 1.15 : 1.5;
      context.shadowColor = `rgba(${ORANGE}, .6)`;
      context.shadowBlur = width < 600 ? 4 : 7;
      for (let index = 0; index < RECTANGLES; index++) {
        const progress = (time / CYCLE_SECONDS + index / RECTANGLES) % 1;
        const strength = Math.sin(Math.PI * progress);
        if (strength < .01) continue;
        const left = approach(from.left, page.left, progress);
        const top = approach(from.top, page.top, progress);
        const right = approach(from.right, page.right, progress);
        const bottom = approach(from.bottom, page.bottom, progress);
        context.strokeStyle = `rgba(${ORANGE}, ${(.18 + .56 * strength).toFixed(3)})`;
        context.strokeRect(left, top, right - left, bottom - top);
      }
      context.shadowBlur = 0;
    },
    dispose() { canvas.width = 0; canvas.height = 0; },
  };
}

export function createWarpTunnel(host, screen) {
  let canvas = document.createElement('canvas');
  let field = null, animation = 0, running = false, last = null, time = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const budget = createRenderBudget();
  function initialize() {
    field = createField(canvas, budget);
    canvas.className = 'warp-tunnel';
    canvas.setAttribute('aria-hidden', 'true');
    host.prepend(canvas);
  }
  function draw(now = performance.now()) {
    if (!running || document.hidden) return;
    if (!motion.matches && last !== null && now - last < 1000 / (budget.profile.name === 'low' ? 24 : 30) - 2) {
      animation = requestAnimationFrame(draw);
      return;
    }
    if (!motion.matches && last !== null) budget.sample(now - last);
    if (!motion.matches && last !== null) time += Math.min((now - last) / 1000, .1);
    last = now;
    field.draw(innerWidth, innerHeight, screen.getBoundingClientRect(), time);
    if (!motion.matches) animation = requestAnimationFrame(draw);
  }
  function refresh() { cancelAnimationFrame(animation); last = null; if (running) draw(); }
  window.addEventListener('resize', refresh);
  motion.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  return {
    start() { if (running) return; if (!field) initialize(); running = true; refresh(); },
    stop() {
      running = false; cancelAnimationFrame(animation);
      field?.dispose(); field = null; canvas.remove(); canvas = document.createElement('canvas');
    },
    dispose() {
      this.stop(); window.removeEventListener('resize', refresh); motion.removeEventListener('change', refresh);
      document.removeEventListener('visibilitychange', refresh);
    },
  };
}
