import * as THREE from 'three';
import { createPedestalEnergyField } from './pedestalEnergyField.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GUIDE_DEMO_STEP = 1120;
const GUIDE_DEMO_DELAY = 780;

function copyPointerEvent(source, type, overrides = {}) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: source.pointerId,
    width: source.width,
    height: source.height,
    pressure: type === 'pointerup' || type === 'pointercancel' ? 0 : source.pressure,
    tangentialPressure: source.tangentialPressure,
    tiltX: source.tiltX,
    tiltY: source.tiltY,
    twist: source.twist,
    pointerType: overrides.pointerType ?? source.pointerType,
    isPrimary: source.isPrimary,
    screenX: source.screenX,
    screenY: source.screenY,
    clientX: source.clientX,
    clientY: source.clientY,
    ctrlKey: source.ctrlKey,
    shiftKey: source.shiftKey,
    altKey: source.altKey,
    metaKey: source.metaKey,
    button: overrides.button ?? source.button,
    buttons: overrides.buttons ?? source.buttons,
  });
}

function decorateDollyGuide() {
  const guide = document.querySelector('.camera-dolly-guide');
  if (!(guide instanceof HTMLElement)) return null;
  const svg = guide.querySelector('svg');
  if (!(svg instanceof SVGElement)) return guide;

  const oldButton = svg.querySelector('.camera-dolly-guide__left-button');
  if (oldButton instanceof SVGPathElement) {
    oldButton.classList.remove('camera-dolly-guide__left-button');
    oldButton.classList.add('camera-dolly-guide__right-button');
    oldButton.setAttribute('d', 'M38 41A14 14 0 0 1 52 57V62H38Z');
  }

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

  guide.dataset.zoomControl = 'right-wheel';
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
    guide,
    startDemo,
    cancelDemo,
    setHeld(value) {
      guide?.classList.toggle('is-right-held', Boolean(value));
      if (value) cancelDemo();
    },
    dispose() {
      cancelDemo();
      guide?.classList.remove('is-right-held');
    },
  };
}

function createResumeInputAdapter({ stage, canvas, isResumeActive, guideDirector }) {
  const syntheticEvents = new WeakSet();
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let mode = null;
  let lastPointerEvent = null;

  function isSynthetic(event) {
    return syntheticEvents.has(event);
  }

  function dispatchProxy(source, type, overrides) {
    const proxy = copyPointerEvent(source, type, overrides);
    syntheticEvents.add(proxy);
    canvas.dispatchEvent(proxy);
  }

  function hitsDocument(event) {
    const objects = stage?.cards?.documentPickables;
    if (!objects?.length || !stage?.camera) return false;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
    raycaster.setFromCamera(ndc, stage.camera);
    return raycaster.intersectObjects(objects, false).length > 0;
  }

  function cancelMode() {
    if (!mode || !lastPointerEvent) {
      mode = null;
      guideDirector.setHeld(false);
      return;
    }
    try {
      dispatchProxy(lastPointerEvent, 'pointercancel', {
        pointerType: mode === 'left' ? 'touch' : 'mouse',
        button: 0,
        buttons: 0,
      });
    } catch {
      // Pointer may already have been released by the browser.
    }
    mode = null;
    lastPointerEvent = null;
    guideDirector.setHeld(false);
  }

  function onPointerDown(event) {
    if (isSynthetic(event) || event.pointerType !== 'mouse' || !isResumeActive()) return;

    if (event.button === 2) {
      if (!hitsDocument(event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      guideDirector.cancelDemo();
      mode = 'zoom';
      lastPointerEvent = event;
      guideDirector.setHeld(true);
      dispatchProxy(event, 'pointerdown', {
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
      });
      return;
    }

    if (event.button === 0) {
      // The existing stage uses touch semantics for rotation without engaging
      // its old left-button wheel dolly. This preserves click/drag behaviour
      // while making the right button the sole zoom modifier.
      event.preventDefault();
      event.stopImmediatePropagation();
      guideDirector.cancelDemo();
      mode = 'left';
      lastPointerEvent = event;
      dispatchProxy(event, 'pointerdown', {
        pointerType: 'touch',
        button: 0,
        buttons: 1,
      });
    }
  }

  function onPointerMove(event) {
    if (isSynthetic(event) || !mode || event.pointerId !== lastPointerEvent?.pointerId) return;
    lastPointerEvent = event;
    event.preventDefault();
    event.stopImmediatePropagation();

    // Right-button movement must not rotate the document. The wheel alone
    // controls the dolly. Left movement is forwarded as touch-style rotation.
    if (mode === 'left') {
      dispatchProxy(event, 'pointermove', {
        pointerType: 'touch',
        button: -1,
        buttons: 1,
      });
    }
  }

  function onPointerEnd(event) {
    if (isSynthetic(event) || !mode || event.pointerId !== lastPointerEvent?.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    lastPointerEvent = event;
    const currentMode = mode;
    dispatchProxy(event, event.type, {
      pointerType: currentMode === 'left' ? 'touch' : 'mouse',
      button: 0,
      buttons: 0,
    });
    mode = null;
    lastPointerEvent = null;
    guideDirector.setHeld(false);
  }

  function onWheel(event) {
    if (!isResumeActive()) return;
    guideDirector.cancelDemo();
    if (mode === 'left') {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function onContextMenu(event) {
    if (!isResumeActive()) return;
    event.preventDefault();
  }

  function onAuxClick(event) {
    if (isResumeActive() && event.button === 2) event.preventDefault();
  }

  function onBlur() {
    cancelMode();
  }

  canvas.addEventListener('pointerdown', onPointerDown, { capture: true });
  canvas.addEventListener('pointermove', onPointerMove, { capture: true });
  canvas.addEventListener('pointerup', onPointerEnd, { capture: true });
  canvas.addEventListener('pointercancel', onPointerEnd, { capture: true });
  canvas.addEventListener('wheel', onWheel, { capture: true, passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('auxclick', onAuxClick);
  window.addEventListener('blur', onBlur);

  return {
    routeChanged() {
      if (!isResumeActive()) cancelMode();
    },
    dispose() {
      cancelMode();
      canvas.removeEventListener('pointerdown', onPointerDown, true);
      canvas.removeEventListener('pointermove', onPointerMove, true);
      canvas.removeEventListener('pointerup', onPointerEnd, true);
      canvas.removeEventListener('pointercancel', onPointerEnd, true);
      canvas.removeEventListener('wheel', onWheel, true);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('auxclick', onAuxClick);
      window.removeEventListener('blur', onBlur);
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
  const inputAdapter = createResumeInputAdapter({
    stage,
    canvas,
    isResumeActive,
    guideDirector,
  });

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
      inputAdapter.routeChanged();
      clearPrompt();
      if (isResumeActive()) guideDirector.startDemo();
      else guideDirector.cancelDemo();
    },

    setReaderOpen(value) {
      readerOpen = Boolean(value);
      energy.setReaderOpen(readerOpen);
      inputAdapter.routeChanged();
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
      inputAdapter.dispose();
      guideDirector.dispose();
      energy.dispose();
    },
  };
}
