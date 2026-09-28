import './style.css';
import { getLanguage, onLanguageChange, setLanguage, t } from '../src/i18n.js';
import cvDe from '../src/data/cv.de.json';
import cvEn from '../src/data/cv.en.json';

const root = document.querySelector('#concept');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const params = new URLSearchParams(location.search);
if (['de', 'en'].includes(params.get('lang'))) setLanguage(params.get('lang'));

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const copy = {
  de: {
    nav: ['Überblick', 'Abschlussprojekt', 'IT-Projekte', 'Profil'],
    labels: ['VERSTEHEN', 'VERBINDEN', 'GESTALTEN', 'WEITERDENKEN'],
    headlines: ['Technik mit einem klaren Ziel.', 'Vom Server bis zum Client.', 'Zusammenhänge sichtbar machen.', 'Der Mensch hinter dem System.'],
    next: 'Scrollen, um den nächsten Schritt zu sehen',
    scroll: 'SCROLLEN',
    openProject: 'Abschlussprojekt öffnen',
    openExample: 'Bestehende Beispielseite öffnen',
    openCV: 'Lebenslauf öffnen',
    study: 'Eigenständiger Entwurf · keine Kundenarbeit',
    prototype: 'Lokaler Prototyp',
    projectEyebrow: 'Pilotumgebung · Landratsamt Enzkreis',
    profileEyebrow: 'Fachinformatiker für Systemintegration',
    education: 'Umschulung 2024–2026 · Praxis Landratsamt Enzkreis',
    contact: 'Kontakt aufnehmen',
    language: 'Switch to English',
    visualAlt: 'Freigestelltes Netzwerkswitch-Motiv als Illustration der Gestaltungsstudie',
    miniKicker: 'Eine echte HTML-Seite',
    miniLine: 'Planen. Bauen. Dokumentieren.',
    miniFooter: 'Gestaltungsstudie · Portfolioinhalt',
  },
  en: {
    nav: ['Overview', 'Final project', 'IT projects', 'Profile'],
    labels: ['UNDERSTAND', 'CONNECT', 'DESIGN', 'LOOK AHEAD'],
    headlines: ['Technology with a clear purpose.', 'From server to client.', 'Making connections visible.', 'The person behind the system.'],
    next: 'Scroll to see the next step',
    scroll: 'SCROLL',
    openProject: 'Open final project',
    openExample: 'Open existing example page',
    openCV: 'Open CV',
    study: 'Independent design study · no client commission',
    prototype: 'Local prototype',
    projectEyebrow: 'Pilot environment · Enzkreis District Administration',
    profileEyebrow: 'IT specialist for systems integration',
    education: 'Qualification 2024–2026 · placement at Enzkreis District Administration',
    contact: 'Get in touch',
    language: 'Zu Deutsch wechseln',
    visualAlt: 'Isolated network switch illustration used in this design study',
    miniKicker: 'A real HTML page',
    miniLine: 'Plan. Build. Document.',
    miniFooter: 'Design study · Portfolio content',
  },
};

let frame = 0;
let currentStep = -1;

function render() {
  cancelAnimationFrame(frame);
  const language = getLanguage();
  const c = copy[language];
  const cv = language === 'de' ? cvDe : cvEn;
  const email = escapeHTML(cv.persoenlich.kontakt);
  document.documentElement.lang = language;
  document.title = `${t('example.title')} — Vladimir Leicht · ${c.prototype}`;

  const stepText = [
    `<p>${t('example.intro')}</p><span class="copy__detail">${escapeHTML(cv.interessensschwerpunkte)}</span>`,
    `<p>${t('ihk.description')}</p><span class="copy__detail">Matrix42 Empirum → baramundi Management Suite<br>${t('example.projectResult')}</span><a class="copy__link" href="/#abschluss">${c.openProject} <span aria-hidden="true">↗</span></a>`,
    `<p>${t('example.workText')}</p><span class="copy__detail">Three.js · HTML · CSS · JavaScript</span><a class="copy__link" href="/beispiel/">${c.openExample} <span aria-hidden="true">↗</span></a>`,
    `<p>${escapeHTML(cv.name)} · ${escapeHTML(cv.title)}</p><span class="copy__detail">${c.education}<br>${escapeHTML(cv.signatur.join(' · '))}</span><a class="copy__link" href="/#lebenslauf">${c.openCV} <span aria-hidden="true">↗</span></a>`,
  ];

  root.innerHTML = `
    <a class="skip" href="#journey">${language === 'de' ? 'Zum Inhalt' : 'Skip to content'}</a>
    <div class="journey" id="journey">
      <div class="sticky">
        <header class="site-head">
          <div class="brand"><strong>VLADIMIR LEICHT</strong><span>${escapeHTML(cv.title)}</span></div>
          <nav class="site-nav" aria-label="${language === 'de' ? 'Bereiche' : 'Sections'}">
            <button type="button" data-go="1">${c.nav[1]}</button>
            <button type="button" data-go="2">${c.nav[2]}</button>
            <button type="button" data-go="3">${c.nav[3]}</button>
          </nav>
          <button class="language" type="button" aria-label="${c.language}">${language === 'de' ? 'EN' : 'DE'}</button>
        </header>
        <main class="page-main">
          <h1>${t('example.title')}<span aria-hidden="true">.</span></h1>
          <section class="stage" aria-label="${language === 'de' ? 'Scrollgesteuerte Projektbühne' : 'Scroll-driven project stage'}">
            <div class="stage__grain" aria-hidden="true"></div>
            <div class="stage__corner stage__corner--tl" aria-hidden="true"></div>
            <div class="stage__corner stage__corner--br" aria-hidden="true"></div>
            <div class="stage__heading"><span class="stage__number">01 / 04</span><span class="stage__label">${c.labels[0]}</span></div>
            <div class="stage__visual" aria-hidden="true">
              <div class="blueprint visual-layer">
                <svg viewBox="0 0 900 500" preserveAspectRatio="xMidYMid meet">
                  <g class="blueprint__grid"><path d="M0 100H900M0 200H900M0 300H900M0 400H900M150 0V500M300 0V500M450 0V500M600 0V500M750 0V500"/></g>
                  <g class="blueprint__drawing"><rect x="200" y="125" width="500" height="250" rx="14"/><rect x="230" y="160" width="440" height="180" rx="6"/><path d="M230 205H670M230 295H670M305 160V340M595 160V340"/><circle cx="450" cy="250" r="68"/><circle cx="450" cy="250" r="25"/><path d="M450 40V115M450 385V460M110 250H190M710 250H790"/></g>
                </svg>
              </div>
              <img class="switch-asset" src="/beispiel-konzept/switch.webp" width="1672" height="941" alt="" />
              <svg class="network visual-layer" viewBox="0 0 900 500" preserveAspectRatio="xMidYMid meet">
                <path class="network__path network__path--blue" d="M110 264C220 264 210 150 335 150S545 243 650 174S746 135 813 135" />
                <path class="network__path network__path--orange" d="M90 370C210 370 216 330 330 330S557 281 681 304S754 352 821 352" />
                <g class="network__nodes"><circle cx="110" cy="264" r="7"/><circle cx="335" cy="150" r="7"/><circle cx="650" cy="174" r="7"/><circle cx="813" cy="135" r="7"/><circle cx="90" cy="370" r="7"/><circle cx="330" cy="330" r="7"/><circle cx="681" cy="304" r="7"/><circle cx="821" cy="352" r="7"/></g>
              </svg>
              <div class="web-visual visual-layer">
                <div class="web-visual__bar"><span></span><span></span><span></span><small>vl / beispiel</small></div>
                <div class="web-visual__body"><p>${c.miniKicker}</p><strong>${t('example.title')}.</strong><span>${c.miniLine}</span><div class="web-visual__rule"></div><small>${c.miniFooter}</small></div>
              </div>
              <div class="profile-visual visual-layer">
                <div class="profile-visual__core">VL</div>
                ${cv.signatur.map((skill, index) => `<span class="profile-visual__skill profile-visual__skill--${index + 1}">${escapeHTML(skill)}</span>`).join('')}
              </div>
            </div>
            <div class="stage__copy" aria-live="off">
              ${stepText.map((text, index) => `<article class="copy" data-scene="${index}" aria-hidden="${index === 0 ? 'false' : 'true'}"><p class="copy__eyebrow">${index === 1 ? c.projectEyebrow : index === 3 ? c.profileEyebrow : c.study}</p><h2>${c.headlines[index]}</h2>${text}</article>`).join('')}
            </div>
            <div class="stage__progress" role="group" aria-label="${language === 'de' ? 'Schritte' : 'Steps'}">
              ${c.labels.map((label, index) => `<button type="button" data-go="${index}" aria-label="${index + 1}: ${label}" ${index === 0 ? 'aria-current="step"' : ''}><span></span></button>`).join('')}
            </div>
            <span class="stage__edge-note">${c.study}</span>
          </section>
          <div class="below"><span>${c.next}</span><span>${c.scroll} <b aria-hidden="true">↓</b></span></div>
        </main>
      </div>
    </div>
    <footer class="site-foot"><span>${c.prototype} · ${t('example.footer')}</span><a href="mailto:${email}">${c.contact} ↗</a></footer>`;

  root.querySelector('.language').addEventListener('click', () => {
    const next = language === 'de' ? 'en' : 'de';
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    history.replaceState(null, '', url);
    setLanguage(next);
  });
  root.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.go))));
  currentStep = -1;
  update();
}

function goTo(index) {
  const track = root.querySelector('.journey');
  const distance = track.offsetHeight - innerHeight;
  const top = track.getBoundingClientRect().top + scrollY + distance * index / 3;
  scrollTo({ top, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}

function update() {
  frame = 0;
  const track = root.querySelector('.journey');
  if (!track) return;
  const distance = Math.max(1, track.offsetHeight - innerHeight);
  const top = track.getBoundingClientRect().top + scrollY;
  const phase = Math.max(0, Math.min(3, (scrollY - top) / distance * 3));
  const active = Math.round(phase);
  root.style.setProperty('--phase', phase.toFixed(4));
  root.style.setProperty('--switch-shift', `${Math.max(0, phase - 0.7) * 5}%`);
  root.style.setProperty('--switch-scale', `${1 - Math.max(0, phase - 0.8) * .09}`);
  root.style.setProperty('--switch-opacity', `${Math.max(0, Math.min(1, 2.15 - phase))}`);
  root.style.setProperty('--blueprint-opacity', `${Math.max(0, 1 - phase * 1.6)}`);
  root.style.setProperty('--network-opacity', `${Math.max(0, 1 - Math.abs(phase - 1) * 1.25)}`);
  root.style.setProperty('--web-opacity', `${Math.max(0, 1 - Math.abs(phase - 2) * 1.5)}`);
  root.style.setProperty('--profile-opacity', `${Math.max(0, (phase - 2) * 1.35)}`);
  if (active !== currentStep) {
    currentStep = active;
    const c = copy[getLanguage()];
    root.querySelector('.stage__number').textContent = `${String(active + 1).padStart(2, '0')} / 04`;
    root.querySelector('.stage__label').textContent = c.labels[active];
    root.querySelectorAll('.stage__progress button').forEach((button, index) => {
      if (index === active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  root.querySelectorAll('.copy').forEach((article, index) => {
    const weight = Math.max(0, 1 - Math.abs(phase - index));
    article.style.opacity = weight.toFixed(3);
    article.style.transform = `translateY(${(index - phase) * 18}px)`;
    article.style.pointerEvents = index === active ? 'auto' : 'none';
    article.setAttribute('aria-hidden', String(index !== active));
    article.querySelectorAll('a').forEach(link => { link.tabIndex = index === active ? 0 : -1; });
  });
}

function requestUpdate() { if (!frame) frame = requestAnimationFrame(update); }
render();
const unsubscribeLanguage = onLanguageChange(render);
addEventListener('scroll', requestUpdate, { passive: true });
addEventListener('resize', requestUpdate);
if (import.meta.hot) import.meta.hot.dispose(() => {
  cancelAnimationFrame(frame);
  unsubscribeLanguage();
  removeEventListener('scroll', requestUpdate);
  removeEventListener('resize', requestUpdate);
});
