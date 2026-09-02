import { getLanguage, onLanguageChange, t } from '../i18n.js';

/**
 * Native CV assets only. No runtime conversion or browser-side DOCX/PDF
 * generation is performed; Vite copies every referenced document unchanged.
 *
 * The English PDF currently is the reviewed reading-version PDF, not a
 * fabricated counterpart of the designed German projection PDF. Its label and
 * filename state that explicitly until a native English projection PDF exists.
 */
export const CV_ASSETS = Object.freeze({
  de: Object.freeze({
    projection: Object.freeze({
      url: new URL(
        '../../Lebenslauf/Lebenslauf_Vladimir_Leicht.pdf',
        import.meta.url,
      ).href,
      filename: 'Lebenslauf_Vladimir_Leicht.pdf',
      labelKey: 'download.pdf',
    }),
    reader: Object.freeze({
      url: new URL(
        '../../Lebenslauf/Lebenslauf_Vladimir_Leicht_Lesefassung.docx',
        import.meta.url,
      ).href,
      filename: 'Lebenslauf_Vladimir_Leicht_Lesefassung.docx',
      labelKey: 'download.docx',
    }),
  }),
  en: Object.freeze({
    projection: Object.freeze({
      url: new URL(
        '../../Lebenslauf/Lebenslauf_Vladimir_Leicht_Reading_Version_EN.pdf',
        import.meta.url,
      ).href,
      filename: 'Vladimir_Leicht_CV_Reading_Version.pdf',
      labelKey: 'download.pdf',
    }),
    reader: Object.freeze({
      url: new URL(
        '../../Lebenslauf/Lebenslauf_Vladimir_Leicht_Reading_Version_EN.docx',
        import.meta.url,
      ).href,
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
  container.append(link);

  return {
    setVisible(next) {
      link.hidden = !next;
    },

    dock(slot) {
      readerMode = Boolean(slot);
      link.classList.toggle('is-docked', readerMode);
      applyMode();
      (readerMode ? slot : container).append(link);
    },

    refreshLanguage: applyMode,

    dispose() {
      unsubscribeLanguage();
      link.remove();
    },
  };
}
