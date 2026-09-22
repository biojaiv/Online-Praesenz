import { getLanguage, onLanguageChange, t } from '../i18n.js';

/** Locally exported, portrait-free CV PDFs and the existing native DOCX reader.
 * No runtime conversion takes place; original source documents stay untouched.
 */
export const CV_ASSETS = Object.freeze({
  de: Object.freeze({
    projection: Object.freeze({
      url: '/cv/CV_DE.pdf',
      filename: 'Lebenslauf_Vladimir_Leicht.pdf',
      labelKey: 'download.pdf',
    }),
    reader: Object.freeze({
      url: '/cv/CV_Reader_DE.docx',
      filename: 'Lebenslauf_Vladimir_Leicht_Lesefassung.docx',
      labelKey: 'download.docx',
    }),
  }),
  en: Object.freeze({
    projection: Object.freeze({
      url: '/cv/CV_EN.pdf',
      filename: 'Vladimir_Leicht_CV.pdf',
      labelKey: 'download.pdf',
    }),
    reader: Object.freeze({
      url: '/cv/CV_Reader_EN.docx',
      filename: 'Vladimir_Leicht_CV_Reading_Version.docx',
      labelKey: 'download.docx',
    }),
  }),
});

export function createDownloadButton({ container } = {}) {
  if (!container) return null;

  const link = document.createElement('a');
  link.className = 'cv-action cv-download';
  link.rel = 'noopener';
  link.dataset.menuAction = 'download';
  const controls = document.querySelector('[data-target="lebenslauf"]').nextElementSibling;
  link.hidden = true;

  let readerMode = false;

  function applyMode() {
    const language = getLanguage();
    const assets = CV_ASSETS[language];
    if (!assets) {
      throw new Error(`No CV document set is registered for language: ${language}`);
    }
    const asset = readerMode ? assets.reader : assets.projection;
    link.href = asset.url;
    link.download = asset.filename;
    link.hreflang = language;
    link.dataset.documentLanguage = language;
    link.textContent = t('download.visible');
    const label = t(asset.labelKey);
    link.setAttribute('aria-label', label);
    link.title = label;
  }

  const unsubscribeLanguage = onLanguageChange(applyMode);
  applyMode();
  controls.append(link);

  return {
    setVisible(next) {
      link.hidden = !next;
    },

    dock(slot) {
      readerMode = Boolean(slot);
      link.classList.toggle('is-docked', readerMode);
      applyMode();
      controls.append(link);
    },

    refreshLanguage: applyMode,

    dispose() {
      unsubscribeLanguage();
      link.remove();
    },
  };
}
