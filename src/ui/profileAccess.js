import cv from '../data/cv.de.json';
import { t, getLanguage, onLanguageChange } from '../i18n.js';

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
  const details = document.createElement('details');
  details.className = 'site-method';
  details.innerHTML = '<summary></summary><p></p>';
  links.append(availability, email, pdf, details);
  document.querySelector('.foot').append(links);
  function render() {
    brief.textContent = t('profile.summary');
    availability.textContent = t('profile.available');
    pdf.href = `/cv/CV_${getLanguage().toUpperCase()}.pdf`;
    pdf.download = `Vladimir_Leicht_CV_${getLanguage().toUpperCase()}.pdf`;
    pdf.textContent = t('profile.pdf');
    details.querySelector('summary').textContent = t('profile.method');
    details.querySelector('p').textContent = t('profile.methodText');
  }
  render(); const unsubscribe = onLanguageChange(render);
  return { dispose() { unsubscribe(); brief.remove(); links.remove(); } };
}
