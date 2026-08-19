/**
 * Download des Lebenslaufs.
 *
 * Projektion und Lesefassung besitzen bewusst zwei getrennte Dateien:
 * - Projektion: gestalteter PDF-Lebenslauf
 * - Lesefassung: fließende DOCX-Fassung mit denselben Inhalten wie die
 *   HTML-Lesefassung
 */

const PROJECTION_PDF_URL = new URL(
  '../../Lebenslauf/Lebenslauf_Vladimir_Leicht.pdf',
  import.meta.url,
).href;

const READER_DOCX_URL = new URL(
  '../../Lebenslauf/Lebenslauf_Vladimir_Leicht_Lesefassung.docx',
  import.meta.url,
).href;

const PROJECTION_FILENAME = 'Lebenslauf_Vladimir_Leicht.pdf';
const READER_FILENAME = 'Lebenslauf_Vladimir_Leicht_Lesefassung.docx';

const PROJECTION_LABEL = 'Lebenslauf als PDF herunterladen';
const READER_LABEL = 'Lesefassung als DOCX herunterladen';

export function createDownloadButton({ container } = {}) {
  if (!container) return null;

  const link = document.createElement('a');
  link.className = 'cv-action cv-download';
  link.rel = 'noopener';
  link.hidden = true;
  link.textContent = 'Download';

  let readerMode = false;

  function applyMode() {
    link.href = readerMode
      ? READER_DOCX_URL
      : PROJECTION_PDF_URL;
    link.download = readerMode
      ? READER_FILENAME
      : PROJECTION_FILENAME;

    const label = readerMode
      ? READER_LABEL
      : PROJECTION_LABEL;
    link.setAttribute('aria-label', label);
    link.title = label;
  }

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

    dispose() {
      link.remove();
    },
  };
}
