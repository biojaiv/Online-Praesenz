import { profileResources } from '../data/profileResources.js';
import { t, getLanguage, onLanguageChange } from '../i18n.js';

/** Verified essentials stay accessible even when WebGL is unavailable. */
export function createProfileAccess() {
  const brief = document.createElement('span');
  brief.className = 'head__summary';
  document.querySelector('.head__brand').append(brief);
  const links = document.createElement('div');
  links.className = 'foot__contact';
  const pdf = document.createElement('a');
  const availability = document.createElement('span');
  const method = document.createElement('div');
  method.className = 'site-method';
  const methodButton = document.createElement('button');
  methodButton.type = 'button';
  methodButton.setAttribute('aria-controls', 'site-inspection');
  methodButton.setAttribute('aria-expanded', 'false');
  methodButton.setAttribute('aria-pressed', 'false');
  method.append(methodButton);
  const shortcuts = document.createElement('nav');
  shortcuts.className = 'info-shortcuts';
  shortcuts.innerHTML = '<a href="#kurzprofil" data-info-open="kurzprofil" data-info-focus="legacy-profile"></a><a href="#kontakt" data-info-open="kontakt" data-info-focus="legacy-contact"></a>';
  links.append(availability, pdf, shortcuts, method);
  document.querySelector('.foot').append(links);
  // The technical view is loaded on first contact or when the browser is idle,
  // keeping it off the start page's critical path.
  let inspection = null, inspectionLoading = null, stage = null, disposed = false;
  const earlyEvents = ['pointerenter', 'focus', 'click'];
  function loadInspection() {
    inspectionLoading ||= import('./siteInspection.js').then(({ createSiteInspection }) => {
      earlyEvents.forEach(type => methodButton.removeEventListener(type, early));
      if (disposed) return null;
      inspection = createSiteInspection(methodButton);
      if (stage) inspection.setStage(stage);
      return inspection;
    });
    return inspectionLoading;
  }
  function early(event) {
    loadInspection().then(view => {
      if (!view) return;
      if (event.type === 'click') view.open(methodButton);
      else if (event.type === 'pointerenter' && methodButton.matches(':hover')) methodButton.dispatchEvent(new PointerEvent('pointerenter'));
    });
  }
  earlyEvents.forEach(type => methodButton.addEventListener(type, early));
  const idle = window.requestIdleCallback || (callback => setTimeout(callback, 1200));
  if (document.readyState === 'complete') idle(loadInspection, { timeout: 6000 });
  else window.addEventListener('load', () => idle(loadInspection, { timeout: 6000 }), { once: true });
  function render() {
    brief.textContent = t('profile.summary');
    shortcuts.children[0].textContent = getLanguage() === 'de' ? '30-Sekunden-Profil' : '30-second profile';
    shortcuts.children[1].textContent = getLanguage() === 'de' ? 'Kontakt' : 'Contact';
    availability.textContent = t('profile.available');
    pdf.href = profileResources(getLanguage()).cvUrl;
    pdf.download = profileResources(getLanguage()).cvDownload;
    pdf.textContent = t('profile.pdf');
    methodButton.textContent = t('profile.method');
  }
  render(); const unsubscribe = onLanguageChange(render);
  return {
    setStage(value) { stage = value; inspection?.setStage(value); },
    inspect(source) { loadInspection().then(view => view?.open(source)); },
    dispose() { disposed = true; unsubscribe(); inspection?.dispose(); brief.remove(); links.remove(); },
  };
}
