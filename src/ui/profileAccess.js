import cv from '../data/cv.de.json';
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
  email.href = `mailto:${cv.persoenlich.kontakt}`;
  email.textContent = cv.persoenlich.kontakt;
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
  links.append(availability, email, pdf, method);
  document.querySelector('.foot').append(links);
  const inspection = createSiteInspection(methodButton);
  function render() {
    brief.textContent = t('profile.summary');
    availability.textContent = t('profile.available');
    pdf.href = `/cv/CV_${getLanguage().toUpperCase()}.pdf`;
    pdf.download = `Vladimir_Leicht_CV_${getLanguage().toUpperCase()}.pdf`;
    pdf.textContent = t('profile.pdf');
    methodButton.textContent = t('profile.method');
  }
  render(); const unsubscribe = onLanguageChange(render);
  return {
    setStage(stage) { inspection.setStage(stage); },
    dispose() { unsubscribe(); inspection.dispose(); brief.remove(); links.remove(); },
  };
}
