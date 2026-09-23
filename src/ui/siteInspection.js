import gsap from 'gsap';
import * as THREE from 'three';
import { t, onLanguageChange } from '../i18n.js';
import './siteInspection.css';

const ANNOTATIONS = [
  { key: 'space', target: 'background' },
  { key: 'camera', target: 'abschluss' },
  { key: 'access', target: '.foot__hint' },
  { key: 'language', target: '#language-switch' },
  { key: 'html', target: 'html' },
  { key: 'delivery', target: '.foot__contact a[download]' },
];
const SVG_NS = 'http://www.w3.org/2000/svg';
// Fine outline symbols echo the reader headings and the navigation's orbital dials.
const SYMBOLS = {
  space: '<circle cx="12" cy="12" r="7"/><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-35 12 12)"/>',
  camera: '<ellipse cx="12" cy="6" rx="9" ry="3"/><path d="M3 6v12c0 4 18 4 18 0V6M3 12c0 4 18 4 18 0"/>',
  access: '<circle cx="12" cy="4" r="2"/><path d="M4 9l8 2 8-2M12 11v5m-5 6 5-6 5 6"/>',
  language: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  html: '<path d="M8 6l-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  delivery: '<path d="M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10m-5-8 3 3 6-6"/>',
};
const compactQuery = '(max-width: 900px), (max-height: 690px)';

/** Inspect the current view without advancing the scene, media or UI animations. */
export function createSiteInspection(trigger) {
  const frame = document.getElementById('frame');
  const overlay = document.createElement('section');
  overlay.className = 'site-inspection';
  overlay.id = 'site-inspection';
  overlay.hidden = true;
  overlay.setAttribute('aria-labelledby', 'site-inspection-title');
  overlay.innerHTML = `<div class="site-inspection__wash" aria-hidden="true"></div>
    <header class="site-inspection__toolbar">
      <div><h2 id="site-inspection-title"></h2><p id="site-inspection-status"></p></div>
    </header>
    <button class="site-inspection__close" type="button"><kbd>ESC</kbd><span></span><i aria-hidden="true">↩</i></button>
    <svg class="site-inspection__diagram" aria-hidden="true"><defs>
      <marker id="site-inspection-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M 1 1 L 9 5 L 1 9" />
      </marker>
    </defs></svg>
    <nav class="site-inspection__tabs"></nav><div class="site-inspection__notes"></div>`;
  document.body.append(overlay);
  const title = overlay.querySelector('h2');
  const status = overlay.querySelector('#site-inspection-status');
  const close = overlay.querySelector('.site-inspection__close');
  const diagram = overlay.querySelector('svg');
  const notes = overlay.querySelector('.site-inspection__notes');
  const tabs = overlay.querySelector('.site-inspection__tabs');
  const cards = ANNOTATIONS.map(({ key }, index) => {
    const number = String(index + 1).padStart(2, '0');
    const card = document.createElement('article');
    card.className = 'site-inspection__note';
    card.id = `site-inspection-${key}`;
    card.dataset.side = index < 3 ? 'left' : 'right';
    card.innerHTML = `<span class="site-inspection__symbol" aria-hidden="true"><svg viewBox="0 0 24 24">${SYMBOLS[key]}</svg></span><div class="site-inspection__copy"><span class="site-inspection__number" aria-hidden="true">${number}</span><h3></h3><p></p></div>`;
    if (key === 'space') {
      const detail = document.createElement('figure');
      detail.className = 'site-inspection__background-detail';
      detail.innerHTML = '<img src="/inspection/orrery-detail.webp" width="640" height="220" loading="lazy" alt=""><figcaption></figcaption>';
      card.querySelector('h3').after(detail);
    }
    notes.append(card);
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.textContent = number;
    tab.setAttribute('aria-controls', card.id);
    tab.addEventListener('click', () => { selected = index; layout(); });
    tabs.append(tab);
    const group = document.createElementNS(SVG_NS, 'g');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('marker-end', 'url(#site-inspection-arrow)');
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', '3');
    const orbit = document.createElementNS(SVG_NS, 'circle');
    orbit.setAttribute('r', '7');
    orbit.classList.add('site-inspection__orbit');
    group.append(path, orbit, dot);
    group.dataset.topic = key;
    diagram.append(group);
    return { key, card, tab, group, path, dot, orbit };
  });

  let stage = null, visible = false, pinned = false, selected = 0, updateFrame = 0;
  let timelineWasPaused = false;
  let pausedAnimations = [], playingMedia = [], inertElements = [];
  const point = new THREE.Vector3();
  let backgroundAnchor = null;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  function renderText() {
    title.textContent = t('profile.method');
    status.textContent = t(pinned ? 'profile.methodPinned' : 'profile.methodHint');
    close.querySelector('span').textContent = t('profile.methodClose');
    close.setAttribute('aria-label', t('profile.methodClose'));
    tabs.setAttribute('aria-label', t('profile.methodTopics'));
    for (const { card, key, tab } of cards) {
      card.querySelector('h3').textContent = t(`profile.method.${key}.title`);
      card.querySelector('p').textContent = t(`profile.method.${key}.text`);
      tab.setAttribute('aria-label', t(`profile.method.${key}.title`));
    }
    const detail = overlay.querySelector('.site-inspection__background-detail');
    detail.querySelector('img').alt = t('profile.method.backgroundAlt');
    detail.querySelector('figcaption').textContent = t('profile.method.backgroundCaption');
    if (visible) { cancelAnimationFrame(updateFrame); layout(); }
  }
  function elementAnchor(element) {
    if (!element?.getClientRects().length) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  function anchor(target) {
    const sceneRect = document.getElementById('stage').getBoundingClientRect();
    if (target === 'background') return backgroundAnchor;
    if (target === 'html') {
      const content = [...document.querySelectorAll('.cv-reader:not([hidden]), #ihk-reader:not([hidden]), .projects-panel')]
        .find(element => element.getClientRects().length);
      if (content) return elementAnchor(content);
      target = 'lebenslauf';
    }
    if (target === '#language-switch') {
      const control = document.querySelector(target);
      if (!control?.getClientRects().length) return null;
      const rect = control.getBoundingClientRect();
      // Leave from below the control, never through navigation text.
      return { x: rect.left + rect.width / 2, y: rect.bottom + 9 };
    }
    if (target.startsWith('.') || target.startsWith('#')) return elementAnchor(document.querySelector(target));
    if (target !== 'space' && stage) {
      const holder = stage.cards.group.getObjectByName(`card-${target}`);
      if (holder?.visible) {
        holder.updateWorldMatrix(true, false);
        holder.localToWorld(point.set(0, target === 'abschluss' ? -5.25 : 0, 0)).project(stage.camera);
        if (point.z < 1 && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1) {
          return { x: sceneRect.left + (point.x + 1) * sceneRect.width / 2,
            y: sceneRect.top + (1 - point.y) * sceneRect.height / 2 };
        }
      }
    }
    return { x: sceneRect.left + sceneRect.width * .5, y: sceneRect.top + sceneRect.height * .18 };
  }
  function markBackground(scene) {
    backgroundAnchor = null;
    if (!stage?.background.getInspectionCandidates) return;
    const blocked = [...cards.map(({ card }) => card), overlay.querySelector('.site-inspection__toolbar'), close,
      ...document.querySelectorAll('.cv-hologram')]
      .filter(element => element.getClientRects().length).map(element => element.getBoundingClientRect());
    stage.cards.group.updateWorldMatrix(true, true);
    // Particle jets are displaced in their vertex shader, so mesh raycasts
    // cannot detect them. Exclude their projected envelopes explicitly.
    stage.cards.group.traverse(object => {
      const u = object.material?.uniforms;
      if (!object.isPoints || !u?.uEndY) return;
      for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return;
      const radius = u.uRadius.value + u.uSpread.value + .2;
      const r = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
      const p = new THREE.Vector3();
      for (const x of [-radius, radius]) for (const y of [u.uOriginY.value, u.uEndY.value]) for (const z of [-radius, radius]) {
        p.set(x, y, z).applyMatrix4(object.matrixWorld).project(stage.camera);
        if (p.z < -1 || p.z > 1) continue;
        const sx = scene.left + (p.x + 1) * scene.width / 2, sy = scene.top + (1 - p.y) * scene.height / 2;
        r.left = Math.min(r.left, sx); r.right = Math.max(r.right, sx);
        r.top = Math.min(r.top, sy); r.bottom = Math.max(r.bottom, sy);
      }
      if (Number.isFinite(r.left)) blocked.push(r);
    });
    const footerTop = document.querySelector('.foot').getBoundingClientRect().top;
    const candidates = stage.background.getInspectionCandidates(stage.camera).map(candidate => ({ ...candidate,
      x: scene.left + (candidate.ndc.x + 1) * scene.width / 2,
      y: scene.top + (1 - candidate.ndc.y) * scene.height / 2,
    })).filter(p => p.y > scene.top + 72 && p.y < footerTop - 20 &&
      !blocked.some(r => p.x > r.left - 16 && p.x < r.right + 16 && p.y > r.top - 16 && p.y < r.bottom + 16));
    candidates.sort((a, b) => (a.ndc.x + .22) ** 2 + (a.ndc.y - .1) ** 2 - (b.ndc.x + .22) ** 2 - (b.ndc.y - .1) ** 2);
    const foreground = [];
    stage.cards.group.traverse(object => {
      if (!object.isMesh) return;
      for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return;
      foreground.push(object);
    });
    const ray = new THREE.Raycaster();
    const tested = new Set();
    let chosen = null;
    for (const candidate of candidates) {
      const cell = `${Math.round(candidate.x / 18)}:${Math.round(candidate.y / 18)}`;
      if (tested.has(cell)) continue;
      tested.add(cell);
      if (tested.size > 160) break;
      ray.setFromCamera(candidate.ndc, stage.camera);
      const hit = ray.intersectObjects(foreground, false)[0];
      if (!hit || hit.distance > stage.camera.position.distanceTo(candidate.world)) { chosen = candidate; break; }
    }
    if (chosen) {
      const radius = chosen.depth * Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2)) * 110 / scene.height;
      stage.background.setInspectionPoint(chosen.world, radius);
      backgroundAnchor = { x: chosen.x, y: chosen.y };
    } else {
      stage.background.setInspectionPoint(null);
      const detail = overlay.querySelector('.site-inspection__background-detail');
      if (detail.hidden) { detail.hidden = false; queueLayout(); }
    }
    overlay.dataset.backgroundAnchor = chosen ? 'scene' : 'unavailable';
    stage.setInspectionFrozen(true);
  }
  function layout() {
    updateFrame = 0;
    if (!visible) return;
    let compact = matchMedia(compactQuery).matches;
    const bounds = frame.getBoundingClientRect();
    const scene = document.getElementById('stage').getBoundingClientRect();
    const bottom = document.querySelector('.foot').getBoundingClientRect().top - 12;
    overlay.dataset.compact = String(compact);
    overlay.style.setProperty('--inspection-left', `${bounds.left + 16}px`);
    overlay.style.setProperty('--inspection-width', `${bounds.width - 32}px`);
    overlay.style.setProperty('--inspection-top', `${clamp(scene.top + 8, 12, innerHeight * .25)}px`);
    const header = document.querySelector('.head').getBoundingClientRect();
    const headerCentre = header.left + header.width / 2;
    const brand = document.querySelector('.head__brand').getBoundingClientRect();
    const nav = document.querySelector('.nav').getBoundingClientRect();
    // The geometry occupies the header centre. Use the toolbar on narrow screens,
    // where the geometry itself is hidden and the header has no free central slot.
    const inHeader = innerWidth > 860 && Math.min(headerCentre - brand.right, nav.left - headerCentre) >= 70;
    overlay.dataset.closePosition = inHeader ? 'header' : 'toolbar';
    close.style.left = `${inHeader ? headerCentre : bounds.right - 16}px`;
    close.style.top = `${inHeader ? header.top + header.height / 2 : clamp(scene.top + 8, 12, innerHeight * .25)}px`;
    diagram.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    function sizeNotes() { cards.forEach(({ card, tab }, index) => {
      card.hidden = compact && index !== selected;
      tab.setAttribute('aria-pressed', String(index === selected));
      card.style.left = compact || index < 3 ? `${bounds.left + 16}px` : 'auto';
      card.style.right = !compact && index >= 3 ? `${innerWidth - bounds.right + 16}px` : 'auto';
      card.style.width = `${compact ? bounds.width - 32 : Math.min(300, bounds.width * .24)}px`;
    }); }
    sizeNotes();
    const notesTop = scene.top + 72;
    if (!compact && [cards.slice(0, 3), cards.slice(3)].some(column =>
      column.reduce((sum, { card }) => sum + card.offsetHeight, 16) > bottom - notesTop)) {
      compact = true;
      overlay.dataset.compact = 'true';
      sizeNotes();
    }
    if (compact) {
      const card = cards[selected].card;
      const top = Math.max(scene.top + 116, bottom - card.offsetHeight);
      card.style.top = `${top}px`;
      tabs.style.top = `${top - 46}px`;
    } else {
      const top = notesTop;
      // Each column uses its actual content height; the background sample must
      // not inflate all six slots or push the footer explanations off screen.
      for (const column of [cards.slice(0, 3), cards.slice(3)]) {
        const height = column.reduce((sum, { card }) => sum + card.offsetHeight, 0);
        const gap = Math.max(8, (bottom - top - height) / 2);
        let y = top;
        column.forEach(({ card }) => { card.style.top = `${y}px`; y += card.offsetHeight + gap; });
      }
    }
    markBackground(scene);
    cards.forEach(({ card, group, path, dot, orbit }, index) => {
      const source = card.hidden ? null : anchor(ANNOTATIONS[index].target);
      group.style.display = source ? '' : 'none';
      if (!source) return;
      const rect = card.getBoundingClientRect();
      const footerTarget = ['access', 'delivery'].includes(ANNOTATIONS[index].key);
      let end, bend;
      if (compact) {
        end = { x: clamp(source.x, rect.left + 28, rect.right - 28),
          y: source.y > rect.bottom ? rect.bottom + 5 : rect.top - 5 };
        bend = { x: end.x, y: (source.y + end.y) / 2 };
      } else if (footerTarget) {
        // Footer explanations enter from below their cards. Sharing the inner
        // vertical lane with the camera connection would merge unrelated lines.
        end = { x: clamp(source.x, rect.left + 28, rect.right - 28), y: rect.bottom + 5 };
        bend = { x: end.x, y: source.y };
      } else {
        end = { x: index < 3 ? rect.right + 5 : rect.left - 5, y: rect.top + 26 };
        bend = { x: end.x + (index < 3 ? 21 : -21), y: source.y };
      }
      const language = ANNOTATIONS[index].key === 'language';
      const belowHeader = Math.max(header.bottom + 8, source.y + 8);
      const gutter = compact ? bounds.right - 8 : bend.x;
      path.setAttribute('d', language
        ? `M${source.x},${source.y} V${belowHeader} H${gutter} V${end.y} H${end.x}`
        : compact
        ? `M${source.x},${source.y} L${bend.x},${bend.y} L${end.x},${end.y}`
        : `M${source.x},${source.y} L${bend.x},${bend.y} L${bend.x},${end.y} L${end.x},${end.y}`);
      dot.setAttribute('cx', source.x); dot.setAttribute('cy', source.y);
      orbit.setAttribute('cx', source.x); orbit.setAttribute('cy', source.y);
    });
  }
  function queueLayout() { if (!updateFrame) updateFrame = requestAnimationFrame(layout); }
  function show() {
    if (visible || frame.classList.contains('is-intro') || !document.querySelector('#boot.is-done')) return;
    visible = true;
    selected = 0;
    overlay.querySelector('.site-inspection__background-detail').hidden = Boolean(stage);
    stage?.setInspectionFrozen(true);
    timelineWasPaused = gsap.globalTimeline.paused();
    gsap.globalTimeline.pause();
    pausedAnimations = document.getAnimations().filter(animation => frame.contains(animation.effect?.target) && animation.playState === 'running');
    pausedAnimations.forEach(animation => animation.pause());
    playingMedia = [...frame.querySelectorAll('video, audio')].filter(media => !media.paused && !media.ended);
    playingMedia.forEach(media => media.pause());
    // Disable the underlying page while keeping the original footer trigger available.
    for (let node = trigger; node && node !== frame; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node && !sibling.inert) { inertElements.push(sibling); sibling.inert = true; }
      }
    }
    document.documentElement.classList.add('is-site-inspecting');
    overlay.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    renderText();
  }
  function hide({ focus = false } = {}) {
    if (!visible) return;
    visible = false; pinned = false;
    cancelAnimationFrame(updateFrame); updateFrame = 0;
    overlay.hidden = true;
    overlay.classList.remove('is-pinned');
    document.documentElement.classList.remove('is-site-inspecting');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-pressed', 'false');
    inertElements.forEach(element => { element.inert = false; }); inertElements = [];
    pausedAnimations.forEach(animation => { if (animation.playState === 'paused') animation.play(); }); pausedAnimations = [];
    if (!timelineWasPaused) gsap.globalTimeline.resume();
    stage?.background.setInspectionPoint(null);
    backgroundAnchor = null;
    stage?.setInspectionFrozen(false);
    playingMedia.forEach(media => { if (media.isConnected) media.play().catch(() => {}); }); playingMedia = [];
    if (focus) trigger.focus({ preventScroll: true });
  }
  function enter(event) { if (event.pointerType === 'mouse') show(); }
  function leave() { if (!pinned) hide(); }
  function click() {
    if (pinned) { hide(); return; }
    show();
    if (!visible) return;
    pinned = true;
    trigger.setAttribute('aria-pressed', 'true');
    overlay.classList.add('is-pinned');
    renderText();
  }
  function closePanel() { hide({ focus: true }); }
  function keydown(event) {
    if (!visible) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); closePanel();
    } else if (event.key === 'Tab') {
      if (!pinned) { hide(); return; }
      const controls = [trigger, ...[...tabs.children].filter(element => element.getClientRects().length), close];
      const index = controls.indexOf(document.activeElement);
      const next = (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      event.preventDefault(); event.stopImmediatePropagation(); controls[next].focus();
    } else if (!['Enter', ' '].includes(event.key)) {
      event.stopImmediatePropagation();
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) event.preventDefault();
    }
  }
  function wheel(event) { event.preventDefault(); event.stopPropagation(); }
  function onResize() { if (visible) queueLayout(); }
  trigger.addEventListener('pointerenter', enter);
  trigger.addEventListener('pointerleave', leave);
  trigger.addEventListener('click', click);
  close.addEventListener('click', closePanel);
  overlay.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', keydown, true);
  const unsubscribe = onLanguageChange(renderText);
  renderText();
  return {
    setStage(value) { stage = value; if (visible) stage?.setInspectionFrozen(true); },
    dispose() {
      hide(); unsubscribe();
      trigger.removeEventListener('pointerenter', enter);
      trigger.removeEventListener('pointerleave', leave);
      trigger.removeEventListener('click', click);
      close.removeEventListener('click', closePanel);
      overlay.removeEventListener('wheel', wheel);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', keydown, true);
      overlay.remove();
    },
  };
}
