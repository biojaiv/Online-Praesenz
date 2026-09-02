import { createPedestalEnergyField } from './pedestalEnergyField.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GUIDE_DEMO_STEP = 1120;
const GUIDE_DEMO_DELAY = 780;

function decorateDollyGuide() {
  const guide = document.querySelector('.camera-dolly-guide');
  if (!(guide instanceof HTMLElement)) return null;
  const svg = guide.querySelector('svg');
  if (!(svg instanceof SVGElement)) return guide;

  if (!svg.querySelector('.camera-dolly-guide__sign--plus')) {
    const plus = document.createElementNS(SVG_NS, 'text');
    plus.classList.add('camera-dolly-guide__sign', 'camera-dolly-guide__sign--plus');
    plus.setAttribute('x', '38');
    plus.setAttribute('y', '11');
    plus.setAttribute('text-anchor', 'middle');
    plus.textContent = '+';
    svg.append(plus);
  }

  if (!svg.querySelector('.camera-dolly-guide__sign--minus')) {
    const minus = document.createElementNS(SVG_NS, 'text');
    minus.classList.add('camera-dolly-guide__sign', 'camera-dolly-guide__sign--minus');
    minus.setAttribute('x', '38');
    minus.setAttribute('y', '145');
    minus.setAttribute('text-anchor', 'middle');
    minus.textContent = '−';
    svg.append(minus);
  }

  guide.dataset.zoomControl = 'left-wheel-arrows-pinch';
  return guide;
}

function createGuideDirector({ isResumeActive }) {
  const guide = decorateDollyGuide();
  const timers = new Set();
  let demoToken = 0;

  function later(callback, delay) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      callback();
    }, delay);
    timers.add(id);
    return id;
  }

  function clearTimers() {
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
  }

  function clearDemoClasses() {
    guide?.classList.remove('is-demo-near', 'is-demo-far', 'is-demo-running');
  }

  function cancelDemo() {
    demoToken += 1;
    clearTimers();
    clearDemoClasses();
  }

  function startDemo() {
    cancelDemo();
    if (!guide || !isResumeActive()) return;
    const token = ++demoToken;
    guide.classList.add('is-demo-running');

    const show = (direction) => {
      if (token !== demoToken || !isResumeActive()) return;
      guide.classList.toggle('is-demo-near', direction === 'near');
      guide.classList.toggle('is-demo-far', direction === 'far');
    };

    later(() => show('near'), GUIDE_DEMO_DELAY);
    later(() => show('far'), GUIDE_DEMO_DELAY + GUIDE_DEMO_STEP);
    later(() => show('near'), GUIDE_DEMO_DELAY + GUIDE_DEMO_STEP * 2);
    later(() => show('far'), GUIDE_DEMO_DELAY + GUIDE_DEMO_STEP * 3);
    later(() => {
      if (token !== demoToken) return;
      clearDemoClasses();
    }, GUIDE_DEMO_DELAY + GUIDE_DEMO_STEP * 4 + 420);
  }

  return {
    startDemo,
    cancelDemo,
    dispose() {
      cancelDemo();
    },
  };
}

export function createExperienceEnhancements({
  stage,
  canvas,
  getRoute = () => 'home',
  isReaderOpen = () => false,
} = {}) {
  if (!stage || !(canvas instanceof HTMLCanvasElement)) {
    return {
      setRoute() {}, setReaderOpen() {}, promptSectionChoice() {}, dispose() {},
    };
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const energy = createPedestalEnergyField({
    cards: stage.cards,
    renderer: stage.renderer,
    reduced,
  });
  energy.setPixelRatio(stage.renderer?.getPixelRatio?.() || window.devicePixelRatio || 1);

  let route = getRoute();
  let readerOpen = isReaderOpen();
  const isResumeActive = () => (
    String(route || '').split('/')[0] === 'lebenslauf'
    && !readerOpen
  );
  const guideDirector = createGuideDirector({ isResumeActive });

  const nav = document.getElementById('nav');
  const frameElement = document.getElementById('frame');
  const promptTimers = new Set();

  function promptLater(callback, delay) {
    const timer = window.setTimeout(() => {
      promptTimers.delete(timer);
      callback();
    }, delay);
    promptTimers.add(timer);
  }

  function clearPrompt() {
    for (const timer of promptTimers) window.clearTimeout(timer);
    promptTimers.clear();
    frameElement?.classList.remove('is-section-prompt');
    stage.cards?.setHover?.(null);
  }

  let raf = 0;
  let lastFrame = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || now - lastFrame < 28) return;
    const delta = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    energy.update(now / 1000, delta);
  }
  raf = requestAnimationFrame(frame);

  return {
    setRoute(nextRoute) {
      route = nextRoute || 'home';
      const root = String(route).split('/')[0] || 'home';
      energy.setRoute(root);
      clearPrompt();
      if (isResumeActive()) guideDirector.startDemo();
      else guideDirector.cancelDemo();
    },

    setReaderOpen(value) {
      readerOpen = Boolean(value);
      energy.setReaderOpen(readerOpen);
      if (isResumeActive()) guideDirector.startDemo();
      else guideDirector.cancelDemo();
    },

    promptSectionChoice() {
      clearPrompt();
      energy.pulseAll(2200);
      frameElement?.classList.add('is-section-prompt');
      const sequence = ['abschluss', 'projekte', 'lebenslauf'];
      sequence.forEach((key, index) => {
        promptLater(() => stage.cards?.setHover?.(key), index * 420);
      });
      promptLater(() => {
        stage.cards?.setHover?.(null);
        frameElement?.classList.remove('is-section-prompt');
      }, sequence.length * 420 + 520);
      const first = nav?.querySelector('.nav__link[data-target="abschluss"]');
      first?.focus?.({ preventScroll: true });
    },

    dispose() {
      cancelAnimationFrame(raf);
      clearPrompt();
      guideDirector.dispose();
      energy.dispose();
    },
  };
}
