import gsap from 'gsap';
import * as THREE from 'three';
import { t, onLanguageChange } from '../i18n.js';
import './siteInspection.css';

const ANNOTATIONS = [
  { key: 'space', target: 'background', side: 'left', slot: 0 },
  { key: 'camera', target: 'abschluss', side: 'left', slot: 1 },
  { key: 'access', target: 'zoom-cue', side: 'right', slot: 2 },
  { key: 'language', target: '#language-switch', side: 'right', slot: 0 },
  { key: 'html', target: 'html', side: 'right', slot: 1 },
  { key: 'delivery', target: '.foot__contact a[download]', side: 'left', slot: 2 },
];
const ORRERY_REFERENCE_URL = new URL('../../Elemente/Orrery/orrery-source.png', import.meta.url).href;
const SVG_NS = 'http://www.w3.org/2000/svg';
const MIN_LEADER = 156;
const LEADER_CLEARANCE = 40;
const LEADER_RADIUS = 7;

function leaderPath(input) {
  const points = input.filter((point, i) => i === 0 || point[0] !== input[i - 1][0] || point[1] !== input[i - 1][1]);
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const [cx, cy] = points[i + 1];
    const r = Math.min(LEADER_RADIUS, Math.hypot(bx - ax, by - ay) / 2, Math.hypot(cx - bx, cy - by) / 2);
    d += ` L${bx - Math.sign(bx - ax) * r},${by - Math.sign(by - ay) * r} Q${bx},${by} ${bx + Math.sign(cx - bx) * r},${by + Math.sign(cy - by) * r}`;
  }
  const last = points[points.length - 1];
  return points.length > 1 ? `${d} L${last[0]},${last[1]}` : d;
}
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
    <svg class="site-inspection__diagram" aria-hidden="true"></svg>
    <div class="site-inspection__zoom-cue" aria-hidden="true"><kbd>↑</kbd><span>ZOOM</span><kbd>↓</kbd></div>
    <nav class="site-inspection__tabs"></nav><div class="site-inspection__notes"></div>`;
  document.body.append(overlay);
  const title = overlay.querySelector('h2');
  const status = overlay.querySelector('#site-inspection-status');
  const close = overlay.querySelector('.site-inspection__close');
  const diagram = overlay.querySelector('svg');
  const zoomCue = overlay.querySelector('.site-inspection__zoom-cue');
  const notes = overlay.querySelector('.site-inspection__notes');
  const tabs = overlay.querySelector('.site-inspection__tabs');
  const cards = ANNOTATIONS.map(({ key, side, slot }, index) => {
    const number = String(index + 1).padStart(2, '0');
    const card = document.createElement('article');
    card.className = 'site-inspection__note';
    card.id = `site-inspection-${key}`;
    card.dataset.side = side;
    card.innerHTML = `<span class="site-inspection__symbol" aria-hidden="true"><svg viewBox="0 0 24 24">${SYMBOLS[key]}</svg></span><div class="site-inspection__copy"><span class="site-inspection__number" aria-hidden="true">${number}</span><h3></h3><p></p></div>`;
    if (key === 'space') {
      const detail = document.createElement('figure');
      detail.className = 'site-inspection__background-detail';
      detail.innerHTML = '<img width="1024" height="1024" loading="lazy" alt=""><figcaption></figcaption>';
      detail.querySelector('img').src = ORRERY_REFERENCE_URL;
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
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', '3.5');
    const orbit = document.createElementNS(SVG_NS, 'circle');
    orbit.setAttribute('r', '8');
    orbit.classList.add('site-inspection__orbit');
    group.append(path, orbit, dot);
    group.dataset.topic = key;
    diagram.append(group);
    return { key, side, slot, card, tab, group, path, dot, orbit };
  });

  let sourceControl = trigger;
  let stage = null, visible = false, pinned = false, selected = 0, updateFrame = 0;
  let timelineWasPaused = false;
  let pausedAnimations = [], playingMedia = [], inertElements = [];
  const point = new THREE.Vector3();
  let backgroundAnchor = null;
  let zoomTarget = null;
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
    if (target === 'zoom-cue') {
      if (zoomTarget && zoomTarget.parentElement === zoomCue) {
        // This synthetic cue is absolutely positioned and translated by half
        // its size. Use its freshly assigned layout coordinates: transformed
        // client bounds can lag a viewport change in the software fallback.
        return {
          x: parseFloat(zoomCue.style.left) - zoomCue.offsetWidth / 2 + zoomTarget.offsetLeft + zoomTarget.offsetWidth / 2,
          y: parseFloat(zoomCue.style.top) - zoomCue.offsetHeight / 2 + zoomTarget.offsetTop + zoomTarget.offsetHeight / 2,
        };
      }
      return elementAnchor(zoomTarget);
    }
    if (target === 'html') {
      const content = [...document.querySelectorAll('.cv-reader:not([hidden]), #ihk-reader:not([hidden]), .projects-panel')]
        .find(element => element.getClientRects().length);
      if (content) {
        const rect = content.getBoundingClientRect();
        const notes = cards[3].card.getBoundingClientRect();
        // Meet the reader at its edge instead of striking through its text.
        if (!cards[3].card.hidden && rect.right < notes.left - 24) return { x: rect.right, y: rect.top + rect.height / 2 };
        return elementAnchor(content);
      }
      // Document projections are HTML-derived; meet the nearest visible one at its edge.
      const notes = cards[3].card.getBoundingClientRect();
      for (const key of ['lebenslauf', 'abschluss']) {
        const sheet = stage?.cards.group.getObjectByName(`card-${key}`)?.getObjectByName('resumeProjection');
        let shown = Boolean(sheet?.geometry);
        for (let parent = sheet; shown && parent; parent = parent.parent) shown = parent.visible;
        if (!shown) continue;
        sheet.updateWorldMatrix(true, false);
        sheet.geometry.computeBoundingBox();
        const { min, max } = sheet.geometry.boundingBox;
        const r = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
        for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
          point.set(x, y, z).applyMatrix4(sheet.matrixWorld).project(stage.camera);
          if (point.z >= 1) continue;
          const sx = sceneRect.left + (point.x + 1) * sceneRect.width / 2;
          const sy = sceneRect.top + (1 - point.y) * sceneRect.height / 2;
          r.left = Math.min(r.left, sx); r.right = Math.max(r.right, sx);
          r.top = Math.min(r.top, sy); r.bottom = Math.max(r.bottom, sy);
        }
        if (!Number.isFinite(r.left) || r.left > notes.left - 60 || r.right < sceneRect.left + 60) continue;
        return { x: Math.min(r.right, notes.left - 72),
          y: clamp((r.top + r.bottom) / 2, sceneRect.top + 80, sceneRect.bottom - 80) };
      }
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
      // The pedestal note falls back to whichever pedestal the current view shows.
      const keys = target === 'abschluss' ? ['abschluss', 'projekte', 'lebenslauf'] : [target];
      for (const key of keys) {
        const holder = stage.cards.group.getObjectByName(`card-${key}`);
        if (!holder?.visible) continue;
        holder.updateWorldMatrix(true, false);
        holder.localToWorld(point.set(0, target === 'abschluss' ? -5.25 : 0, 0)).project(stage.camera);
        if (point.z < 1 && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1) {
          const found = { x: sceneRect.left + (point.x + 1) * sceneRect.width / 2,
            y: sceneRect.top + (1 - point.y) * sceneRect.height / 2 };
          const covered = keys.length > 1 && cards.some(({ card }) => {
            if (card.hidden) return false;
            const r = card.getBoundingClientRect();
            return found.x > r.left - 16 && found.x < r.right + 16 && found.y > r.top - 16 && found.y < r.bottom + 16;
          });
          if (!covered) return found;
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
    const note = cards[0].card;
    if (overlay.dataset.compact !== 'true' && !note.hidden && note.getClientRects().length) {
      // Prefer free background close to the note so its leader stays short.
      const r = note.getBoundingClientRect();
      const px = r.right + 90, py = (r.top + r.bottom) / 2;
      candidates.sort((a, b) => Math.hypot(a.x - px, (a.y - py) * 1.6) - Math.hypot(b.x - px, (b.y - py) * 1.6));
    } else {
      candidates.sort((a, b) => (a.ndc.x + .22) ** 2 + (a.ndc.y - .1) ** 2 - (b.ndc.x + .22) ** 2 - (b.ndc.y - .1) ** 2);
    }
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
    const foot = document.querySelector('.foot').getBoundingClientRect();
    const bottom = foot.top - 12;
    overlay.style.setProperty('--inspection-footer-inset', `${innerHeight - foot.top}px`);
    // Reuse the real control in an open document. Home and reader views get a
    // static example without changing the frozen page's footer layout.
    zoomTarget = [...document.querySelectorAll('.foot__tools .cv-keyboard-zoom-hint kbd, .foot__tools .cv-mobile-zoom__button')]
      .find(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
    zoomCue.hidden = Boolean(zoomTarget);
    const mobileFooter = innerWidth <= 600;
    const cuePosition = document.querySelector(mobileFooter ? '.foot__crumb' : '.foot__tools').getBoundingClientRect();
    zoomCue.style.left = `${mobileFooter ? foot.right - 58 : cuePosition.left + cuePosition.width / 2}px`;
    zoomCue.style.top = `${cuePosition.top + cuePosition.height / 2}px`;
    zoomCue.querySelectorAll('kbd')[0].textContent = mobileFooter ? '+' : '↑';
    zoomCue.querySelectorAll('kbd')[1].textContent = mobileFooter ? '−' : '↓';
    zoomTarget ||= zoomCue.querySelector('kbd');
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
    const columns = ['left', 'right'].map(side => cards.filter(card => card.side === side).sort((a, b) => a.slot - b.slot));
    function sizeNotes() { cards.forEach(({ card, tab, side }, index) => {
      card.hidden = compact && index !== selected;
      tab.setAttribute('aria-pressed', String(index === selected));
      card.style.left = compact || side === 'left' ? `${bounds.left + 16}px` : 'auto';
      card.style.right = !compact && side === 'right' ? `${innerWidth - bounds.right + 16}px` : 'auto';
      card.style.width = `${compact ? bounds.width - 32 : Math.min(300, bounds.width * .24)}px`;
    }); }
    sizeNotes();
    const notesTop = scene.top + 72;
    if (!compact && columns.some(column =>
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
      for (const column of columns) {
        const height = column.reduce((sum, { card }) => sum + card.offsetHeight, 0);
        const gap = Math.max(8, (bottom - top - height) / 2);
        let y = top;
        column.forEach(({ card }) => { card.style.top = `${y}px`; y += card.offsetHeight + gap; });
      }
    }
    markBackground(scene);
    const footPart = selector => {
      const element = document.querySelector(selector);
      return element?.getClientRects().length ? element.getBoundingClientRect() : null;
    };
    const tools = footPart('.foot__tools');
    const contact = footPart('.foot__contact');
    // The breadcrumb grid can span the whole footer even when only a short
    // label occupies its left edge. Route around visible text/controls, not
    // that empty grid area, otherwise Delivery makes a full-width U-turn.
    const crumbElement = document.querySelector('.foot__crumb');
    const crumbRects = [];
    if (crumbElement?.getClientRects().length) {
      const walker = document.createTreeWalker(crumbElement, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(walker.currentNode);
        crumbRects.push(...range.getClientRects());
      }
      crumbElement.querySelectorAll('button,a').forEach(control => crumbRects.push(...control.getClientRects()));
    }
    const crumb = crumbRects.length ? {
      left: Math.min(...crumbRects.map(r => r.left)), right: Math.max(...crumbRects.map(r => r.right)),
      top: Math.min(...crumbRects.map(r => r.top)), bottom: Math.max(...crumbRects.map(r => r.bottom)),
    } : null;
    cards.forEach(({ key, side, card, group, path, dot, orbit }, index) => {
      const source = card.hidden ? null : anchor(ANNOTATIONS[index].target);
      group.style.display = source ? '' : 'none';
      if (!source) return;
      // Notes live in an untransformed, viewport-sized absolute layer. Keep
      // the coordinates assigned above authoritative for this same layout
      // pass, rather than mixing fresh sizing with a previous client position.
      const width = card.offsetWidth, height = card.offsetHeight;
      const left = card.style.left !== 'auto' ? parseFloat(card.style.left)
        : innerWidth - parseFloat(card.style.right) - width;
      const top = parseFloat(card.style.top);
      const rect = { left, top, right: left + width, bottom: top + height, width, height };
      const rx = value => Math.round(value);
      const outward = side === 'left' ? 1 : -1;
      const edge = rx(outward > 0 ? rect.right : rect.left);
      let tx = rx(source.x);
      let ty = rx(source.y);
      if (side === 'right' && !['language', 'delivery', 'access'].includes(key) && tx > rect.left - 24 && ty > rect.top - 12 && ty < rect.bottom + 12) {
        // A target hidden behind its own note is shown just beside the note.
        tx = rx(rect.left - 72);
        ty = rx(clamp(ty, rect.top + 20, rect.bottom - 20));
      }
      const beside = outward > 0 ? tx >= edge - 4 : tx <= edge + 4;
      const y0 = rx(clamp(ty, rect.top + 20, rect.bottom - 20));
      const dx = Math.abs(tx - edge);
      const dy = Math.abs(ty - y0);
      const inside = ty >= rect.top && ty <= rect.bottom;
      let points;
      let markerX = tx;
      let markerY = ty;
      const midX = rx((rect.left + rect.right) / 2);
      if (key === 'delivery' && tools && contact && contact.top - tools.bottom >= 6 && ty > rect.bottom) {
        // Both layout sides use the open corridor between the footer rows.
        const occupiedBottom = crumb && crumb.bottom < contact.top ? Math.max(tools.bottom, crumb.bottom) : tools.bottom;
        const corridor = rx((occupiedBottom + contact.top) / 2);
        const aboveFooter = rx(bottom + 6);
        let x = outward > 0 ? rect.right + 16 : rect.left - 16;
        // Separate labels can sit at opposite ends of a full-width crumb.
        // Only a label intersecting this particular descent is an obstacle;
        // their union would incorrectly turn the empty centre into a wall.
        const occupied = [...crumbRects].sort((a, b) => outward > 0 ? a.left - b.left : b.right - a.right);
        for (const item of occupied) {
          if (item.bottom <= Math.min(aboveFooter, corridor) || item.top >= Math.max(aboveFooter, corridor)) continue;
          if (x < item.left - 12 || x > item.right + 12) continue;
          x = outward > 0 ? item.right + 12 : item.left - 12;
        }
        x = rx(clamp(x, 8, innerWidth - 8));
        const escapeX = rx(clamp(edge + outward * 16, 8, innerWidth - 8));
        points = [[edge, y0], [escapeX, y0], [escapeX, aboveFooter], [x, aboveFooter], [x, corridor], [tx, corridor], [tx, ty]];
      } else if (key === 'delivery' || key === 'access') {
        // These are exact functional targets, never extend their endpoints to
        // satisfy the decorative minimum leader length used by scene notes.
        // Cross below both columns so the swapped right-hand Access note
        // cannot strike through the Delivery note on its way to a left cue.
        const corridor = rx(Math.min(ty, bottom + 6));
        const x = rx(clamp(edge + outward * 16, 8, innerWidth - 8));
        points = [[edge, y0], [x, y0], [x, corridor], [tx, corridor], [tx, ty]];
      } else if (side === 'left') {
        if (dx >= LEADER_CLEARANCE || inside) {
          points = [[edge, y0], [tx, y0], [tx, ty]];
        } else {
          const x = rx(clamp(tx, rect.left + 24, rect.right - 24));
          points = [[x, rx(ty > rect.bottom ? rect.bottom : rect.top)], [x, ty], [tx, ty]];
        }
      } else if (key === 'language') {
        points = [[midX, rx(rect.top)], [midX, ty], [tx, ty]];
      } else if (beside && dx >= 8 && dy > 6) {
        const vert = Math.max(dy, MIN_LEADER - dx);
        points = [[edge, y0], [tx, y0], [tx, rx(y0 + Math.sign(ty - y0) * vert)]];
      } else if (beside) {
        const run = Math.max(dx, MIN_LEADER);
        const x1 = rx(edge + outward * run);
        points = [[edge, y0], [x1, y0]];
        if (run > dx + 6) { markerX = x1; markerY = y0; }
      } else {
        const yEdge = rx(ty < rect.top ? rect.top : rect.bottom);
        const near = rx(Math.abs(tx - rect.left) <= Math.abs(tx - rect.right) ? rect.left : rect.right);
        const run = Math.abs(tx - near);
        const vert = Math.abs(ty - yEdge);
        if (vert > 6) {
          const y1 = rx(yEdge + Math.sign(ty - yEdge) * Math.max(vert, MIN_LEADER - run));
          points = [[near, yEdge], [tx, yEdge], [tx, y1]];
        } else {
          const x1 = rx(near + Math.sign(tx - near || outward) * Math.max(run, MIN_LEADER));
          points = [[near, yEdge], [x1, yEdge]];
          if (Math.abs(x1 - tx) > 6) { markerX = x1; markerY = yEdge; }
        }
      }
      const d = leaderPath(points);
      path.setAttribute('d', d);
      dot.setAttribute('cx', markerX); dot.setAttribute('cy', markerY);
      orbit.setAttribute('cx', markerX); orbit.setAttribute('cy', markerY);
    });
  }
  function queueLayout() { if (!updateFrame) updateFrame = requestAnimationFrame(layout); }
  function show() {
    if (visible || frame.classList.contains('is-intro') || (!document.querySelector('#boot.is-done') && !document.documentElement.dataset.infoView)) return;
    visible = true;
    selected = 0;
    overlay.querySelector('.site-inspection__background-detail').hidden = Boolean(stage);
    stage?.setInspectionFrozen(true);
    timelineWasPaused = gsap.globalTimeline.paused();
    gsap.globalTimeline.pause();
    pausedAnimations = document.getAnimations().filter(animation => frame.contains(animation.effect?.target) && animation.playState === 'running');
    pausedAnimations.forEach(animation => animation.pause());
    playingMedia = [...document.querySelectorAll('#frame video, #frame audio, #information-layer video')].filter(media => !media.paused && !media.ended);
    playingMedia.forEach(media => media.pause());
    // Disable the underlying page while keeping the original footer trigger available.
    for (let node = trigger; node && node !== frame; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node && !sibling.inert) { inertElements.push(sibling); sibling.inert = true; }
      }
    }
    const information = document.getElementById('information-layer');
    if (information && !information.inert) { inertElements.push(information); information.inert = true; }
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
    if (focus) {
      // Restore focus after the underlying layer becomes interactive again.
      const source = sourceControl;
      requestAnimationFrame(() => { if (!visible && source.isConnected) source.focus({ preventScroll: true }); });
    }
  }
  function enter(event) { sourceControl = trigger; if (event.pointerType === 'mouse') show(); }
  function leave() { if (!pinned) hide(); }
  function click(event) {
    if (event?.currentTarget === trigger) sourceControl = trigger;
    if (pinned) { hide(); return; }
    show();
    if (!visible) return;
    pinned = true;
    trigger.setAttribute('aria-pressed', 'true');
    overlay.classList.add('is-pinned');
    renderText();
    if (sourceControl !== trigger) close.focus({ preventScroll: true });
  }
  function closePanel() { hide({ focus: true }); }
  function keydown(event) {
    if (!visible) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); closePanel();
    } else if (event.key === 'Tab') {
      if (!pinned) { hide(); return; }
      const controls = [sourceControl, ...tabs.children, close].filter(element => element.getClientRects().length && !element.closest('[inert]') && getComputedStyle(element).visibility !== 'hidden');
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
    open(source = trigger) { sourceControl = source; click(); },
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
