import { copy, number, escapeHTML as e } from './content.js';
import { illustration } from './illustration.js';
import { richText, termList } from './glossary.js';
import { diagramLabels } from './diagramLabels.js';

export function chapterMarkup(c, language, prefix = '') {
  return c.chaptersData.map((chapter,i)=>`<section class="chapter-marker" id="${prefix}chapter-${i+1}" data-chapter="${i}">
    <div class="chapter-content">
      <div><p class="eyebrow">${number(i)} / 07 · ${e(chapter[0])}</p><h2>${e(chapter[2]).replace('\n','<br>')}</h2>
      <p class="reading-simple"><strong>${e(c.simpleLabel)}:</strong> ${richText(chapter[5],c,false)}</p><p>${richText(chapter[3],c,false)}</p><p>${richText(chapter[4],c,false)}</p>
      ${termList([chapter[3],chapter[4],chapter[5]],c)}
      ${i===2 ? `<ol class="reading-dialogue">${c.dhcp.map(line=>`<li><strong>${line[0]} · ${e(line[1])}</strong><p>${e(line[2])}</p></li>`).join('')}</ol>`:''}
      ${i===1 ? `<p>${e(language==='de'?'Bei einem Ausfall des aktiven Uplinks pausiert die Übertragung kurz. Der unabhängige Ersatzpfad übernimmt; ein einzelner ausgefallener Client-Anschluss wäre damit nicht abgesichert.':'If the active uplink fails, transmission pauses briefly. The independent alternate path takes over; this does not protect against a failed client connection.')}</p>`:''}
      ${[3,5,6].includes(i)?`<aside class="reading-project"><p class="eyebrow">${c.projectKicker}</p><p>${c.projectText}</p><a href="/#abschluss" data-portfolio="abschluss">${c.project}</a></aside>`:''}
      ${i===6?`<h3>${c.ready}</h3><p>${c.manual}</p><small>${c.modelNote}</small>`:''}</div>
      <figure><div class="diagram-plate">${illustration(c,`${prefix}still-${i}`,i,false,'180 18 560 1100')}${diagramLabels(language,false,true)}</div><figcaption>${c.labels[i]}</figcaption></figure>
    </div>
  </section>`).join('');
}

export function staticMarkup() {
  return `<header class="static-header"><h1>TIEFGANG<span>■</span></h1><p>${copy.en.tagline}</p><nav><a href="#reading-en">English</a> / <a href="#reading-de">Deutsch</a> · <a href="/beispiel/erklaert/">Explained / Erklärt</a> · <a href="/">Portfolio ↗</a></nav></header>
    ${['en','de'].map(language=>`<main id="reading-${language}" lang="${language}" class="static-reading"><h2>${copy[language].nojs}</h2>${chapterMarkup(copy[language],language,language+'-')}</main>`).join('')}`;
}
