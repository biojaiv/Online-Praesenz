/**
 * Download des Lebenslaufs.
 *
 * In der Projektion bleibt der gestaltete PDF-Lebenslauf das Ziel.
 * In der geöffneten Lesefassung wird dagegen eine eigenständige HTML-Datei
 * aus exakt dem aktuell gerenderten Lesefassungs-DOM erzeugt. Aktiver
 * Abschnitt, Layout und aktuelle Scrollposition werden dabei erhalten.
 */

const PROJECTION_PDF_URL = new URL(
  '../../Lebenslauf/Lebenslauf_Vladimir_Leicht.pdf',
  import.meta.url,
).href;

const PROJECTION_FILENAME = 'Lebenslauf_Vladimir_Leicht.pdf';
const READER_FILENAME = 'Lebenslauf_Vladimir_Leicht_Lesefassung.html';
const PROJECTION_LABEL = 'Lebenslauf als PDF herunterladen';
const READER_LABEL = 'Aktuelle Lesefassung herunterladen';

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function collectPageCSS() {
  const chunks = [];

  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules ? [...sheet.cssRules] : [];
      if (rules.length) {
        chunks.push(rules.map((rule) => rule.cssText).join('\n'));
      }
    } catch {
      // Fremde Stylesheets dürfen ihre cssRules aus Sicherheitsgründen
      // verbergen. Die Lesefassung hängt nicht von ihnen ab; lokale Regeln
      // bleiben vollständig enthalten.
    }
  }

  return chunks.join('\n');
}

function buildReaderSnapshot(reader) {
  const liveArticle = reader?.element?.querySelector('.cv-hologram');
  if (!(liveArticle instanceof HTMLElement)) {
    throw new Error('Die geöffnete Lesefassung wurde nicht gefunden.');
  }

  const liveBody = liveArticle.querySelector('.cv-hologram__body');
  const clone = liveArticle.cloneNode(true);

  clone.querySelector('.cv-hologram__actions')?.remove();
  clone.querySelector('[data-cv-close]')?.remove();

  for (const button of clone.querySelectorAll('button')) {
    button.disabled = true;
    button.removeAttribute('tabindex');
  }

  clone.querySelector('.cv-hologram__body')?.removeAttribute('tabindex');
  clone.removeAttribute('tabindex');

  const rect = liveArticle.getBoundingClientRect();
  const scrollTop = Math.max(0, Math.round(liveBody?.scrollTop ?? 0));
  const pageCSS = collectPageCSS().replaceAll('</style', '<\\/style');
  const baseHref = escapeHTML(document.baseURI);
  const title = 'Lebenslauf Vladimir Leicht · Lesefassung';

  const exportCSS = `
    html, body {
      margin: 0;
      min-width: 100%;
      min-height: 100%;
      background: #03060d;
    }
    body {
      box-sizing: border-box;
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 24px;
    }
    .cv-hologram {
      --cv-doc-width: ${Math.max(1, Math.round(rect.width))}px;
      --cv-doc-height: ${Math.max(1, Math.round(rect.height))}px;
      max-width: calc(100vw - 48px);
      max-height: calc(100vh - 48px);
    }
    .cv-hologram__actions {
      display: none !important;
    }
    @media print {
      html, body {
        background: #03060d !important;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      body {
        padding: 0;
      }
      .cv-hologram {
        max-width: none;
        max-height: none;
      }
    }
  `;

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <base href="${baseHref}">
  <title>${escapeHTML(title)}</title>
  <style>${pageCSS}</style>
  <style>${exportCSS}</style>
</head>
<body>
${clone.outerHTML}
<script>
(() => {
  const body = document.querySelector('.cv-hologram__body');
  if (!body) return;
  const restore = () => { body.scrollTop = ${scrollTop}; };
  restore();
  requestAnimationFrame(restore);
})();
<\/script>
</body>
</html>`;
}

function triggerBlobDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const transfer = document.createElement('a');

  transfer.href = url;
  transfer.download = filename;
  transfer.rel = 'noopener';
  transfer.hidden = true;
  document.body.append(transfer);
  transfer.click();
  transfer.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function createDownloadButton({ container, reader } = {}) {
  if (!container) return null;

  const link = document.createElement('a');
  link.className = 'cv-action cv-download';
  link.rel = 'noopener';
  link.hidden = true;
  link.textContent = 'Download';

  let readerMode = false;

  function applyMode() {
    if (readerMode) {
      link.href = '#';
      link.download = READER_FILENAME;
      link.setAttribute('aria-label', READER_LABEL);
      link.title = READER_LABEL;
    } else {
      link.href = PROJECTION_PDF_URL;
      link.download = PROJECTION_FILENAME;
      link.setAttribute('aria-label', PROJECTION_LABEL);
      link.title = PROJECTION_LABEL;
    }
  }

  function onClick(event) {
    if (!readerMode) return;

    event.preventDefault();

    try {
      triggerBlobDownload(
        buildReaderSnapshot(reader),
        READER_FILENAME,
      );
    } catch (error) {
      console.error('Lesefassungs-Download konnte nicht erstellt werden:', error);
      window.alert(
        'Die Lesefassung konnte nicht erstellt werden. Bitte erneut versuchen.',
      );
    }
  }

  applyMode();
  link.addEventListener('click', onClick);
  container.append(link);

  return {
    setVisible(next) { link.hidden = !next; },

    dock(slot) {
      readerMode = Boolean(slot);
      link.classList.toggle('is-docked', readerMode);
      applyMode();
      (readerMode ? slot : container).append(link);
    },

    dispose() {
      link.removeEventListener('click', onClick);
      link.remove();
    },
  };
}
