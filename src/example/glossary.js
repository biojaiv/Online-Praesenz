import { escapeHTML } from './content.js';

const TERM = /\[\[([a-z]+)\|([^\]]+)\]\]/g;

export const termKeys = text => [...new Set([...String(text).matchAll(TERM)].map(match => match[1]))];
export const stripTerms = text => String(text).replace(TERM, '$2');

/** Escapes text and turns [[key|label]] markers into glossary buttons or static definitions. */
export function richText(text, c, interactive = true) {
  return escapeHTML(text).replace(TERM, (all, key, label) => {
    const entry = c.glossary[key];
    if (!entry) return label;
    return interactive
      ? `<button type="button" class="term" data-term="${key}" aria-expanded="false">${label}</button>`
      : `<dfn class="term-static" title="${escapeHTML(entry[1])}">${label}</dfn>`;
  });
}

export const termList = (texts, c) => {
  const keys = [...new Set(texts.flatMap(termKeys))].filter(key => c.glossary[key]);
  return keys.length
    ? `<dl class="reading-terms"><dt class="sr-only">${escapeHTML(c.termsLabel)}</dt>${keys.map(key => `<div><dt>${escapeHTML(c.glossary[key][0])}</dt><dd>${escapeHTML(c.glossary[key][1])}</dd></div>`).join('')}</dl>`
    : '';
};
