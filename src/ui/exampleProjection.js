import './exampleProjection.css';
import { createHologramBorder } from './hologramBorder.js';
import { playSound } from './audio.js';
import { getLanguage, setLanguage, onLanguageChange, t } from '../i18n.js';
import { getProject, getProjectUrl } from '../data/projects.js';
import { getProjectionViewport } from './projectionViewport.js';

export function createExampleProjection({ stage, container, onNavigate, setBrowserSuspended = () => {} }) {
  const trigger = document.getElementById('scene');
  const frame = container.closest('.frame');
  const dialog = document.createElement('dialog');
  dialog.className = 'example-projection';
  dialog.innerHTML = `<div class="example-projection__scrim" aria-hidden="true"></div><div class="example-projection__controls"><button type="button" data-example-back></button></div><p class="example-projection__status" role="status"></p><div class="example-projection__light"><div class="example-projection__screen"></div></div>`;
  document.body.append(dialog);
  const back = dialog.querySelector('[data-example-back]');
  const screen = dialog.querySelector('.example-projection__screen');
  const light = dialog.querySelector('.example-projection__light');
  const scrim = dialog.querySelector('.example-projection__scrim');
  const controls = dialog.querySelector('.example-projection__controls');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function resize() {
    const view = getProjectionViewport();
    Object.assign(light.style, { left: `${view.left}px`, top: `${view.top}px`, right: 'auto', bottom: 'auto',
      width: `${view.width + 2}px`, height: `${view.height + 2}px` });
  }
  resize(); window.addEventListener('resize', resize);
  const status = dialog.querySelector('[role=status]');
  const border = createHologramBorder(light);
  let state = 'closed', originFocus = null, iframe = null, events = null, timer = 0, ticket = 0;
  let project = getProject('systems'), separate = null, preview = null, originRect = null;
  const animations = new Set();
  function animate(element, keyframes, duration) {
    const animation = element.animate(keyframes, { duration: motion.matches ? 0 : duration, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' });
    animations.add(animation);
    return animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }
  function originTransform() {
    const view = getProjectionViewport();
    if (!originRect?.width || !originRect?.height) return 'scale(.96)';
    return `translate(${originRect.left-view.left}px, ${originRect.top-view.top}px) scale(${originRect.width/(view.width+2)}, ${originRect.height/(view.height+2)})`;
  }
  /** The page is laid out at its final size, so it can replace the still image
   *  while the projection is still expanding; input waits until it is open. */
  function revealContent() {
    if (!['opening', 'open'].includes(state) || !iframe?.dataset.ready || !iframe?.dataset.loaded) return;
    if (!iframe.dataset.revealed) {
      iframe.dataset.revealed = 'true';
      clearTimeout(timer); status.hidden = true;
      animate(iframe, [{ opacity: 0 }, { opacity: 1 }], 220);
      if (preview) animate(preview, [{ opacity: 1 }, { opacity: 0 }], 220);
    }
    if (state === 'open' && iframe.inert) {
      iframe.inert = false; iframe.tabIndex = 0;
      post('visible');
    }
  }
  const post = type => iframe?.contentWindow?.postMessage({ type: `example:${type}` }, location.origin);
  function translate() {
    dialog.setAttribute('aria-label', t(project.title));
    back.innerHTML = `<kbd>ESC</kbd><span>${t('example.back')}</span><span aria-hidden="true">↩</span>`;
    status.textContent = t('example.loading');
    if (iframe) iframe.title = t(project.title);
    if (separate) separate.textContent = t('example.separate');
  }
  translate();
  const unsubscribe = onLanguageChange(translate);
  async function close(route) {
    if (state === 'closed' || state === 'closing') return;
    const current = ++ticket;
    const transform = getComputedStyle(light).transform;
    const darkness = getComputedStyle(scrim).opacity;
    const controlOpacity = getComputedStyle(controls).opacity;
    animations.forEach(animation => animation.cancel()); animations.clear();
    state = 'closing'; dialog.dataset.state = state;
    post('pause'); iframe && (iframe.inert = true);
    clearTimeout(timer); status.hidden = true;
    events?.abort(); events = null;
    playSound('release');
    stage?.cards.setProjectHologramHidden(false);
    setBrowserSuspended(false);
    frame?.classList.remove('is-example-projected');
    await Promise.all([
      animate(light, [{ transform, opacity: 1 }, { transform: originTransform(), opacity: 0 }], 500),
      animate(scrim, [{ opacity: darkness }, { opacity: 0 }], 500),
      animate(controls, [{ opacity: controlOpacity }, { opacity: 0 }], 180),
    ]);
    if (current !== ticket) return;
    border.stop();
    iframe?.remove(); iframe = null;
    preview?.remove(); preview = null;
    await stage?.exampleFlight.close();
    stage?.setProjectionIdle(false);
    dialog.close(); state = 'closed';
    stage?.cards.setTemporaryActive(null);
    const restoredFocus = originFocus?.isConnected ? originFocus : document.querySelector(`[data-example-open][data-project-id="${project.id}"]`) || trigger;
    restoredFocus?.focus?.({ preventScroll: true });
    if (route) onNavigate(route);
  }
  async function open(source = trigger) {
    if (state !== 'closed' || document.querySelector('.frame.is-intro') || !document.querySelector('#boot.is-done')) return;
    project = getProject(source?.dataset?.projectId);
    if (!stage) { location.href = getProjectUrl(project, getLanguage()); return; }
    separate?.remove(); separate = null;
    if (project.separate) {
      separate = document.createElement('a'); separate.dataset.exampleSeparate = '';
      separate.href = project.entry(getLanguage()); separate.target = '_blank'; separate.rel = 'noopener';
      dialog.querySelector('.example-projection__controls').append(separate);
    }
    const current = ++ticket;
    originFocus = source;
    const sourcePreview = source?.closest?.('.project-wing')?.querySelector('.wing-preview') || source;
    originRect = sourcePreview?.getBoundingClientRect?.();
    light.getAnimations().forEach(animation => animation.cancel());
    scrim.getAnimations().forEach(animation => animation.cancel());
    controls.getAnimations().forEach(animation => animation.cancel());
    preview = document.createElement('img');
    preview.className = 'example-projection__preview'; preview.alt = '';
    preview.src = sourcePreview?.querySelector?.('img')?.currentSrc || project.preview(getLanguage(), getProjectionViewport().width <= 580);
    playSound('focus');
    stage.cards.setTemporaryActive('projekte');
    stage.cards.setProjectHologramHidden(true);
    setBrowserSuspended(true);
    state = 'opening'; dialog.dataset.state = state;
    status.hidden = false;
    translate();
    dialog.showModal(); back.focus({ preventScroll: true });
    events = new AbortController();
    window.addEventListener('message', event => {
      if (event.origin !== location.origin || event.source !== iframe?.contentWindow) return;
      if (event.data?.type === 'example:close') close();
      if (event.data?.type === 'example:navigate' && ['abschluss', 'lebenslauf'].includes(event.data.route)) close(event.data.route);
      if (event.data?.type === 'example:language' && ['de', 'en'].includes(event.data.language)) setLanguage(event.data.language);
      if (event.data?.type === 'example:ready') {
        iframe.dataset.ready = 'true';
        if (separate && typeof event.data.path === 'string') {
          const url = new URL(event.data.path, location.origin);
          if (url.origin === location.origin && url.pathname.startsWith('/beispiele/knallblau/')) separate.href = url.href;
        }
        revealContent();
      }
    }, { signal: events.signal });
    // Load content without moving the camera; reserve the scene underneath.
    iframe = document.createElement('iframe');
    iframe.title = t(project.title);
    iframe.src = getProjectUrl(project, getLanguage(), true);
    iframe.inert = true; iframe.tabIndex = -1;
    iframe.addEventListener('load', async () => {
      const loadedFrame = iframe;
      await loadedFrame?.contentDocument?.fonts?.ready;
      if (current !== ticket || !loadedFrame) return;
      loadedFrame.dataset.loaded = 'true';
      revealContent();
    }, { signal: events.signal });
    screen.replaceChildren(iframe, preview);
    timer = window.setTimeout(() => { status.textContent = t('example.error'); }, 12000);
    await stage.exampleFlight.open();
    if (current !== ticket) return;
    border.start();
    stage.setProjectionIdle(true);
    const expanding = animate(light, [{ transform: originTransform(), opacity: .9 }, { transform: 'none', opacity: 1 }], 760);
    animate(scrim, [{ opacity: 0 }, { opacity: 1 }], 760);
    animate(controls, [{ opacity: 0 }, { opacity: 1 }], 760);
    await expanding;
    if (current !== ticket) return;
    state = 'open'; dialog.dataset.state = state;
    frame?.classList.add('is-example-projected');
    revealContent();

  }
  function activate(event) {
    const link = event.target.closest('[data-example-open]');
    if (!link || !stage) return;
    event.preventDefault(); open(link);
  }
  function onCancel(event) { event.preventDefault(); close(); }
  function onBack() { close(); }
  function visibility() { if (state === 'open') post(document.hidden ? 'pause' : 'visible'); }
  // Escape must be handled before the portfolio router changes its route.
  function onEscape(event) {
    if (state !== 'closed' && event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); close();
    }
  }
  document.addEventListener('click', activate);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('keydown', onEscape, true);
  dialog.addEventListener('cancel', onCancel);
  back.addEventListener('click', onBack);
  return {
    open, close,
    get isOpen() { return state !== 'closed'; },
    dispose() {
      ++ticket; events?.abort(); clearTimeout(timer);
      animations.forEach(animation => animation.cancel()); animations.clear();
      document.removeEventListener('click', activate);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', resize);
      stage?.setProjectionIdle(false);
      window.removeEventListener('keydown', onEscape, true);
      dialog.removeEventListener('cancel', onCancel);
      back.removeEventListener('click', onBack);
      frame?.classList.remove('is-example-projected');
      stage?.cards.setTemporaryActive(null);
      stage?.cards.setProjectHologramHidden(false);
      setBrowserSuspended(false);
      border.dispose();
      dialog.close(); dialog.remove(); unsubscribe();
    },
  };
}
