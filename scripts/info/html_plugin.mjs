import { renderInformationMarkup } from '../../src/info/markup.js';
import { profileResources } from '../../src/data/profileResources.js';

function readingMarkup(lang) {
  return renderInformationMarkup(lang, profileResources(lang))
    .replace(/id="([^"]+)"/g, (_, id) => `id="reading-${lang}-${id}"`)
    .replace(/aria-labelledby="([^"]+)"/g, (_, id) => `aria-labelledby="reading-${lang}-${id}"`)
    .replace(/href="#(start|kurzprofil|projekt\/abschluss|kontakt)"/g, (_, route) => `href="#reading-${lang}-${route}"`)
    .replace(/data-poster=/g, 'poster='); // the no-script reading copy has no view logic
}
export function informationHtmlPlugin() {
  return { name: 'portfolio-information-html', transformIndexHtml: {
    order: 'pre',
    handler(html) {
      if (!html.includes('<!-- INFORMATION_LAYER -->')) return html;
      const lang = 'en'; // Identical static reading in development and production; i18n enhances it.
      const live = `<div id="information-layer" class="info-layer">${renderInformationMarkup(lang, profileResources(lang))}</div>`;
      // German visitors get their pages before the first paint. Rebuilding them later in
      // main.js would replay the entrance, which reads as the page loading twice.
      const german = `<template id="information-layer-de">${renderInformationMarkup('de', profileResources('de'))}</template>`
        + `<script>(() => { const html = document.documentElement, german = document.getElementById('information-layer-de');`
        + ` if (html.dataset.infoLanguage === 'de') document.getElementById('information-layer').replaceChildren(german.content);`
        + ` german.remove(); delete html.dataset.infoLanguage; })();</script>`;
      const reading = `<noscript><nav class="info-reading-nav"><a href="#start">English</a> · <a href="#reading-de-start">Deutsch</a> · <a href="/beispiel/">Tiefgang</a> · <a href="/beispiele/passung/">PASSUNG</a> · <a href="/beispiele/resonanz/">RESONANZ</a> · <a href="/systemintegration/">Recovery Lab</a></nav><div class="info-layer info-reading" lang="de">${readingMarkup('de')}</div></noscript>`;
      return html.replace('<!-- INFORMATION_LAYER -->', live + german + reading);
    },
  } };
}
