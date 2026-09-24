// HOLOGRAM_FOREGROUND_ENHANCEMENTS_V5_5_2
import { createPedestalEnergyField } from './pedestalEnergyField.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GUIDE_DEMO_STEP = 1120;
const GUIDE_DEMO_DELAY = 780;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function noopField() {
  return {
    setRoute() {},
    setReaderOpen() {},
    setCompact() {},
    setPixelRatio() {},
    pulseAll() {},
    refreshAnchors() {},
    sync() {},
    update() {},
    dispose() {},
  };
}

function safeField(label, factory) {
  try {
    return factory();
  } catch (error) {
    // An optional visual layer must never break the portfolio navigation.
    console.warn(`${label} could not be initialised:`, error);
    return noopField();
  }
}

function characterRect(element, characterIndex) {
  if (!(element instanceof Element) || characterIndex < 0) return null;
  const showText = globalThis.NodeFilter?.SHOW_TEXT ?? 4;
  const walker = document.createTreeWalker(element, showText);
  let offset = 0;
  let node = walker.nextNode();

  while (node) {
    const length = node.textContent?.length || 0;
    if (characterIndex >= offset && characterIndex < offset + length) {
      const range = document.createRange();
      const local = characterIndex - offset;
      range.setStart(node, local);
      range.setEnd(node, Math.min(length, local + 1));
      return range.getClientRects()[0] || range.getBoundingClientRect();
    }
    offset += length;
    node = walker.nextNode();
  }
  return null;
}

function createHeaderCalibrationMarker() {
  const frame = document.getElementById('frame');
  const head = document.querySelector('.head');
  const role = document.querySelector('.head__role');
  if (!(frame instanceof HTMLElement)
    || !(head instanceof HTMLElement)
    || !(role instanceof HTMLElement)) {
    return { sync() {}, dispose() {} };
  }

  // Idempotent: a delayed enhancement retry must not duplicate the marker.
  frame.querySelector('.head-calibration-marker')?.remove();
  const marker = document.createElement('div');
  marker.className = 'head-calibration-marker';
  marker.setAttribute('aria-hidden', 'true');
  marker.innerHTML = `
    <span class="head-calibration-marker__line head-calibration-marker__line--left"></span>
    <i class="head-calibration-marker__point"></i>
    <span class="head-calibration-marker__line head-calibration-marker__line--right"></span>`;
  frame.append(marker);

  let syncFrame = 0;
  let disposed = false;

  function syncNow() {
    syncFrame = 0;
    if (disposed || !frame.isConnected || !role.isConnected) return;

    const frameRect = frame.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    const roleRect = role.getBoundingClientRect();
    if (frameRect.width < 1 || headRect.height < 1 || roleRect.width < 1) {
      marker.classList.remove('is-ready');
      return;
    }

    const content = role.textContent || '';
    const lower = content.toLocaleLowerCase();
    const terms = ['systemintegration', 'systems integration', 'system integration'];
    let index = -1;
    for (const term of terms) {
      index = lower.indexOf(term);
      if (index >= 0) break;
    }

    const glyphRect = index >= 0 ? characterRect(role, index) : null;
    const frameCentre = frameRect.left + frameRect.width * 0.5;
    const targetX = glyphRect?.width
      ? glyphRect.left + glyphRect.width * 0.5
      : roleRect.right;

    // The left rail reaches the S of Systemintegration/Systems Integration.
    // The right rail uses the exact same length around the centre point.
    const edgeGuard = Math.max(34, frameRect.width * 0.035);
    const maximumHalf = Math.max(64, frameRect.width * 0.5 - edgeGuard);
    const halfWidth = clamp(
      glyphRect?.width
        ? Math.abs(frameCentre - targetX)
        : frameRect.width * 0.22,
      64,
      maximumHalf,
    );
    const top = clamp(
      headRect.bottom - frameRect.top + 4,
      58,
      frameRect.height * 0.25,
    );

    marker.style.setProperty(
      '--head-calibration-half',
      `${halfWidth.toFixed(1)}px`,
    );
    marker.style.setProperty(
      '--head-calibration-top',
      `${top.toFixed(1)}px`,
    );
    marker.classList.add('is-ready');
  }

  function sync() {
    if (disposed) return;
    cancelAnimationFrame(syncFrame);
    syncFrame = requestAnimationFrame(syncNow);
  }

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(sync)
    : null;
  resizeObserver?.observe(frame);
  resizeObserver?.observe(head);
  resizeObserver?.observe(role);

  const roleObserver = typeof MutationObserver === 'function'
    ? new MutationObserver(sync)
    : null;
  roleObserver?.observe(role, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  const frameObserver = typeof MutationObserver === 'function'
    ? new MutationObserver(sync)
    : null;
  frameObserver?.observe(frame, {
    attributes: true,
    attributeFilter: ['class'],
  });

  const fontsReady = document.fonts?.ready;
  if (fontsReady) fontsReady.then(sync).catch(() => {});
  window.addEventListener('resize', sync, { passive: true });
  sync();

  return {
    sync,
    dispose() {
      disposed = true;
      cancelAnimationFrame(syncFrame);
      resizeObserver?.disconnect();
      roleObserver?.disconnect();
      frameObserver?.disconnect();
      window.removeEventListener('resize', sync);
      marker.remove();
    },
  };
}

function decorateDollyGuide() {
  const guide = document.querySelector('.camera-dolly-guide');
  if (!(guide instanceof HTMLElement)) return null;
  const svg = guide.querySelector('svg');
  if (!(svg instanceof SVGElement)) return guide;

  const staleRightButton = svg.querySelector(
    '.camera-dolly-guide__right-button',
  );
  if (staleRightButton instanceof SVGPathElement) {
    staleRightButton.classList.remove('camera-dolly-guide__right-button');
    staleRightButton.classList.add('camera-dolly-guide__left-button');
    staleRightButton.setAttribute('d', 'M24 57A14 14 0 0 1 38 41V62H24Z');
  }

  if (!svg.querySelector('.camera-dolly-guide__sign--plus')) {
    const plus = document.createElementNS(SVG_NS, 'text');
    plus.classList.add(
      'camera-dolly-guide__sign',
      'camera-dolly-guide__sign--plus',
    );
    plus.setAttribute('x', '38');
    plus.setAttribute('y', '11');
    plus.setAttribute('text-anchor', 'middle');
    plus.textContent = '+';
    svg.append(plus);
  }

  if (!svg.querySelector('.camera-dolly-guide__sign--minus')) {
    const minus = document.createElementNS(SVG_NS, 'text');
    minus.classList.add(
      'camera-dolly-guide__sign',
      'camera-dolly-guide__sign--minus',
    );
    minus.setAttribute('x', '38');
    minus.setAttribute('y', '145');
    minus.setAttribute('text-anchor', 'middle');
    minus.textContent = '−';
    svg.append(minus);
  }

  guide.dataset.zoomControl = 'left-wheel-arrows-pinch-v5.5.2';
  return guide;
}

function createGuideDirector({ isResumeActive }) {
  const guide = decorateDollyGuide();
  const timers = new Set();
  let demoToken = 0;

  function later(callback, delay) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (document.documentElement.classList.contains('is-site-inspecting')) { later(callback, 150); return; }
      callback();
    }, delay);
    timers.add(id);
  }

  function clearTimers() {
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
  }

  function clearDemoClasses() {
    guide?.classList.remove(
      'is-demo-near',
      'is-demo-far',
      'is-demo-running',
    );
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
      if (token === demoToken) clearDemoClasses();
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
      setRoute() {},
      setReaderOpen() {},
      promptSectionChoice() {},
      dispose() {},
    };
  }

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    ?.matches ?? false;

  // Each optional layer fails open independently. A shader/driver problem in
  // one layer must not remove the other layers or break navigation.
  const energy = safeField('Pedestal energy field', () => (
    createPedestalEnergyField({
      cards: stage.cards,
      renderer: stage.renderer,
      reduced,
    })
  ));
  // The short ring jets live in cards.js. Do not add a tall particle volume.
  const calibrationMarker = safeField(
    'Header calibration marker',
    createHeaderCalibrationMarker,
  );

  let pixelRatio = stage.renderer?.getPixelRatio?.()
    || window.devicePixelRatio
    || 1;
  energy.setPixelRatio(pixelRatio);

  let route = getRoute();
  let readerOpen = isReaderOpen();
  const isResumeActive = () => (
    ['lebenslauf', 'abschluss'].includes(String(route || '').split('/')[0])
    && !readerOpen
  );
  const guideDirector = createGuideDirector({ isResumeActive });

  const nav = document.getElementById('nav');
  const frameElement = document.getElementById('frame');
  const promptTimers = new Set();
  const coarseQuery = window.matchMedia?.('(hover: none), (pointer: coarse)')
    || null;
  let compact = false;
  let qualityFrame = 0;
  let disposed = false;

  function computeCompact() {
    const width = Math.max(1, canvas.clientWidth || canvas.getBoundingClientRect().width);
    return width < 760 || (Boolean(coarseQuery?.matches) && width < 980);
  }

  function syncQualityNow() {
    qualityFrame = 0;
    if (disposed) return;
    const nextCompact = computeCompact();
    if (nextCompact !== compact) {
      compact = nextCompact;
      energy.setCompact?.(compact);
    }
    energy.refreshAnchors();
    calibrationMarker.sync();
  }

  function scheduleQualitySync() {
    if (disposed) return;
    cancelAnimationFrame(qualityFrame);
    qualityFrame = requestAnimationFrame(syncQualityNow);
  }

  function promptLater(callback, delay) {
    const timer = window.setTimeout(() => {
      promptTimers.delete(timer);
      if (disposed) return;
      if (document.documentElement.classList.contains('is-site-inspecting')) { promptLater(callback, 150); return; }
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

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(scheduleQualitySync)
    : null;
  resizeObserver?.observe(canvas);
  window.addEventListener('resize', scheduleQualitySync, { passive: true });
  if (coarseQuery?.addEventListener) {
    coarseQuery.addEventListener('change', scheduleQualitySync);
  } else {
    coarseQuery?.addListener?.(scheduleQualitySync);
  }

  let raf = 0;
  let lastFrame = performance.now();
  let elapsed = 0;
  function frame(now) {
    raf = 0;
    if (disposed) return;
    if (stage.isRenderingPaused || document.hidden || document.documentElement.classList.contains('is-site-inspecting')) {
      lastFrame = now;
      return;
    }
    raf = requestAnimationFrame(frame);
    if (now - lastFrame < 28) return;

    const delta = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    elapsed += delta;
    const nextPixelRatio = stage.renderer?.getPixelRatio?.() || pixelRatio;
    if (Math.abs(nextPixelRatio - pixelRatio) > 0.01) {
      pixelRatio = nextPixelRatio;
      energy.setPixelRatio(pixelRatio);
    }
    energy.update(elapsed, delta);
  }
  function syncRendering() {
    cancelAnimationFrame(raf); raf = 0; lastFrame = performance.now();
    if (!disposed && !stage.isRenderingPaused && !document.hidden) raf = requestAnimationFrame(frame);
  }
  canvas.addEventListener('renderpausechange', syncRendering);
  document.addEventListener('visibilitychange', syncRendering);

  const initialRoot = String(route || 'home').split('/')[0] || 'home';
  energy.setRoute(initialRoot);
  energy.setReaderOpen(readerOpen);
  scheduleQualitySync();
  if (isResumeActive()) guideDirector.startDemo();
  raf = requestAnimationFrame(frame);

  return {
    setRoute(nextRoute) {
      if (disposed) return;
      route = nextRoute || 'home';
      const root = String(route).split('/')[0] || 'home';
      energy.setRoute(root);
      calibrationMarker.sync();
      clearPrompt();
      if (isResumeActive()) guideDirector.startDemo();
      else guideDirector.cancelDemo();
    },

    setReaderOpen(value) {
      if (disposed) return;
      readerOpen = Boolean(value);
      energy.setReaderOpen(readerOpen);
      if (isResumeActive()) guideDirector.startDemo();
      else guideDirector.cancelDemo();
    },

    promptSectionChoice() {
      if (disposed) return;
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
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('renderpausechange', syncRendering);
      document.removeEventListener('visibilitychange', syncRendering);
      cancelAnimationFrame(qualityFrame);
      clearPrompt();
      guideDirector.dispose();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleQualitySync);
      if (coarseQuery?.removeEventListener) {
        coarseQuery.removeEventListener('change', scheduleQualitySync);
      } else {
        coarseQuery?.removeListener?.(scheduleQualitySync);
      }
      calibrationMarker.dispose();
      energy.dispose();
    },
  };
}
