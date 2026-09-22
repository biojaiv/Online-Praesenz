import './style.css';
import { enhanceExample } from './interactions.js';
import { getLanguage, setLanguage, onLanguageChange, t } from '../i18n.js';
import cvDe from '../data/cv.de.json';
import cvEn from '../data/cv.en.json';

const params = new URLSearchParams(location.search);
const embedded = window.parent !== window && params.get('embedded') === '1';
if (['de', 'en'].includes(params.get('lang'))) setLanguage(params.get('lang'));
const root = document.getElementById('example');
const escape = (value) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

let stopInteractions = () => {};
function render() {
  stopInteractions();
  const cv = getLanguage() === 'de' ? cvDe : cvEn;
  document.documentElement.lang = getLanguage();
  document.title = `${t('example.title')} — Vladimir Leicht`;
  root.innerHTML = `
    <a class="skip" href="#content">${getLanguage() === 'de' ? 'Zum Inhalt' : 'Skip to content'}</a>
    <header id="top" class="site-head">
      <a class="monogram" href="#top" aria-label="Vladimir Leicht">VL</a>
      <nav aria-label="${t('example.projects')}">
        <a href="#abschluss">${t('nav.finalProject')}</a>
        <a href="#projekte">${t('example.projects')}</a>
        <a href="#lebenslauf">${t('nav.cv')}</a>
        <button id="example-language" type="button" aria-label="${t('lang.switch')}">${getLanguage() === 'de' ? 'EN' : 'DE'}</button>
      </nav>
    </header>
    <main id="content">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">${escape(cv.name)} — ${escape(cv.title)}</p>
          <h1 id="hero-title">${t('example.headline')}</h1>
          <p class="intro">${t('example.intro')}</p>
          <div class="actions"><a class="button" href="#lebenslauf">${t('example.cv')}</a><a href="#abschluss">${t('example.projects')} →</a></div>
        </div>
        <img class="hardware" src="/example/hardware.webp" width="961" height="791" alt="${t('example.imageAlt')}" fetchpriority="high" />
      </section>
      <div class="specification"><span>${t('example.location')} — ${escape(cv.persoenlich.wohnort)}</span><span>${t('example.focus')} — Server · UEM · Clients · Migration</span><span>${t('example.study')}</span></div>
      <section class="chapter" id="abschluss" aria-labelledby="project-title">
        <p class="chapter-number">01 / ${t('nav.finalProject')}</p>
        <div class="chapter-grid"><h2 id="project-title">${t('example.projectHeading')}</h2><div><h3>Matrix42 Empirum →<br>baramundi Management Suite</h3><p>${t('ihk.description')}</p><p>${t('example.projectResult')}</p><a class="text-link" href="/#abschluss" data-portfolio="abschluss">${t('example.projectLink')}</a></div></div>
      </section>
      <section class="chapter" id="projekte" aria-labelledby="work-title">
        <p class="chapter-number">02 / ${t('example.projects')}</p>
        <div class="chapter-grid"><h2 id="work-title">${t('example.workHeading')}</h2><div><p>${t('example.workText')}</p><details><summary>${t('example.workDetail')}</summary><p>${t('example.workDetailText')}</p></details><div class="tech-tags"><span>Three.js</span><span>HTML / CSS</span><span>JavaScript</span></div></div></div>
      </section>
      <section class="chapter" id="lebenslauf" aria-labelledby="cv-title">
        <p class="chapter-number">03 / ${t('nav.cv')}</p>
        <div class="chapter-grid"><h2 id="cv-title">${t('example.cvHeading')}</h2><div>${cv.bildungsweg.map(item => `<article class="education"><p class="eyebrow">${escape(item.zeitraum)}</p><h3>${escape(item.titel)}</h3><p>${escape(item.beschreibung)}</p>${item.hinweis ? `<p>${escape(item.hinweis)}</p>` : ''}</article>`).join('')}<a class="text-link" data-portfolio="lebenslauf" href="/#lebenslauf">${t('example.cv')} ↗</a><a class="text-link contact" href="mailto:${escape(cv.persoenlich.kontakt)}">${t('example.contact')}</a></div></div>
      </section>
    </main>
    <footer><p>${t('example.footer')}</p><a href="#top">${t('example.top')}</a></footer>`;
  stopInteractions = enhanceExample(root);
}
render();
const unsubscribe = onLanguageChange(() => {
  render();
  document.getElementById('example-language').focus({ preventScroll: true });
  if (embedded) parent.postMessage({ type: 'example:language', language: getLanguage() }, location.origin);
});
root.addEventListener('click', event => {
  if (event.target.closest('#example-language')) setLanguage(getLanguage() === 'de' ? 'en' : 'de');
  const link = event.target.closest('[data-portfolio]');
  if (embedded && link) {
    event.preventDefault();
    parent.postMessage({ type: 'example:navigate', route: link.dataset.portfolio }, location.origin);
  }
});
function onKey(event) {
  if (embedded && event.key === 'Escape') {
    event.preventDefault();
    parent.postMessage({ type: 'example:close' }, location.origin);
  }
}
document.addEventListener('keydown', onKey);
if (embedded) parent.postMessage({ type: 'example:ready' }, location.origin);
if (import.meta.hot) import.meta.hot.dispose(() => { unsubscribe(); stopInteractions(); document.removeEventListener('keydown', onKey); });
