import './exampleProjection.css';
import { createHologramBorder } from './hologramBorder.js';
import { createPortalRim } from './portalRim.js';
import { playSound } from './audio.js';
import { getLanguage, setLanguage, onLanguageChange, t } from '../i18n.js';
import { getProject, getProjectUrl } from '../data/projects.js';
import { getProjectionViewport } from './projectionViewport.js';

export function createExampleProjection({ stage, container, onNavigate, setBrowserSuspended = () => {} }) {
  const trigger = document.getElementById('scene');
  const frame = container.closest('.frame');
  const dialog = document.createElement('dialog');
  dialog.className = 'example-projection';
  dialog.innerHTML = `<div class="example-projection__scrim" aria-hidden="true"></div><div class="example-projection__controls"><button type="button" data-example-start hidden></button><button type="button" data-example-back></button></div><p class="example-projection__status" role="status"></p><div class="example-projection__light"><div class="example-projection__screen"></div><div class="example-projection__scan" aria-hidden="true"></div></div>`;
  document.body.append(dialog);
  const back = dialog.querySelector('[data-example-back]');
  const start = dialog.querySelector('[data-example-start]');
  const screen = dialog.querySelector('.example-projection__screen');
  const light = dialog.querySelector('.example-projection__light');
  const scrim = dialog.querySelector('.example-projection__scrim');
  const controls = dialog.querySelector('.example-projection__controls');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let portal = null;
  let rim = null;
  function placeLight(rect, radius = 0) {
    Object.assign(light.style, { left: `${rect.left}px`, top: `${rect.top}px`, right: 'auto', bottom: 'auto',
      width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: radius ? `${radius}px` : '' });
    // Inside a rounded aperture the page moves in until its corners sit on the arc,
    // so no edge of the page is cut off; the margin carries the portal rim.
    const inset = radius ? Math.round(radius * (1 - Math.SQRT1_2) + 8) : 0;
    light.style.setProperty('--portal-inset', `${inset}px`);
    if (radius) rim?.setGeometry({ radius, inset });
    fitPage(radius ? { width: rect.width - inset * 2, height: rect.height - inset * 2 } : null);
    return inset;
  }
  // Pages are laid out at a desktop size and scaled into the portal, like a
  // projection, instead of collapsing into a cramped responsive layout.
  const PAGE_MIN = { width: 1200, height: 780 };
  let pageFit = null;
  function fitPage(box = pageFit) {
    pageFit = box;
    if (!iframe) return;
    if (!box) { Object.assign(iframe.style, { width: '', height: '', transform: '', transformOrigin: '' }); return; }
    const scale = Math.min(1, box.width / PAGE_MIN.width, box.height / PAGE_MIN.height);
    Object.assign(iframe.style, { width: `${box.width / scale}px`, height: `${box.height / scale}px`,
      transform: scale < 1 ? `scale(${scale})` : '', transformOrigin: '0 0' });
  }
  function resize() {
    const view = getProjectionViewport();
    if (portal && state !== 'closing') {
      const rect = stage?.relayoutPortal(portal, view);
      if (rect) { placeLight(rect, rect.radius); return; }
    }
    placeLight({ ...view, width: view.width + 2, height: view.height + 2 });
  }
  window.addEventListener('resize', resize);
  const status = dialog.querySelector('[role=status]');
  const border = createHologramBorder(light);
  rim = createPortalRim(light);
  let state = 'closed', originFocus = null, iframe = null, events = null, timer = 0, ticket = 0;
  let project = getProject('systems'), separate = null, preview = null, originRect = null;
  let resolveOpeningContent = null;
  resize();
  const animations = new Set();
  function animate(element, keyframes, duration, easing = 'cubic-bezier(.22, 1, .36, 1)') {
    const animation = element.animate(keyframes, { duration: motion.matches ? 0 : duration, easing, fill: 'forwards' });
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
    // PASSUNG opens the rendered page at its final layout size. A cropped
    // gallery screenshot has a different model scale on shorter viewports.
    if (project.id === 'passung' && state === 'opening') {
      resolveOpeningContent?.();
      resolveOpeningContent = null;
      return;
    }
    if (!iframe.dataset.revealed) {
      iframe.dataset.revealed = 'true';
      clearTimeout(timer); status.hidden = true;
      if (project.id === 'passung') {
        iframe.style.opacity = '1';
      } else {
        animate(iframe, [{ opacity: 0 }, { opacity: 1 }], 220);
        if (preview) animate(preview, [{ opacity: 1 }, { opacity: 0 }], 220);
      }
    }
    if (state === 'open' && iframe.inert) {
      iframe.inert = false; iframe.tabIndex = 0;
      post('visible');
    }
  }
  const post = type => iframe?.contentWindow?.postMessage({ type: `example:${type}` }, location.origin);
  function translate() {
    dialog.setAttribute('aria-label', t(project.title));
    const tiefgang = project.id === 'systems', german = getLanguage() === 'de';
    start.hidden = !tiefgang;
    start.textContent = `${german ? 'Tiefgang-Start' : 'Tiefgang start'} ↶`;
    back.innerHTML = `<kbd>ESC</kbd><span>${tiefgang ? (german ? 'Zum Hologramm' : 'Back to hologram') : t('example.back')}</span><span aria-hidden="true">↩</span>`;
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
    const lightOpacity = getComputedStyle(light).opacity;
    const darkness = getComputedStyle(scrim).opacity;
    const controlOpacity = getComputedStyle(controls).opacity;
    animations.forEach(animation => animation.cancel()); animations.clear();
    state = 'closing'; dialog.dataset.state = state;
    resolveOpeningContent?.(); resolveOpeningContent = null;
    delete dialog.dataset.awaitingContent;
    post('pause'); iframe && (iframe.inert = true);
    clearTimeout(timer); status.hidden = true;
    events?.abort(); events = null;
    playSound(portal ? 'powerdown' : 'release');
    stage?.cards.setProjectHologramHidden(false);
    const portalId = portal;
    if (!portalId) setBrowserSuspended(false);
    frame?.classList.remove('is-example-projected');
    await Promise.all([
      portalId
        ? animate(light, [{ clipPath: 'circle(100% at 50% 50%)', opacity: lightOpacity }, { clipPath: 'circle(0% at 50% 50%)', opacity: 0 }], 520, 'cubic-bezier(.6, 0, .8, .4)')
        : animate(light, [{ transform, opacity: lightOpacity }, { transform: originTransform(), opacity: 0 }], 500),
      animate(scrim, [{ opacity: darkness }, { opacity: 0 }], 500),
      animate(controls, [{ opacity: controlOpacity }, { opacity: 0 }], 180),
    ]);
    if (current !== ticket) return;
    border.stop(); rim.stop();
    iframe?.remove(); iframe = null;
    preview?.remove(); preview = null;
    if (portalId) {
      await stage?.closePortal(portalId);
      frame?.classList.remove('is-portal-stage');
      portal = null; delete dialog.dataset.portal;
      setBrowserSuspended(false);
      resize();
    } else await stage?.exampleFlight.close();
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
    // Desktop with motion: fly to the project's portal machine and open it there.
    portal = stage.portals?.has(project.id) && !motion.matches && innerWidth > 600 ? project.id : null;
    if (portal) dialog.dataset.portal = project.id; else delete dialog.dataset.portal;
    stage.portals?.setHover(null);
    const liveOpening = !portal && project.id === 'passung';
    const contentReady = liveOpening ? new Promise(resolve => { resolveOpeningContent = resolve; }) : Promise.resolve();
    originFocus = source;
    const sourcePreview = source?.closest?.('[data-project-card]')?.querySelector('img') || source?.closest?.('.project-wing')?.querySelector('.wing-preview') || source;
    originRect = sourcePreview?.getBoundingClientRect?.();
    light.getAnimations().forEach(animation => animation.cancel());
    scrim.getAnimations().forEach(animation => animation.cancel());
    controls.getAnimations().forEach(animation => animation.cancel());
    if (!liveOpening && !portal) {
      preview = document.createElement('img');
      preview.className = 'example-projection__preview'; preview.alt = '';
      preview.src = sourcePreview?.currentSrc || sourcePreview?.querySelector?.('img')?.currentSrc || project.preview(getLanguage(), getProjectionViewport().width <= 580);
    }
    playSound(portal ? 'charge' : 'focus');
    stage.cards.setTemporaryActive('projekte');
    if (portal) setBrowserSuspended(true);
    else if (!liveOpening) {
      stage.cards.setProjectHologramHidden(true);
      setBrowserSuspended(true);
    }
    state = 'opening'; dialog.dataset.state = state;
    if (liveOpening) dialog.dataset.awaitingContent = 'true';
    status.hidden = false;
    translate();
    dialog.showModal(); back.focus({ preventScroll: true });
    if (liveOpening || portal) animate(controls, [{ opacity: 0 }, { opacity: 1 }], 180);
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
    screen.replaceChildren(iframe, ...(preview ? [preview] : []));
    pageFit = null; fitPage();
    timer = window.setTimeout(() => { status.textContent = t('example.error'); playSound('warn', { queue: false }); }, 12000);
    if (portal) {
      light.style.opacity = '0';
      // The header and footer step aside: the canvas takes the whole window so the
      // frame can be large without its top edge being cut off.
      frame?.classList.add('is-portal-stage');
      for (let i = 0; i < 3; i++) await new Promise(resolve => requestAnimationFrame(resolve));
      if (current !== ticket) return;
      const rect = await stage.openPortal(portal, getProjectionViewport(), { onUnfold: () => playSound('unfold', { queue: false }) });
      if (current !== ticket) return;
      const inset = rect ? placeLight(rect, rect.radius) : 0;
      light.style.opacity = '';
      // No projection idle here: the Orrery keeps moving around the frame.
      rim.start({ radius: rect?.radius, inset, accent: stage.portals.accent(portal) });
      await animate(light, [{ clipPath: 'circle(0% at 50% 50%)', opacity: .4 }, { clipPath: 'circle(100% at 50% 50%)', opacity: 1 }], 900);
      if (current !== ticket) return;
      state = 'open'; dialog.dataset.state = state;
      frame?.classList.add('is-example-projected');
      revealContent();
      return;
    }
    await Promise.all([stage.exampleFlight.open(), contentReady]);
    if (current !== ticket) return;
    if (liveOpening) {
      clearTimeout(timer); status.hidden = true;
      delete dialog.dataset.awaitingContent;
      iframe.style.opacity = '1'; iframe.dataset.revealed = 'true';
      stage.cards.setProjectHologramHidden(true);
      setBrowserSuspended(true);
    }
    border.start();
    stage.setProjectionIdle(true);
    const expanding = animate(light, [{ transform: originTransform(), opacity: .9 }, { transform: 'none', opacity: 1 }], 760);
    animate(scrim, [{ opacity: 0 }, { opacity: 1 }], 760);
    animate(controls, [{ opacity: getComputedStyle(controls).opacity }, { opacity: 1 }], 760);
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
  function onStart() {
    if (project.id === 'systems' && state === 'open' && iframe) iframe.src = getProjectUrl(project, getLanguage(), true);
  }
  function visibility() { if (state === 'open') post(document.hidden ? 'pause' : 'visible'); }
  // Escape must be handled before the portfolio router changes its route.
  function onEscape(event) {
    if (state !== 'closed' && event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); close();
    }
  }
  // Hovering or focusing a project entry lights its portal machine in the background.
  function hoverPortal(event) {
    if (state !== 'closed') return;
    const link = event.target.closest?.('[data-example-open]');
    const leaving = event.type === 'pointerout' || event.type === 'focusout';
    if (leaving) {
      if (link && !link.contains(event.relatedTarget)) stage?.portals?.setHover(null);
    } else if (link) stage?.portals?.setHover(link.dataset.projectId);
  }
  ['pointerover', 'pointerout', 'focusin', 'focusout'].forEach(type => document.addEventListener(type, hoverPortal));
  document.addEventListener('click', activate);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('keydown', onEscape, true);
  dialog.addEventListener('cancel', onCancel);
  back.addEventListener('click', onBack);
  start.addEventListener('click', onStart);
  return {
    open, close,
    get isOpen() { return state !== 'closed'; },
    dispose() {
      ++ticket; events?.abort(); clearTimeout(timer);
      resolveOpeningContent?.(); resolveOpeningContent = null;
      animations.forEach(animation => animation.cancel()); animations.clear();
      document.removeEventListener('click', activate);
      ['pointerover', 'pointerout', 'focusin', 'focusout'].forEach(type => document.removeEventListener(type, hoverPortal));
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', resize);
      stage?.setProjectionIdle(false);
      window.removeEventListener('keydown', onEscape, true);
      dialog.removeEventListener('cancel', onCancel);
      back.removeEventListener('click', onBack);
      start.removeEventListener('click', onStart);
      frame?.classList.remove('is-example-projected', 'is-portal-stage');
      stage?.cards.setTemporaryActive(null);
      stage?.cards.setProjectHologramHidden(false);
      setBrowserSuspended(false);
      border.dispose(); rim.dispose();
      dialog.close(); dialog.remove(); unsubscribe();
    },
  };
}
