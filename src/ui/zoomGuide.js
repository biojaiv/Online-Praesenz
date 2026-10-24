import './zoomGuide.css';
import { onLanguageChange, t } from '../i18n.js';
import { playSound } from './audio.js';

// The overview must stand still this long before the explanation appears.
const SETTLE_TIME = 650;
// Reading time before the explanation warps into the footer on its own.
const READ_TIME = 3000;
const WARP_TIME = 950;
// Same easing as the identity warp into the header.
const WARP_EASING = 'cubic-bezier(.45, 0, .2, 1)';

// The left button glows and the wheel blinks: hold and turn to zoom.
const MOUSE_ICON = `
  <svg class="zoom-guide-mouse" viewBox="0 0 32 64" focusable="false" aria-hidden="true">
    <rect class="zoom-guide-mouse__body" x="1" y="1" width="30" height="62" rx="15" />
    <path class="zoom-guide-mouse__left" d="M2 18A14 14 0 0 1 16 2V23H2Z" />
    <rect class="zoom-guide-mouse__wheel" x="13" y="9" width="6" height="15" rx="3" />
    <path class="zoom-guide-mouse__mark zoom-guide-mouse__mark--upper" d="M16 11V15" />
    <path class="zoom-guide-mouse__mark zoom-guide-mouse__mark--lower" d="M16 18V22" />
  </svg>`;
const PINCH_ICON = `
  <svg class="zoom-guide-glyph" viewBox="0 0 32 32" focusable="false" aria-hidden="true">
    <circle cx="12" cy="20" r="2.5" /><circle cx="20" cy="12" r="2.5" />
    <path d="M9 23L4 28M4 22V28H10M23 9L28 4M22 4H28V10" />
  </svg>`;

// Only the zoom controls: the step visitors miss.
const STEPS = Object.freeze({
  pointer: [
    { icon: MOUSE_ICON, term: 'zoomGuide.zoom', action: 'zoomGuide.zoomAction' },
    { icon: '<kbd>↑</kbd><kbd>↓</kbd>', term: 'zoomGuide.keys', action: 'zoomGuide.keysAction' },
  ],
  touch: [
    { icon: PINCH_ICON, term: 'zoomGuide.touchZoom', action: 'zoomGuide.touchZoomAction' },
    { icon: '<kbd>+</kbd><kbd>−</kbd>', term: 'zoomGuide.touchButtons', action: 'zoomGuide.keysAction' },
  ],
});

/**
 * Explains document zoom once the overview stands, then warps the explanation
 * into the footer. The footer keeps a compact cue that replays it.
 */
export function createZoomGuide({ stage, host, tools, boot }) {
  const html = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  // Same input split as the stage's own zoom controls.
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const steps = STEPS[touch ? 'touch' : 'pointer'];

  const overlay = document.createElement('div');
  overlay.className = 'zoom-guide';
  overlay.setAttribute('role', 'status');
  host.append(overlay);

  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'zoom-guide-chip';
  chip.hidden = true;
  chip.innerHTML = `<span class="zoom-guide-chip__icon">${touch ? PINCH_ICON : MOUSE_ICON}</span>`
    + `<span class="zoom-guide-chip__label" data-zoom-text="${touch ? 'zoomGuide.touchChip' : 'zoomGuide.chip'}"></span>`;
  // Beside the footer tools, so the tab order stays left to right.
  tools?.after(chip);

  // pending → showing → docking → docked; the footer cue replays to showing.
  let state = 'pending';
  let introduced = false;
  let atHome = false;
  let watchFrame = 0;
  let timer = null;
  let flight = null;

  function translate() {
    for (const node of [...overlay.querySelectorAll('[data-zoom-text]'), ...chip.querySelectorAll('[data-zoom-text]')]) {
      node.textContent = t(node.dataset.zoomText);
    }
    chip.title = t('zoomGuide.chipTitle');
  }

  function syncChip() {
    chip.hidden = !atHome || !introduced;
  }

  function overviewStands() {
    return boot?.classList.contains('is-done') && !html.dataset.infoView && !html.classList.contains('is-site-inspecting')
      && !stage.isMoving && stage.cards.lightLevel >= 1;
  }

  function watchOverview() {
    cancelAnimationFrame(watchFrame);
    let standingSince = 0;
    const check = (now) => {
      watchFrame = 0;
      if (state !== 'pending' || !atHome) return;
      if (!overviewStands()) standingSince = 0;
      else if (!standingSince) standingSince = now;
      else if (now - standingSince >= SETTLE_TIME) { show(); return; }
      watchFrame = requestAnimationFrame(check);
    };
    watchFrame = requestAnimationFrame(check);
  }

  function render() {
    overlay.innerHTML = `
      <div class="zoom-guide__panel">
        <p class="zoom-guide__kicker" data-zoom-text="zoomGuide.kicker"></p>
        <ol class="zoom-guide__steps">${steps.map((step, i) => `
          <li class="zoom-guide__step" style="--i:${i}">
            <span class="zoom-guide__icon">${step.icon}</span>
            <span class="zoom-guide__text">
              <span class="zoom-guide__term" data-zoom-text="${step.term}"></span>
              <span class="zoom-guide__action" data-zoom-text="${step.action}"></span>
            </span>
          </li>`).join('')}
        </ol>
        <span class="zoom-guide__timer" aria-hidden="true"></span>
      </div>`;
    translate();
  }

  function show() {
    cancelAnimationFrame(watchFrame); watchFrame = 0;
    state = 'showing';
    // A replay lifts the cue out of the footer; it stays focusable meanwhile.
    chip.classList.add('is-incoming');
    render();
    // On phones the section buttons below the pedestal stay uncovered.
    const buttons = host.querySelector('.mobile-pedestals');
    const buttonsTop = buttons?.getClientRects().length ? buttons.getBoundingClientRect().top : 0;
    overlay.style.bottom = buttonsTop ? `${Math.max(0, host.getBoundingClientRect().bottom - buttonsTop)}px` : '';
    overlay.classList.add('is-open');
    // A low stage (a phone held sideways) shrinks the panel instead of cutting it off.
    const panel = overlay.querySelector('.zoom-guide__panel');
    const room = overlay.clientHeight - parseFloat(getComputedStyle(overlay).paddingTop) * 2;
    panel.style.setProperty('--fit', Math.min(1, room / panel.offsetHeight).toFixed(3));
    // The countdown line doubles as the timer, so a hidden tab pauses both.
    const line = overlay.querySelector('.zoom-guide__timer');
    timer = line.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: READ_TIME, fill: 'forwards' });
    if (document.hidden) timer.pause();
    timer.finished.then(() => dock(), () => {});
    addEventListener('pointerdown', dock, true);
    addEventListener('wheel', dock, { capture: true, passive: true });
    addEventListener('keydown', dockOnKey, true);
  }

  function stopListening() {
    removeEventListener('pointerdown', dock, true);
    removeEventListener('wheel', dock, true);
    removeEventListener('keydown', dockOnKey, true);
    timer?.cancel(); timer = null;
  }

  function dockOnKey(event) {
    // ESC only closes the explanation; it must not also leave the overview.
    if (event.key === 'Escape') event.preventDefault();
    dock();
  }

  function settle() {
    flight?.remove(); flight = null;
    overlay.classList.remove('is-open', 'is-warping');
    overlay.replaceChildren();
    chip.classList.remove('is-incoming');
    state = 'docked';
    if (!chip.hidden && !motion.matches) {
      chip.classList.remove('is-arriving');
      void chip.offsetWidth;
      chip.classList.add('is-arriving');
    }
  }

  /** Every part of the panel flies into the footer cue and merges with it. */
  async function dock() {
    if (state !== 'showing') return;
    stopListening();
    state = 'docking';
    introduced = true;
    syncChip();
    const panel = overlay.querySelector('.zoom-guide__panel');
    // After a route change the cue is gone; the parts gather in the footer's middle.
    const target = (atHome ? chip : tools)?.getBoundingClientRect();
    const start = panel?.getBoundingClientRect();
    if (motion.matches || !panel?.animate || !target?.width || !start?.width) {
      overlay.classList.remove('is-open');
      window.setTimeout(() => { if (state === 'docking') settle(); }, motion.matches ? 220 : 0);
      return;
    }
    const iconTarget = atHome ? chip.querySelector('.zoom-guide-chip__icon').getBoundingClientRect() : target;
    const labelTarget = atHome ? chip.querySelector('.zoom-guide-chip__label').getBoundingClientRect() : target;
    const layer = document.createElement('div');
    layer.className = 'zoom-guide-flight';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
    flight = layer;
    const animations = [];
    // Stretch to the target box, or keep proportions and shrink onto its centre.
    // Text fades early; frame and symbols carry the movement into the footer.
    function launch(part, from, end, { delay = 0, fit = 'stretch', fadeBy = 1 } = {}) {
      Object.assign(part.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
      layer.append(part);
      const uniform = Math.min(end.height / from.height, end.width / from.width, 1);
      const sx = fit === 'stretch' ? end.width / from.width : uniform;
      const sy = fit === 'stretch' ? end.height / from.height : uniform;
      const dx = end.left + end.width / 2 - (from.left + from.width * sx / 2);
      const dy = end.top + end.height / 2 - (from.top + from.height * sy / 2);
      animations.push(part.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1, filter: 'brightness(1)' },
        { opacity: 1, filter: 'brightness(1.7)', offset: fadeBy * .5 },
        { opacity: 0, filter: 'brightness(1)', offset: fadeBy },
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0 },
      ], { duration: WARP_TIME, delay, easing: WARP_EASING, fill: 'forwards' }).finished.catch(() => {}));
    }
    function fly(source, end, options) {
      const from = source?.getBoundingClientRect();
      if (!from?.width || !from.height) return;
      const part = source.cloneNode(true);
      part.removeAttribute('style');
      part.classList.add('zoom-guide-flight__part');
      launch(part, from, end, { fit: 'contain', ...options });
    }
    const frame = document.createElement('div');
    frame.className = 'zoom-guide-flight__part zoom-guide-flight__frame';
    launch(frame, start, target);
    fly(panel.querySelector('.zoom-guide__kicker'), labelTarget, { fadeBy: .5 });
    panel.querySelectorAll('.zoom-guide__step').forEach((step, i) => {
      fly(step.querySelector('.zoom-guide__icon'), iconTarget, { delay: 50 + i * 70, fadeBy: .95 });
      fly(step.querySelector('.zoom-guide__text'), labelTarget, { delay: 50 + i * 70, fadeBy: .6 });
    });
    overlay.classList.add('is-warping');
    await Promise.all(animations);
    if (state === 'docking' && flight === layer) settle();
  }

  function replay() {
    if (state !== 'docked' || !atHome) return;
    playSound('focus');
    show();
  }
  chip.addEventListener('click', replay);
  chip.addEventListener('animationend', (event) => {
    if (event.animationName === 'zoom-guide-arrive') chip.classList.remove('is-arriving');
  });

  function onVisibility() {
    if (!timer) return;
    if (document.hidden) timer.pause();
    else timer.play();
  }
  document.addEventListener('visibilitychange', onVisibility);
  const unsubscribeLanguage = onLanguageChange(translate);
  translate();

  return {
    /** Called for every route; the explanation belongs to the overview only. */
    setRoute(route) {
      atHome = (String(route || 'home').split('/')[0] || 'home') === 'home';
      if (state === 'showing' && !atHome) dock();
      syncChip();
      if (state === 'pending' && atHome) watchOverview();
    },
    get state() { return state; },
    dispose() {
      cancelAnimationFrame(watchFrame);
      stopListening();
      flight?.remove();
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribeLanguage();
      overlay.remove();
      chip.remove();
    },
  };
}
