import { getLanguage, setLanguage, onLanguageChange } from '../i18n.js';
import { profileResources } from '../data/profileResources.js';
import { createInformationViews } from './views.js';
import { playSound } from '../ui/audio.js';

export const INFORMATION_ROUTES = new Set(['start', 'kurzprofil', 'projekt/abschluss', 'kontakt']);
export const isInformationRoute = route => INFORMATION_ROUTES.has(route);

/** Owns information navigation/focus only. Portfolio views retain their own state. */
export function createInformationController({ root, getStage, onNavigate, onBack, onInspect, onStateChange }) {
  const views = createInformationViews({ root, getResources: () => profileResources(getLanguage()), getLanguage });
  const frame = document.getElementById('frame');
  const origins = new Map();
  let active = null, lastRoute = 'start', frameWasInert = false, initial = true;
  let focusFrame = 0;
  let exploreRun = null, exploreCommitted = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const translatedDisclosures = new WeakSet();
  const section = () => [...root.querySelectorAll('[data-info-page]')].find(node => node.dataset.infoPage === active);
  function focusLater(callback) { cancelAnimationFrame(focusFrame); focusFrame = requestAnimationFrame(callback); }
  function termKey(detail) { return detail.dataset.infoTerm || detail.id || detail.querySelector('summary')?.textContent.trim(); }
  function syncTerms(state) {
    const key = state?.infoTermView === active ? state.infoTerm : null;
    for (const detail of root.querySelectorAll('details')) {
      const wasOpen = detail.open;
      detail.open = termKey(detail) === key;
      if (wasOpen && !detail.open) detail.querySelector('summary')?.focus({ preventScroll: true });
    }
  }
  function returnToPrevious() {
    const origin = origins.get(active);
    onBack(origin?.route || 'start');
  }
  function cancelExplore() {
    if (!exploreRun) return;
    exploreRun = null;
    views.cancelExploreExit();
    getStage()?.cancelInformationExit();
  }
  function commitExplore() { exploreCommitted = true; onNavigate('home'); }
  async function explore() {
    if (exploreRun) return;
    clearSceneHover();
    playSound('focus');
    if (motion.matches) { commitExplore(); return; }
    const ticket = {};
    exploreRun = ticket;
    const identityArrived = await views.animateExploreExit();
    if (exploreRun !== ticket) return;
    const cameraArrived = identityArrived && await (getStage()?.animateInformationExit(1250) ?? Promise.resolve(true));
    if (exploreRun !== ticket) return;
    exploreRun = null;
    if (identityArrived && cameraArrived) commitExplore();
    else { views.cancelExploreExit(); getStage()?.cancelInformationExit(); }
  }
  function motionChange() {
    if (motion.matches && exploreRun) { cancelExplore(); commitExplore(); }
  }
  function enter(route, meta = {}) {
    clearSceneHover();
    cancelExplore();
    const explored = exploreCommitted && route === 'home';
    exploreCommitted = false;
    const previous = active;
    const next = isInformationRoute(route) ? route : null;
    const returning = Boolean(meta.history);
    if (next && next !== active && !returning) {
      const source = document.activeElement;
      origins.set(next, { route: initial ? 'start' : lastRoute, element: source,
        key: source?.dataset?.infoFocus });
    }
    if (next && !previous) {
      frameWasInert = frame.inert;
      frame.inert = true;
      frame.querySelectorAll('video,audio').forEach(media => media.pause());
    }
    if (previous && previous !== next) views.pauseMedia();
    active = next;
    if (next) document.documentElement.dataset.infoView = next;
    else delete document.documentElement.dataset.infoView;
    views.show(next);
    getStage()?.setInformationView(next);
    if (!next && previous) frame.inert = frameWasInert;
    onStateChange(next);
    if (returning && previous && origins.get(previous)?.route === route) {
      const origin = origins.get(previous);
      focusLater(() => {
        const target = origin.element?.isConnected ? origin.element
          : [...document.querySelectorAll('[data-info-focus]')].find(node => node.dataset.infoFocus === origin.key);
        if (target && !target.closest('[hidden],[inert]')) target.focus({ preventScroll: true });
        else if (next) views.focusEntry(next);
      });
    } else if (next && (!initial || next !== 'start')) focusLater(() => views.focusEntry(next));
    if (next) syncTerms(history.state);
    lastRoute = route;
    initial = false;
    return { handled: Boolean(next), explored, resumed: Boolean(previous && !next && returning) };
  }
  function sceneSection(event) {
    if (active !== 'start' || exploreRun || document.documentElement.classList.contains('is-site-inspecting')
      || event.target.closest('.info-start__copy,.info-topline,.info-start__footer')) return null;
    return getStage()?.pickInformationSection(event.clientX, event.clientY);
  }
  function clearSceneHover() { delete root.dataset.infoSceneHover; }
  function pointermove(event) {
    if (sceneSection(event)) root.dataset.infoSceneHover = 'true';
    else clearSceneHover();
  }
  function click(event) {
    if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (sceneSection(event)) { event.preventDefault(); explore(); return; }
    const target = event.target.closest('[data-info-route],[data-info-close],[data-info-inspect],[data-info-language]');
    if (!target || !root.contains(target) || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target.hasAttribute('data-info-route')) {
      event.preventDefault();
      if (active === 'start' && target.dataset.infoFocus === 'start-explore') explore();
      else onNavigate(target.dataset.infoRoute);
    }
    else if (target.hasAttribute('data-info-close')) { event.preventDefault(); returnToPrevious(); }
    else if (target.hasAttribute('data-info-language')) { event.preventDefault(); setLanguage(target.dataset.infoLanguage); }
    else if (target.hasAttribute('data-info-inspect')) { event.preventDefault(); onInspect(target); }
  }
  function keydown(event) {
    if (!active || document.documentElement.classList.contains('is-site-inspecting')) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (exploreRun) { cancelExplore(); root.querySelector('[data-info-focus="start-explore"]')?.focus(); return; }
      if (history.state?.infoTermView === active && history.state.infoTerm) onBack(active);
      else if (!views.closeDisclosure()) returnToPrevious();
    } else if (event.key === 'Tab' && active === 'kurzprofil') {
      const controls = [...section().querySelectorAll('a[href],button,summary,[tabindex="0"],video[controls]')]
        .filter(node => !node.disabled && node.getClientRects().length && !node.closest('[inert],[hidden]'));
      const index = controls.indexOf(document.activeElement);
      if (!controls.length) return;
      if (event.shiftKey && index <= 0) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && (index === controls.length - 1 || index < 0)) { event.preventDefault(); controls[0].focus(); }
    }
  }
  function toggle(event) {
    const detail = event.target;
    if (!(detail instanceof HTMLDetailsElement) || !detail.isConnected || !section()?.contains(detail)) return;
    if (translatedDisclosures.has(detail)) { translatedDisclosures.delete(detail); return; }
    const key = termKey(detail);
    if (detail.open && history.state?.infoTerm !== key) {
      history.pushState({ ...history.state, portfolio: true, previous: history.state?.previous || active, infoTerm: key, infoTermView: active }, '', location.href);
    } else if (!detail.open && history.state?.infoTerm === key) onBack(active);
  }
  function visibility() { if (document.hidden) { cancelExplore(); views.pauseMedia(); } }
  function resize() { cancelExplore(); }
  motion.addEventListener('change', motionChange);
  root.addEventListener('click', click);
  root.addEventListener('pointermove', pointermove, { passive: true });
  root.addEventListener('pointerleave', clearSceneHover);
  root.addEventListener('toggle', toggle, true);
  window.addEventListener('keydown', keydown, true);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', visibility);
  const unsubscribe = onLanguageChange(() => {
    cancelExplore();
    views.translate();
    // Restoring open details after translation must not add navigation steps.
    root.querySelectorAll('details[open]').forEach(detail => translatedDisclosures.add(detail));
  });
  views.translate();
  document.documentElement.classList.add('info-enhanced');
  return {
    enter,
    get active() { return active; },
    onHistory(state, route) { if (route !== lastRoute) return false; syncTerms(state); return true; },
    dispose() { cancelExplore(); motion.removeEventListener('change', motionChange); unsubscribe(); cancelAnimationFrame(focusFrame); views.dispose(); root.removeEventListener('click', click);
      root.removeEventListener('pointermove', pointermove); root.removeEventListener('pointerleave', clearSceneHover); clearSceneHover();
      root.removeEventListener('toggle', toggle, true); window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility); frame.inert = frameWasInert; },
  };
}
