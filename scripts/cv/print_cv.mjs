/** Light application CV (PDF + DOCX) from hologram_content.mjs.
 *
 * Applicant tracking systems read neutral backgrounds and single-column text most
 * reliably, so the documents for applications are light, single-column A4 with real
 * text, while the website keeps the dark hologram. Same content, same motifs
 * (“./” name, amber headings with line icons, dated stations without connectors).
 */
const esc = value => String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

const ICONS = {
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/><path d="M22 9v6"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  cube: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>',
  case: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18M11 12v2h2v-2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  dot: '<circle cx="12" cy="12" r="4"/>',
};
const icon = name => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

export function printMarkup(c, { fonts, email, web }) {
  const station = row => `<div class="row"><p class="when">${esc(row.when)}</p><div class="what"><h3>${esc(row.title)}</h3><p>${esc(row.meta)}</p>${row.detail ? `<p class="detail">${esc(row.detail)}</p>` : ''}</div></div>`;
  const section = (name, title, body, cls = '') => `<section class="${cls}"><h2>${icon(name)}<span>${esc(title)}</span></h2>${body}</section>`;
  const title = c.lang === 'de' ? 'Lebenslauf – Vladimir Leicht' : 'CV – Vladimir Leicht';
  return `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><title>${title}</title><meta name="author" content="Vladimir Leicht"><style>${fonts}${CSS}</style></head><body>
  <header class="head">
    <h1><span class="slash" aria-hidden="true">./</span>Vladimir Leicht</h1>
    <p class="role">${esc(c.role)}</p>
    <p class="contact"><span>${icon('mail')}<a href="mailto:${email}">${email}</a></span><span>${icon('pin')}${esc(c.status[1])}</span><span>${icon('globe')}<a href="https://${web}/">${web}</a></span><span class="ok">${icon('dot')}${esc(c.status[0])} · ${esc(c.status[2])}</span></p>
  </header>
  <section class="profile"><p>${esc(c.profile)}</p><p class="focus">${c.focus.map(esc).join(' · ')}</p><p class="goal">${esc(c.goal)}</p></section>
  ${section('cap', c.sections.education, c.education.map(station).join(''))}
  ${section('cube', c.sections.projects, c.projects.map(p => `<div class="project"><h3>${esc(p.title)} <span class="tag">${esc(p.tag)}</span></h3><p>${esc(p.text)}</p></div>`).join(''), 'projects')}
  ${section('code', c.sections.skills, c.skills.map(([group, items]) => `<p class="skill"><strong>${esc(group)}:</strong> ${items.map(esc).join(' · ')}</p>`).join(''))}
  ${section('case', c.sections.work, c.work.map(station).join(''), 'work')}
  ${section('globe', c.sections.more, c.more.map(station).join(''))}
  ${section('star', c.sections.interests, `<p class="interests">${c.interests.map(([, label]) => esc(label)).join(' · ')}</p>`)}
  </body></html>`;
}

const CSS = `
@page{size:A4;margin:15mm 17mm 16mm}
:root{--ink:#10233a;--soft:#43566b;--muted:#6a7b8d;--amber:#c0621b;--amber-soft:#e08a3c;--rule:#d8dee6;--paper:#fff}
*{box-sizing:border-box;margin:0;padding:0}
html{background:var(--paper)}
body{color:var(--ink);font:400 10pt/1.47 Barlow,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
a{color:inherit;text-decoration:none}
.ic{width:1.05em;height:1.05em;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.head{padding-bottom:9pt;border-bottom:1.2pt solid var(--ink);margin-bottom:10pt;position:relative}
.head::after{content:'';position:absolute;left:0;bottom:-3.2pt;width:5.2pt;height:5.2pt;border-radius:50%;background:var(--amber)}
h1{font:600 29pt/1 'Barlow Condensed',sans-serif;letter-spacing:.005em;color:var(--ink)}
.slash{color:var(--amber);margin-right:.18em}
.role{margin-top:4pt;font:500 12.5pt/1.2 'Barlow Condensed',sans-serif;letter-spacing:.02em;text-transform:uppercase;color:var(--amber)}
.contact{display:flex;flex-wrap:wrap;gap:3pt 14pt;margin-top:7pt;font-size:9pt;color:var(--soft)}
.contact span{display:inline-flex;align-items:center;gap:4pt}
.contact .ic{color:var(--amber)}
.contact .ok .ic{color:#2f9a6b;fill:#2f9a6b;stroke:none}
.profile{margin-bottom:4pt}
.profile p{font-size:10.2pt;line-height:1.5}
.profile .focus{margin-top:4pt;font:500 9.6pt/1.4 Barlow,sans-serif;color:#1e5f96}
.profile .goal{margin-top:2pt;font:600 9.2pt/1.3 'Barlow Condensed',sans-serif;letter-spacing:.02em;text-transform:uppercase;color:var(--amber)}
section{margin-top:12pt}
/* Work history starts together on page 2 instead of splitting after one entry. */
section.work{break-before:page;margin-top:0}
h2{display:flex;align-items:center;gap:6pt;margin-bottom:6pt;padding-bottom:3pt;border-bottom:.7pt solid var(--rule);font:600 12.5pt/1.1 'Barlow Condensed',sans-serif;letter-spacing:.03em;text-transform:uppercase;color:var(--amber)}
.row{display:grid;grid-template-columns:31mm 1fr;gap:0 8pt;padding:3pt 0;break-inside:avoid}
.when{font:500 10pt/1.35 'Barlow Condensed',sans-serif;color:var(--soft);font-variant-numeric:tabular-nums;position:relative;padding-left:9pt}
.when::before{content:'';position:absolute;left:0;top:.42em;width:4.2pt;height:4.2pt;border:1.2pt solid var(--amber);border-radius:50%}
.what h3{font:500 10.4pt/1.3 Barlow,sans-serif;color:var(--ink)}
.what p{color:var(--soft)}
.what .detail{font-style:italic;color:var(--muted)}
.project{padding:4pt 0 4pt 8pt;border-left:1.6pt solid var(--amber-soft);margin-bottom:5pt;break-inside:avoid}
.project h3{font:500 10.4pt/1.3 Barlow,sans-serif}
.project p{color:var(--soft)}
.tag{margin-left:4pt;padding:.5pt 4pt;border:.6pt solid var(--amber-soft);border-radius:2pt;font:600 7.4pt/1.4 'Barlow Condensed',sans-serif;letter-spacing:.03em;text-transform:uppercase;color:var(--amber);vertical-align:1pt}
.skill{padding:2pt 0}
.skill strong{font-weight:500;color:var(--ink)}
.interests{color:var(--soft)}
`;

/** Plain semantic HTML for the DOCX: headings become Word headings, no layout tables. */
export function docxMarkup(c, { email, web }) {
  const station = row => `<p><b>${esc(row.when)} · ${esc(row.title)}</b><br>${esc(row.meta)}${row.detail ? `<br><i>${esc(row.detail)}</i>` : ''}</p>`;
  return `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><title>${c.lang === 'de' ? 'Lebenslauf' : 'CV'} – Vladimir Leicht</title>
  <style>body{font-family:Arial,sans-serif;font-size:10.5pt;color:#10233a}h1{font-size:22pt;margin:0}h2{font-size:13pt;color:#c0621b;margin:14pt 0 4pt;border-bottom:1px solid #d8dee6}p{margin:0 0 5pt}.role{color:#c0621b;font-size:12pt}</style></head><body>
  <h1>Vladimir Leicht</h1><p class="role">${esc(c.role)}</p>
  <p>${email} · ${esc(c.status[1])} · ${web}<br>${esc(c.status[0])} · ${esc(c.status[2])}</p>
  <p>${esc(c.profile)}</p><p>${c.focus.map(esc).join(' · ')}<br>${esc(c.goal)}</p>
  <h2>${esc(c.sections.education)}</h2>${c.education.map(station).join('')}
  <h2>${esc(c.sections.projects)}</h2>${c.projects.map(p => `<p><b>${esc(p.title)}</b> (${esc(p.tag)})<br>${esc(p.text)}</p>`).join('')}
  <h2>${esc(c.sections.skills)}</h2>${c.skills.map(([group, items]) => `<p><b>${esc(group)}:</b> ${items.map(esc).join(', ')}</p>`).join('')}
  <h2>${esc(c.sections.work)}</h2>${c.work.map(station).join('')}
  <h2>${esc(c.sections.more)}</h2>${c.more.map(station).join('')}
  <h2>${esc(c.sections.interests)}</h2><p>${c.interests.map(([, label]) => esc(label)).join(', ')}</p>
  </body></html>`;
}
