/**
 * Der Download-Knopf des Lebenslaufs.
 *
 * Bewusst schlicht: derselbe Schriftzug, derselbe Bernsteinstrich und
 * derselbe Neon-Flick wie die Knoepfe der Kopfzeile. Die gemeinsame Klasse
 * .cv-action traegt das gesamte Erscheinungsbild, hier bleibt nur die Frage,
 * wann der Link sichtbar ist.
 */

const PDF_URL = new URL(
  '../../Lebenslauf/Lebenslauf_Vladimir_Leicht.pdf',
  import.meta.url,
).href;

const LABEL = 'Lebenslauf herunterladen';

export function createDownloadButton({ container } = {}) {
  if (!container) return null;

  const link = document.createElement('a');
  link.className = 'cv-action cv-download';
  link.href = PDF_URL;
  link.download = 'Lebenslauf_Vladimir_Leicht.pdf';
  link.rel = 'noopener';
  link.hidden = true;
  link.setAttribute('aria-label', LABEL);
  link.textContent = 'Download';

  container.append(link);

  return {
    setVisible(next) { link.hidden = !next; },

    /**
     * Bei offener Lesefassung wandert der Link in deren Fusszeile, sonst
     * steht er wieder frei auf der Buehne. Ohne Ziel kehrt er zurueck.
     */
    dock(slot) {
      const docked = Boolean(slot);
      link.classList.toggle('is-docked', docked);
      (docked ? slot : container).append(link);
    },

    dispose() { link.remove(); },
  };
}
