import { PRIMARY, RUNES } from '../scene/runes.js';
import { SACRED_FIGURES } from '../scene/sacredGeometry.js';

// Keep the header free of overlapping triangle silhouettes as well as Algiz.
const HEADER_FIGURES = SACRED_FIGURES.filter(({ name }) =>
  !['Star Tetrahedron', 'Merkabah', 'Sri Yantra', 'Metatrons Cube'].includes(name));

const SVG_NS = 'http://www.w3.org/2000/svg';
const FIRST_DELAY_MIN = 6.0;
const FIRST_DELAY_MAX = 10.0;
const RUNE_VISIBLE_MIN = 7.0;
const RUNE_VISIBLE_MAX = 10.0;
const SACRED_VISIBLE_MIN = 9.0;
const SACRED_VISIBLE_MAX = 13.0;
// Lange Pausen: das Symbol ist ein gelegentlicher Gast, kein Dauerlaeufer.
const QUIET_MIN = 16.0;
const QUIET_MAX = 30.0;
const ARRIVAL_FLICKER_MS = 900;
const DEPARTURE_FLICKER_MS = 800;
const CENTRE_CLEARANCE = 10;
const MIN_SIZE = 30;
const MAX_SIZE = 78;
// Nur die beiden Leitfarben der Seite.
const TONES = ['cyan', 'amber', 'cyan', 'amber'];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function makePath(strokes, className) {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    strokes
      .map(([x1, y1, x2, y2]) => `M${x1},${-y1}L${x2},${-y2}`)
      .join(''),
  );
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  path.setAttribute('shape-rendering', 'geometricPrecision');
  path.classList.add('head-symbol__path', className);
  return path;
}

function makeSvg(strokes, { kind, label = '' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '-1.18 -1.18 2.36 2.36');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('head-symbol__glyph', `head-symbol__glyph--${kind}`);
  if (label) svg.dataset.symbol = label;

  const rotor = document.createElementNS(SVG_NS, 'g');
  rotor.classList.add('head-symbol__rotor');
  rotor.append(
    makePath(strokes, 'head-symbol__path--halo'),
    makePath(strokes, 'head-symbol__path--core'),
  );
  svg.append(rotor);
  return svg;
}

export function startHeaderSymbols({ header = document.querySelector('.head') } = {}) {
  if (!(header instanceof HTMLElement)) return () => {};

  let host = header.querySelector('.head__symbol-stage');
  if (!host) {
    host = document.createElement('div');
    host.className = 'head__symbol-stage';
    host.setAttribute('aria-hidden', 'true');
    header.append(host);
  }

  const brand = header.querySelector('.head__brand');
  const nav = header.querySelector('.nav');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = 0;
  let effectTimer = 0;
  let stopped = false;
  let nextKind = 'sacred';
  let toneCursor = Math.floor(Math.random() * TONES.length);
  let runeCursor = Math.floor(Math.random() * PRIMARY.length);
  let sacredCursor = Math.floor(Math.random() * HEADER_FIGURES.length);

  function schedule(fn, seconds) {
    window.clearTimeout(timer);
    timer = window.setTimeout(fn, Math.max(0, seconds) * 1000);
  }

  function clearEffectTimer() {
    window.clearTimeout(effectTimer);
    effectTimer = 0;
  }

  function fitHost() {
    if (!(brand instanceof HTMLElement) || !(nav instanceof HTMLElement)) return true;
    if (getComputedStyle(host).display === 'none') return false;

    const headerRect = header.getBoundingClientRect();
    const brandRect = brand.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const centre = headerRect.left + headerRect.width * 0.5;
    const leftRoom = centre - brandRect.right - CENTRE_CLEARANCE;
    const rightRoom = navRect.left - centre - CENTRE_CLEARANCE;
    const gapSize = Math.min(leftRoom, rightRoom) * 2;

    // The glyph itself never exceeds the visible header height.
    const verticalSize = Math.max(0, headerRect.height - 12);
    const size = Math.floor(Math.min(MAX_SIZE, gapSize, verticalSize));

    if (size < MIN_SIZE) return false;
    host.style.setProperty('--head-symbol-size', `${size}px`);
    return true;
  }

  function pickNext() {
    if (nextKind === 'rune') {
      const key = PRIMARY[runeCursor % PRIMARY.length];
      runeCursor = (runeCursor + 1 + Math.floor(Math.random() * 2)) % PRIMARY.length;
      const rune = RUNES[key];
      nextKind = 'sacred';
      return {
        kind: 'rune',
        glyph: makeSvg(rune.strokes, { kind: 'rune', label: rune.name }),
      };
    }

    const figure = HEADER_FIGURES[sacredCursor % HEADER_FIGURES.length];
    sacredCursor = (sacredCursor + 1 + Math.floor(Math.random() * 3))
      % HEADER_FIGURES.length;
    nextKind = 'rune';
    return {
      kind: 'sacred',
      glyph: makeSvg(figure.strokes, {
        kind: 'sacred',
        label: figure.name,
      }),
    };
  }

  function finishHide() {
    if (stopped) return;
    host.classList.remove('is-visible', 'is-leaving', 'is-arriving');
    schedule(show, randomBetween(QUIET_MIN, QUIET_MAX));
  }

  function hide() {
    if (stopped) return;
    clearEffectTimer();
    if (reduced) {
      finishHide();
      return;
    }
    host.classList.remove('is-arriving');
    host.classList.add('is-leaving');
    effectTimer = window.setTimeout(finishHide, DEPARTURE_FLICKER_MS);
  }

  function show() {
    if (stopped) return;
    if (
      document.hidden
      || header.closest('.frame')?.classList.contains('is-intro')
      || !fitHost()
    ) {
      schedule(show, 1.6);
      return;
    }

    const { kind, glyph } = pickNext();

    glyph.style.setProperty(
      '--head-symbol-period',
      kind === 'sacred'
        ? `${randomBetween(7.5, 11.5).toFixed(2)}s`
        : `${randomBetween(6.5, 9.5).toFixed(2)}s`,
    );

    host.replaceChildren(glyph);
    host.dataset.kind = kind;
    host.dataset.tone = TONES[toneCursor % TONES.length];
    toneCursor = (toneCursor + 1) % TONES.length;

    host.classList.remove('is-visible', 'is-arriving', 'is-leaving');
    requestAnimationFrame(() => {
      if (stopped || !fitHost()) return;
      host.classList.add('is-visible');
      if (!reduced) {
        host.classList.add('is-arriving');
        clearEffectTimer();
        effectTimer = window.setTimeout(() => {
          host.classList.remove('is-arriving');
        }, ARRIVAL_FLICKER_MS);
      }
    });

    const visible = kind === 'sacred'
      ? randomBetween(SACRED_VISIBLE_MIN, SACRED_VISIBLE_MAX)
      : randomBetween(RUNE_VISIBLE_MIN, RUNE_VISIBLE_MAX);
    schedule(hide, visible);
  }

  function reconcileLayout() {
    if (!fitHost()) {
      clearEffectTimer();
      host.classList.remove('is-visible', 'is-arriving', 'is-leaving');
    }
  }

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(reconcileLayout)
    : null;
  resizeObserver?.observe(header);
  if (brand instanceof HTMLElement) resizeObserver?.observe(brand);
  if (nav instanceof HTMLElement) resizeObserver?.observe(nav);
  window.addEventListener('resize', reconcileLayout, { passive: true });

  fitHost();
  schedule(show, randomBetween(FIRST_DELAY_MIN, FIRST_DELAY_MAX));

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    clearEffectTimer();
    resizeObserver?.disconnect();
    window.removeEventListener('resize', reconcileLayout);
    host.classList.remove('is-visible', 'is-arriving', 'is-leaving');
    host.replaceChildren();
    host.remove();
  };
}

