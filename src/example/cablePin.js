import { GUIDES } from './diagramLayout.js';

const UPLINK_B = GUIDES.find(guide => guide.id === 'uplink-b');
const PIN_X = 552;

/** The failure switch sits beside the two uplinks it affects and follows the drawing. */
export function createCablePin(root) {
  const stage = root.querySelector('.stage');
  const pin = stage?.querySelector('.cable-pin');
  const svg = stage?.querySelector('.source-infrastructure');
  const button = pin?.querySelector('[data-cable]');
  if (!stage || !pin || !svg || !button) return { update() {}, dispose() {} };

  let frame = 0, used = false, disposed = false;
  const point = (x, y) => {
    const matrix = svg.getScreenCTM();
    return matrix ? new DOMPoint(x, y).matrixTransform(matrix) : null;
  };
  function layout() {
    frame = 0;
    if (disposed || pin.hidden) return;
    const y = (UPLINK_B.from + UPLINK_B.to) / 2;
    const edge = point(PIN_X, y), target = point(UPLINK_B.x, y);
    if (!edge || !target) return;
    const box = stage.getBoundingClientRect();
    const left = Math.max(0, Math.min(edge.x - box.left, box.width - pin.offsetWidth - 2));
    pin.style.left = `${left}px`;
    const above=stage.querySelector('.diagram-label[data-term="switch"]')?.getBoundingClientRect();
    const below=stage.querySelector('.diagram-label[data-term="firewall"]')?.getBoundingClientRect();
    const preferred=edge.y-box.top-pin.offsetHeight/2;
    const top=above&&below?Math.max(above.bottom-box.top+4,Math.min(preferred,below.top-box.top-pin.offsetHeight-4)):preferred;
    pin.style.top = `${top}px`;
    pin.style.setProperty('--lead', `${Math.max(0, left - (target.x - box.left))}px`);
  }
  function schedule() {
    if (!disposed && !frame) frame = requestAnimationFrame(layout);
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
  [stage, svg,...stage.querySelectorAll('.diagram-label')].forEach(node => observer?.observe(node));
  window.addEventListener('resize', schedule);
  stage.addEventListener('diagram-label-layout', schedule);
  document.fonts?.ready.then(schedule);
  const markUsed = () => { used = true; pin.classList.remove('is-hint'); };
  button.addEventListener('click', markUsed);

  return {
    update({ chapter, ready }) {
      const show = chapter > 0 && !ready;
      pin.hidden = !show;
      pin.classList.toggle('is-hint', show && !used);
      schedule();
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      stage.removeEventListener('diagram-label-layout', schedule);
      button.removeEventListener('click', markUsed);
    },
  };
}
