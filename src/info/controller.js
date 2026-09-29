import { getLanguage, setLanguage, onLanguageChange } from '../i18n.js';
import { profileResources } from '../data/profileResources.js';
import { createInformationViews } from './views.js';

export const INFORMATION_ROUTES = new Set(['start', 'kurzprofil', 'projekt/abschluss', 'kontakt']);
export const isInformationRoute = route => INFORMATION_ROUTES.has(route);

/** Owns information navigation/focus only. Portfolio views retain their own state. */
export function createInformationController({ root, getStage, onNavigate, onBack, onInspect, onStateChange }) {
  const views = createInformationViews({ root, getResources: () => profileResources(getLanguage()), getLanguage });
  const frame = document.getElementById('frame');
  const origins = new Map();
  let active = null, lastRoute = 'start', frameWasInert = false, initial = true;
  let focusFrame = 0;
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
  function enter(route, meta = {}) {
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
    return { handled: Boolean(next), resumed: Boolean(previous && !next && returning) };
  }
  function click(event) {
    const target = event.target.closest('[data-info-route],[data-info-close],[data-info-inspect],[data-info-language]');
    if (!target || !root.contains(target) || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target.hasAttribute('data-info-route')) { event.preventDefault(); onNavigate(target.dataset.infoRoute); }
    else if (target.hasAttribute('data-info-close')) { event.preventDefault(); returnToPrevious(); }
    else if (target.hasAttribute('data-info-language')) { event.preventDefault(); setLanguage(target.dataset.infoLanguage); }
    else if (target.hasAttribute('data-info-inspect')) { event.preventDefault(); onInspect(target); }
  }
  function keydown(event) {
    if (!active || document.documentElement.classList.contains('is-site-inspecting')) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
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
  function visibility() { if (document.hidden) views.pauseMedia(); }
  root.addEventListener('click', click);
  root.addEventListener('toggle', toggle, true);
  window.addEventListener('keydown', keydown, true);
  document.addEventListener('visibilitychange', visibility);
  const unsubscribe = onLanguageChange(() => {
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
    dispose() { unsubscribe(); cancelAnimationFrame(focusFrame); views.dispose(); root.removeEventListener('click', click);
      root.removeEventListener('toggle', toggle, true); window.removeEventListener('keydown', keydown, true);
      document.removeEventListener('visibilitychange', visibility); frame.inert = frameWasInert; },
  };
}
