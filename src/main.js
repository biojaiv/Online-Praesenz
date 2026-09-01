import './style.css';
import './effects.css';
import { applyStaticTranslations, onLanguageChange, setLanguage, t } from './i18n.js';
import { createStage } from './scene/stage.js';
import { createRouter } from './ui/router.js';
import { igniteTitle } from './ui/title.js';
import { shouldPlayIntro, playIntro } from './ui/intro.js';
import { startBrandGlitch } from './ui/glitch.js';
import { startHeaderSymbols } from './ui/headerSymbol.js';
import { createReader } from './ui/reader.js';
import { createDownloadButton } from './ui/download.js';
import { getExplored, onExploredChange } from './state/explored.js';
import { primeSounds, playSound } from './ui/audio.js';

applyStaticTranslations();

const canvas = document.getElementById('scene');
const boot = document.getElementById('boot');
const stageEl = document.getElementById('stage');
const crumb = document.getElementById('crumb');
const hint = document.getElementById('hint');
const foot = document.querySelector('.foot');
const languageSwitch = document.getElementById('language-switch');

const ROUTE_LABEL_KEYS = Object.freeze({
  home: 'route.home',
  abschluss: 'route.finalProject',
  projekte: 'route.privateProjects',
  automation: 'route.automation',
  lebenslauf: 'route.cv',
  arbeitsleben: 'route.career',
  bildungsweg: 'route.education',
  faehigkeiten: 'route.skills',
  kontakt: 'route.contact',
});

const STATIC_ROUTE_LABELS = Object.freeze({
  server: 'Server',
  uem: 'UEM',
  clients: 'Clients',
  migration: 'Migration',
  homelab: 'Homelab',
  web: 'Web',
});

function routeLabel(segment) {
  const key = ROUTE_LABEL_KEYS[segment];
  return key ? t(key) : (STATIC_ROUTE_LABELS[segment] || segment);
}

let currentRoute = 'home';
let readerIsOpen = false;

function routeParts(target, { includeReader = false } = {}) {
  const segments = String(target || 'home')
    .split('/')
    .filter(Boolean);
  const parts = segments.map((segment, index) => ({
    key: segment,
    label: routeLabel(segment),
    route: segments.slice(0, index + 1).join('/'),
    action: 'route',
  }));

  if (includeReader && segments[0] === 'lebenslauf') {
    // Lesefassung ist ein aufklappbarer Darstellungsmodus. Der Eintrag bleibt
    // deshalb als eigene, anklickbare Ebene im Pfad erhalten.
    parts.splice(1, 0, {
      key: 'lesefassung',
      label: t('route.readable'),
      route: 'lebenslauf',
      action: 'reader',
    });
  }

  return parts;
}

function formatRoute(target, options) {
  return routeParts(target, options)
    .map((part) => part.label)
    .join(' > ');
}

function renderBreadcrumb() {
  if (!(crumb instanceof HTMLElement)) return;

  const parts = routeParts(currentRoute, {
    includeReader: readerIsOpen,
  });
  crumb.replaceChildren();
  crumb.setAttribute('role', 'navigation');
  crumb.setAttribute(
    'aria-label',
    t('breadcrumb.current', {
      path: formatRoute(currentRoute, {
        includeReader: readerIsOpen,
      }),
    }),
  );

  parts.forEach((part, index) => {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.className = 'foot__crumb-separator';
      separator.textContent = '>';
      separator.setAttribute('aria-hidden', 'true');
      crumb.append(separator);
    }

    const current = index === parts.length - 1;
    const item = document.createElement(current ? 'span' : 'button');
    item.className = 'foot__crumb-item';
    item.textContent = part.label;

    if (current) {
      item.classList.add('is-current');
      item.setAttribute('aria-current', 'page');
    } else {
      item.type = 'button';
      item.dataset.crumbAction = part.action;
      item.dataset.crumbRoute = part.route;
      item.setAttribute('aria-label', t('breadcrumb.returnTo', { label: part.label }));
    }

    crumb.append(item);
  });
}

function updateFooter() {
  const root = currentRoute.split('/')[0] || 'home';
  const escapable = root !== 'home';
  renderBreadcrumb();

  if (hint instanceof HTMLButtonElement) {
    const lead = root === 'home'
      ? t('footer.selectSection')
      : root === 'lebenslauf'
        ? readerIsOpen
          ? t('footer.readerLead')
          : t('footer.resumeLead')
        : '';
    const escapeLabel = escapable
      ? readerIsOpen
        ? t('footer.escProjection')
        : t('footer.escBack')
      : '';

    hint.innerHTML = [
      lead ? `<span class="foot__hint-lead">${lead}</span>` : '',
      escapeLabel ? `<span class="foot__esc-label">${escapeLabel}</span>` : '',
    ].filter(Boolean).join(' ');
    hint.disabled = !escapable;
    hint.setAttribute(
      'aria-label',
      readerIsOpen
        ? t('footer.ariaProjection')
        : escapable
          ? t('footer.ariaMain')
          : t('footer.ariaNone'),
    );
  }

  foot?.classList.toggle('is-contextual', escapable);
  foot?.classList.toggle('is-reader-open', readerIsOpen);
  foot?.classList.toggle('is-esc-actionable', escapable);
  if (foot) foot.dataset.section = root;
}

// Der Sockel bekommt bis zu vier Sekunden Vorsprung hinter dem Boot-Layer.
const MODEL_GATE = 4000;

let stage = null;
let stopBrandGlitch = null;
let stopHeaderSymbols = null;
// Die Buehne meldet die Flaeche des Dokuments, bevor die Lesefassung existiert.
let readerRef = null;

try {
  stage = createStage(canvas, {
    onDocumentRect: (rect) => readerRef?.setRect(rect),
  });
} catch (err) {
  console.error('WebGL konnte nicht initialisiert werden:', err);
  stageEl?.classList.add('is-fallback');
  if (stageEl) {
    const fallback = document.createElement('p');
    fallback.className = 'stage__fallback';
    fallback.textContent = t('error.webgl');
    stageEl.appendChild(fallback);
  }
}

// Intro nur beim ersten Besuch, ohne Deep Link, mit WebGL und mit Bewegung.
// Die Kamera muss vor dem allerersten Bild in der Tiefe stehen.
const wantIntro = !!stage && shouldPlayIntro();
let introRunning = wantIntro;
if (wantIntro) stage.intro.begin();
else document.documentElement.classList.remove('pre-intro');
stage?.start();

const reader = createReader({
  container: stageEl,
  onNavigate: (target) => router.go(target),
  // Vor dem Erscheinen blendet die Buehne die Projektion kontrolliert ab.
  onTransition: (open) => stage?.beginReaderTransition(open),
  onOpenChange: (open) => {
    readerIsOpen = open;
    updateFooter();
    stage?.setReaderOpen(open);
    download?.dock(open ? reader.actionSlot : null);
  },
});
readerRef = reader;
if (stage && reader) reader.setRect(stage.documentRect());

// Der Download taucht erst auf, wenn der Lebenslauf offen steht.
const download = createDownloadButton({ container: stageEl });

const unsubscribeExplored = onExploredChange(() => stage?.setExplored(getExplored()));

const router = createRouter({
  onEnter(target) {
    const root = target.split('/')[0];

    // Der initiale Router-Aufruf darf den Kamera-Dolly des Intros nicht
    // sofort mit einer konkurrierenden Heimfahrt überschreiben.
    if (!introRunning) {
      if (root === 'home') stage?.toHome();
      else stage?.focusCard(root);
    }
    stage?.setRoute(target);
    stage?.setExplored(getExplored());
    reader?.setRoute(target);
    download?.setVisible(root === 'lebenslauf');

    currentRoute = target;
    if (root !== 'lebenslauf') readerIsOpen = false;
    updateFooter();
  },
});

async function activateFooterHint() {
  const root = currentRoute.split('/')[0] || 'home';
  if (root === 'home') return;

  if (readerIsOpen) {
    await reader?.close();
    return;
  }

  playSound('release');
  router.go('home');
}

hint?.addEventListener('click', activateFooterHint);

function activateLanguageSwitch() {
  const target = languageSwitch?.dataset.languageTarget;
  if (!target) return;
  setLanguage(target);
}
languageSwitch?.addEventListener('click', activateLanguageSwitch);

// Sprachwechsel aktualisiert nur sichtbare Texte. Route, Kamera, geoeffnete
// Lesefassung und Dokumentposition bleiben dabei unveraendert.
const unsubscribeLanguage = onLanguageChange(() => {
  updateFooter();
});

async function activateBreadcrumb(event) {
  const control = event.target instanceof Element
    ? event.target.closest('[data-crumb-action]')
    : null;
  if (!(control instanceof HTMLButtonElement)) return;

  const action = control.dataset.crumbAction;
  const target = control.dataset.crumbRoute || 'home';

  // Klick auf die Lebenslauf-Ebene klappt eine geoeffnete Lesefassung ein.
  // Klick auf "Lesefassung" selbst bleibt in der Lesefassung und springt
  // lediglich zu deren Profilanfang.
  if (action === 'route' && readerIsOpen && target === 'lebenslauf') {
    await reader?.close();
  }

  if (target !== currentRoute) router.go(target);
}

crumb?.addEventListener('click', activateBreadcrumb);

// Klick in der Szene fuehrt ueber denselben Weg wie die Kopfzeile,
// damit Hash, Kamerafahrt und Zurueck-Knopf nie auseinanderlaufen.
stage?.on((event, key) => {
  if (event !== 'select') return;
  const target = key ?? 'home';
  playSound(target === 'home' ? 'release' : 'focus');
  router.go(target);
});

/**
 * Danach beginnt die Experience zuverlässig; ein noch laufender Download wird
 * nicht abgebrochen und das fertige Modell blendet später weich ein.
 */
async function beginExperience() {
  // Die kurzen Signale werden vorgeladen; das Intro startet anschließend
  // automatisch wie vor der zusätzlichen Audiofreigabe-Sperre.
  primeSounds();

  let gateTimer = 0;
  await Promise.race([
    stage?.ready ?? Promise.resolve('fallback'),
    new Promise((resolve) => { gateTimer = window.setTimeout(resolve, MODEL_GATE, 'loading'); }),
  ]);
  window.clearTimeout(gateTimer);
  stage?.releaseModelReveal();

  // Zwei Bilder Vorlauf: der erste gerenderte Frame soll stehen, bevor das
  // Boot-Layer aufblendet.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await new Promise((resolve) => { window.setTimeout(resolve, 260); });

  boot.classList.add('is-done');
  if (wantIntro) {
    playIntro({
      stage,
      onDone() {
        introRunning = false;
        stopBrandGlitch = startBrandGlitch({ stage });
        stopHeaderSymbols = startHeaderSymbols();
      },
    });
  } else {
    igniteTitle(document.querySelector('.head__role'), { delay: 0.55 });
    stopBrandGlitch = startBrandGlitch({ stage });
    stopHeaderSymbols = startHeaderSymbols();
  }
}
beginExperience();

// Ressourcen freigeben, wenn der Tab in den Hintergrund geht
function onVisibilityChange() {
  if (!stage) return;
  if (document.hidden) stage.stop();
  else stage.start();
}
document.addEventListener('visibilitychange', onVisibilityChange);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    hint?.removeEventListener('click', activateFooterHint);
    languageSwitch?.removeEventListener('click', activateLanguageSwitch);
    crumb?.removeEventListener('click', activateBreadcrumb);
    unsubscribeExplored();
    unsubscribeLanguage();
    stopBrandGlitch?.();
    stopHeaderSymbols?.();
    reader?.dispose();
    download?.dispose();
    stage?.dispose();
  });
}

if (import.meta.env.DEV) window.__stage = stage;
