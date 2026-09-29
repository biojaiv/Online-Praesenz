import { profileResources } from '../data/profileResources.js';
import { t, getLanguage, onLanguageChange } from '../i18n.js';
import { createSiteInspection } from './siteInspection.js';

/** Verified essentials stay accessible even when WebGL is unavailable. */
export function createProfileAccess() {
  const brief = document.createElement('span');
  brief.className = 'head__summary';
  document.querySelector('.head__brand').append(brief);
  const links = document.createElement('div');
  links.className = 'foot__contact';
  const email = document.createElement('a');
  email.href = `mailto:${profileResources().email}`;
  email.textContent = profileResources().email;
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
  links.append(availability, email, pdf, shortcuts, method);
  document.querySelector('.foot').append(links);
  const inspection = createSiteInspection(methodButton);
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
    setStage(stage) { inspection.setStage(stage); },
    inspect(source) { inspection.open(source); },
    dispose() { unsubscribe(); inspection.dispose(); brief.remove(); links.remove(); },
  };
}
