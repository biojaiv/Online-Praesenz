import { renderInformationMarkup } from './markup.js';

/** DOM-only view adapter. History, scene state and modal focus ownership stay in the controller. */
export function createInformationViews({ root, getResources, getLanguage }) {
  let activeView = null;
  let backdropView = null;
  let disclosureOrder = [];
  const section = view => [...root.querySelectorAll('[data-info-page]')].find(node => node.dataset.infoPage === view);
  const keyed = key => [...root.querySelectorAll('[data-info-focus]')].find(node => node.dataset.infoFocus === key);
  const onToggle = event => {
    const key = event.target.dataset?.infoTerm;
    if (!key) return;
    disclosureOrder = disclosureOrder.filter(item => item !== key);
    if (event.target.open) disclosureOrder.push(key);
  };
  root.addEventListener('toggle', onToggle, true);

  function pauseMedia() {
    root.querySelectorAll('video').forEach(video => video.pause());
  }

  function applyVisibility() {
    root.hidden = !activeView;
    root.dataset.view = activeView || '';
    root.querySelectorAll('[data-info-page]').forEach(node => {
      const isActive = node.dataset.infoPage === activeView;
      const isBackdrop = activeView === 'kurzprofil' && node.dataset.infoPage === backdropView;
      node.hidden = !isActive && !isBackdrop;
      node.classList.toggle('info-page--behind', isBackdrop);
      node.inert = isBackdrop;
      if (isBackdrop) node.setAttribute('aria-hidden', 'true');
      else node.removeAttribute('aria-hidden');
      if (node.dataset.infoPage === 'kurzprofil' && isActive) {
        node.setAttribute('role', 'dialog');
        node.setAttribute('aria-modal', 'true');
      } else {
        node.removeAttribute('role');
        node.removeAttribute('aria-modal');
      }
    });
  }

  function show(view) {
    if (view !== activeView) pauseMedia();
    if (view === 'kurzprofil' && activeView !== 'kurzprofil') backdropView = activeView;
    if (view !== 'kurzprofil') backdropView = null;
    activeView = view;
    applyVisibility();
  }

  function translate() {
    const focusKey = root.contains(document.activeElement) ? document.activeElement.dataset.infoFocus : null;
    const entryFocused = root.contains(document.activeElement) && document.activeElement.hasAttribute('data-info-entry');
    const openTerms = [...root.querySelectorAll('details[open]')].map(node => node.dataset.infoTerm);
    const scroll = [...root.querySelectorAll('[data-info-page], .info-profile__sheet')].map(node => ({ key: node.dataset.infoPage || 'sheet', top: node.scrollTop, left: node.scrollLeft }));
    const rootScroll = root.scrollTop;
    pauseMedia();
    root.innerHTML = renderInformationMarkup(getLanguage(), getResources());
    openTerms.forEach(key => root.querySelector(`[data-info-term="${key}"]`)?.setAttribute('open', ''));
    applyVisibility();
    scroll.forEach(({ key, top, left }) => {
      const node = key === 'sheet' ? root.querySelector('.info-profile__sheet') : section(key);
      node?.scrollTo({ top, left, behavior: 'instant' });
    });
    root.scrollTop = rootScroll;
    if (focusKey) keyed(focusKey)?.focus({ preventScroll: true });
    else if (entryFocused) focusEntry(activeView);
  }

  function closeDisclosure() {
    const open = [...(section(activeView)?.querySelectorAll('details[open]') || [])];
    const last = open.find(node => node.dataset.infoTerm === disclosureOrder.at(-1)) || open.at(-1);
    if (!last) return false;
    last.open = false;
    last.querySelector('summary')?.focus({ preventScroll: true });
    return true;
  }

  function focusEntry(view) {
    section(view)?.querySelector('[data-info-entry]')?.focus({ preventScroll: true });
  }

  return {
    show, translate, pauseMedia, closeDisclosure, focusEntry,
    get activeSection() { return section(activeView); },
    get activeElement() { return section(activeView); },
    dispose() { pauseMedia(); root.removeEventListener('toggle', onToggle, true); },
  };
}
