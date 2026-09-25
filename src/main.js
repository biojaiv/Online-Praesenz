import './style.css';
import './effects.css';
import './experienceEnhancements.css';
import './ihkProject.css';
import './harmony.css';
import { createProjectsBrowser } from './ui/projectsBrowser.js';
import { createControlDistortion } from './ui/controlDistortion.js';
import { createProfileAccess } from './ui/profileAccess.js';
import { applyStaticTranslations, onLanguageChange, setLanguage, t } from './i18n.js';
import { createStage } from './scene/stage.js';
import { createExperienceEnhancements } from './scene/experienceEnhancements.js';
import { createRouter } from './ui/router.js';
import { igniteTitle } from './ui/title.js';
import { shouldPlayIntro, playIntro } from './ui/intro.js';
import { startBrandGlitch } from './ui/glitch.js';
import { startHeaderSymbols } from './ui/headerSymbol.js';
import { createReader } from './ui/reader.js';
import { createIhkProject } from './ui/ihkProject.js';
import { createExampleProjection } from './ui/exampleProjection.js';
import { createDownloadButton } from './ui/download.js';
import { getExplored, onExploredChange } from './state/explored.js';
import { primeSounds, playSound } from './ui/audio.js';

applyStaticTranslations();
const profileAccess = createProfileAccess();
const stopControlDistortion = createControlDistortion();

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
  webseiten: 'projects.websites',
  privat: 'projects.integration',
  systemintegration: 'projects.integration',
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
  const routeSegments = String(target || 'home')
    .split('/')
    .filter(Boolean);
  const segments = routeSegments.length ? routeSegments : ['home'];
  const parts = [];

  // Every deeper route has one stable origin. Home is therefore always the
  // first breadcrumb and never disappears behind a section-specific label.
  if (segments[0] !== 'home') {
    parts.push({
      key: 'home',
      label: routeLabel('home'),
      route: 'home',
      action: 'route',
    });
  }

  segments.forEach((segment, index) => {
    parts.push({
      key: segment,
      label: routeLabel(segment),
      route: segment === 'home'
        ? 'home'
        : segments.slice(0, index + 1).join('/'),
      action: 'route',
    });
  });

  if (includeReader && ['lebenslauf', 'abschluss'].includes(segments[0])) {
    // Lesefassung ist ein aufklappbarer Darstellungsmodus. Der Eintrag bleibt
    // deshalb als eigene, anklickbare Ebene im Pfad erhalten.
    const cvIndex = parts.findIndex((part) => part.key === segments[0]);
    parts.splice(cvIndex + 1, 0, {
      key: 'lesefassung',
      label: t('route.readable'),
      route: segments[0],
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
    if (part.key === 'home') {
      item.classList.add('is-distortion-target');
      item.dataset.distortLabel = part.label;
    }

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
      : ['lebenslauf', 'abschluss'].includes(root)
        ? readerIsOpen
          ? t('footer.readerLead')
          : t('footer.resumeLead')
        : t('footer.selectSection');
    const escapeLabel = escapable
      ? readerIsOpen
        ? t('footer.escProjection')
        : t('footer.escBack')
      : '';

    hint.innerHTML = [
      lead ? `<span class="foot__hint-lead">${lead}</span>` : '',
      escapeLabel ? `<span class="foot__esc-label">${escapeLabel}</span>` : '',
    ].filter(Boolean).join(' ');
    hint.disabled = false;
    const leadNode = hint.querySelector('.foot__hint-lead');
    if (leadNode instanceof HTMLElement) leadNode.dataset.distortLabel = lead;
    hint.setAttribute(
      'aria-label',
      root === 'home'
        ? t('footer.selectSection')
        : readerIsOpen
          ? t('footer.ariaProjection')
          : t('footer.ariaMain'),
    );
  }

  foot?.classList.toggle('is-contextual', escapable);
  foot?.classList.toggle('is-reader-open', readerIsOpen);
  foot?.classList.toggle('is-esc-actionable', escapable);
  foot?.classList.toggle('is-home', root === 'home');
  if (foot) foot.dataset.section = root;
}

// Der Sockel bekommt bis zu vier Sekunden Vorsprung hinter dem Boot-Layer.
const MODEL_GATE = 4000;
const BOOT_HARD_LIMIT = 6000; // STARTUP_FAILSAFE_V5_1_1

let stage = null;
let bootLimitTimer = 0;
let enhancements = null;
let enhancementTimer = 0;
let stopBrandGlitch = null;
let stopHeaderSymbols = null;
function startAmbientUi() {
  if (!stopBrandGlitch) stopBrandGlitch = startBrandGlitch({ stage });
  if (!stopHeaderSymbols) stopHeaderSymbols = startHeaderSymbols();
}
// Die Buehne meldet die Flaeche des Dokuments, bevor die Lesefassung existiert.
let readerRef = null;
let ihkProjectRef = null;

function ensureEnhancements() {
  if (enhancements || !stage || !(canvas instanceof HTMLCanvasElement)) {
    return enhancements;
  }

  try {
    enhancements = createExperienceEnhancements({
      stage,
      canvas,
      getRoute: () => currentRoute,
      isReaderOpen: () => readerIsOpen,
    });
    enhancements.setRoute(currentRoute);
    enhancements.setReaderOpen(readerIsOpen);
  } catch (error) {
    // Zusatzbeleuchtung darf niemals den Start der eigentlichen Seite blockieren.
    console.error('Optionale Szenenerweiterungen konnten nicht gestartet werden:', error);
    enhancements = null;
  }
  return enhancements;
}

function scheduleEnhancements(delay = 180) {
  window.clearTimeout(enhancementTimer);
  enhancementTimer = window.setTimeout(() => {
    enhancementTimer = 0;
    ensureEnhancements();
  }, Math.max(0, delay));
}

try {
  stage = createStage(canvas, {
    onDocumentRect: (rect) => {
      readerRef?.setRect(rect);
      ihkProjectRef?.setRect(rect);
    },
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
profileAccess.setStage(stage);

// Intro nur beim ersten Besuch, ohne Deep Link, mit WebGL und mit Bewegung.
// Die Kamera muss vor dem allerersten Bild in der Tiefe stehen.
const wantIntro = !!stage && shouldPlayIntro();
let introRunning = wantIntro;
if (introRunning) {
  try {
    stage.intro.begin();
  } catch (error) {
    // Auch ein defekter optionaler Intro-Hook darf die Website nicht sperren.
    console.error('Intro konnte nicht vorbereitet werden; starte ohne Intro:', error);
    introRunning = false;
    document.documentElement.classList.remove('pre-intro');
    try { stage?.intro?.finish?.(); } catch {}
  }
} else {
  document.documentElement.classList.remove('pre-intro');
}
stage?.start();

const reader = createReader({
  container: stageEl,
  onNavigate: (target) => router.go(target),
  // Vor dem Erscheinen blendet die Buehne die Projektion kontrolliert ab.
  onTransition: (open) => stage?.beginReaderTransition(open, 'lebenslauf'),
  onOpenChange: (open) => {
    readerIsOpen = open || Boolean(ihkProjectRef?.isOpen);
    updateFooter();
    stage?.setReaderOpen(readerIsOpen);
    const activeEnhancements = open ? ensureEnhancements() : enhancements;
    activeEnhancements?.setReaderOpen(readerIsOpen);
    download?.dock(open ? reader.actionSlot : null);
  },
});
readerRef = reader;
if (stage && reader) reader.setRect(stage.documentRect());

// Der Download taucht erst auf, wenn der Lebenslauf offen steht.
const download = createDownloadButton({ container: stageEl });

const unsubscribeExplored = onExploredChange(() => stage?.setExplored(getExplored()));

const ihkProject = createIhkProject({
  container: stageEl,
  onTransition: (open) => stage?.beginReaderTransition(open, 'abschluss'),
  onOpenChange: (open) => {
    readerIsOpen = open || Boolean(reader?.isOpen);
    stage?.setReaderOpen(readerIsOpen);
    enhancements?.setReaderOpen(readerIsOpen);
    updateFooter();
  },
  onNavigate: (target) => router.go(target),
});

ihkProjectRef = ihkProject;
if (stage) ihkProject.setRect(stage.documentRect());

let projectsBrowser;
const exampleProjection = createExampleProjection({
  stage, container: stageEl, onNavigate: target => router.go(target),
  setBrowserSuspended: value => projectsBrowser?.setSuspended(value),
});

projectsBrowser = createProjectsBrowser({ container: stageEl, stage, onNavigate: target => router.go(target) });

const router = createRouter({
  onMenuHover(key) { stage?.setMenuHover(key); },
  onEnter(target) {
    if (exampleProjection.isOpen) {
      exampleProjection.close(target);
      return;
    }
    const root = target.split('/')[0];

    // Der initiale Router-Aufruf darf den Kamera-Dolly des Intros nicht
    // sofort mit einer konkurrierenden Heimfahrt überschreiben.
    if (!introRunning) {
      if (root === 'home') stage?.toHome();
      else if (root !== 'projekte' || !currentRoute.startsWith('projekte')) stage?.focusCard(root);
    }
    stage?.setRoute(target);
    stage?.setExplored(getExplored());
    reader?.setRoute(target);
    ihkProject.setRoute(target);
    projectsBrowser.setRoute(target);
    download?.setVisible(root === 'lebenslauf');

    currentRoute = target;
    readerIsOpen = Boolean(reader?.isOpen || ihkProject.isOpen);
    stage?.setReaderOpen(readerIsOpen);
    if (['lebenslauf', 'abschluss'].includes(root) && !introRunning) ensureEnhancements();
    enhancements?.setRoute(target);
    updateFooter();
  },
});

async function activateFooterHint() {
  const root = currentRoute.split('/')[0] || 'home';

  if (root === 'home') {
    playSound('focus');
    ensureEnhancements()?.promptSectionChoice();
    return;
  }

  if (readerIsOpen) {
    await (currentRoute.split('/')[0] === 'abschluss' ? ihkProject : reader)?.close();
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

  // Leaving a reading view always folds it back into the projection before
  // the route changes. This prevents HTML reader and 3D camera states from
  // diverging when Home is selected directly from the breadcrumb.
  if (action === 'route' && readerIsOpen) {
    await (currentRoute.split('/')[0] === 'abschluss' ? ihkProject : reader)?.close();
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

  bootLimitTimer = window.setTimeout(() => {
    // A slow optional asset must not keep the boot overlay visible.
    stage?.releaseModelReveal();
    boot?.classList.add('is-done');
    stage?.settleQuality?.();
    scheduleEnhancements(0);
  }, BOOT_HARD_LIMIT);

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

  window.clearTimeout(bootLimitTimer);
  bootLimitTimer = 0;
  boot?.classList.add('is-done');
  stage?.settleQuality?.();
  // GPU-intensive extras start only after the usable scene is on screen.
  scheduleEnhancements();
  if (introRunning) {
    playIntro({
      stage,
      onDone() {
        introRunning = false;
        startAmbientUi();
      },
    });
  } else {
    igniteTitle(document.querySelector('.head__role'), { delay: 0.55 });
    startAmbientUi();
  }
}

beginExperience().catch((error) => {
  window.clearTimeout(bootLimitTimer);
  bootLimitTimer = 0;
  // A failed optional asset or intro step must never leave the boot overlay
  // in front of an otherwise usable WebGL scene.
  console.error('Initialisierung wurde mit Fallback abgeschlossen:', error);
  boot?.classList.add('is-done');
  document.documentElement.classList.remove('pre-intro');
  introRunning = false;
  try { stage?.intro?.finish?.(); } catch {}
  stage?.settleQuality?.();
  scheduleEnhancements(0);
  startAmbientUi();
});

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
    window.clearTimeout(bootLimitTimer);
    window.clearTimeout(enhancementTimer);
    enhancements?.dispose();
    reader?.dispose();
    ihkProject.dispose();
    exampleProjection.dispose();
    profileAccess.dispose();
    projectsBrowser.dispose();
    stopControlDistortion();
    download?.dispose();
    stage?.dispose();
  });
}

if (import.meta.env.DEV) window.__stage = stage;
