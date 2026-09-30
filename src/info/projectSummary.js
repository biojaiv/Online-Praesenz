import { getInformationContent } from './content.js';

const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/** The same five project facts in the accessible fallback and hologram reader. */
export function renderProjectSummary(language, prefix = 'project') {
  const c = getInformationContent(language);
  return `<ol class="info-project__rows">${c.projectRows.map(([heading, text], i) => `
    <li class="info-project__row"><details data-info-term="${prefix}-point-${i + 1}">
      <summary data-info-focus="${prefix}-point-${i + 1}">
        <span class="info-project__number" aria-hidden="true">0${i + 1}</span>
        <span class="info-project__topic"><strong>${esc(heading)}</strong><span>${esc(text)}</span></span>
        <span class="info-project__expand" aria-hidden="true">+</span>
      </summary>
      <div class="info-project__answer">${c.projectDetails[i].map((detail, part) => `<p><strong>${esc(c.projectDetailLabels[part])}</strong>${esc(detail)}</p>`).join('')}
        ${i === 3 ? `<p class="info-pilot-note">${esc(c.pilotNote)}</p>` : ''}
      </div>
    </details></li>`).join('')}</ol>`;
}
