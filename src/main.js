import './style.css';
import { createStage } from './scene/stage.js';
import { createRouter } from './ui/router.js';
import { igniteTitle } from './ui/title.js';
import { shouldPlayIntro, playIntro } from './ui/intro.js';
import { startBrandGlitch } from './ui/glitch.js';
import { createReader } from './ui/reader.js';
import { createDownloadButton } from './ui/download.js';
import { getExplored, onExploredChange } from './state/explored.js';
import { primeSounds, playSound } from './ui/audio.js';

const canvas = document.getElementById('scene');
const boot = document.getElementById('boot');
const stageEl = document.getElementById('stage');
const crumb = document.getElementById('crumb');
const hint = document.getElementById('hint');
const foot = document.querySelector('.foot');

const ROUTE_LABELS = Object.freeze({
  home: 'Home',
  abschluss: 'Abschlussprojekt',
  server: 'Server',
  uem: 'UEM',
  clients: 'Clients',
  migration: 'Migration',
  projekte: 'Private IT-Projekte',
  homelab: 'Homelab',
  automation: 'Automatisierung',
  web: 'Web',
  lebenslauf: 'Lebenslauf',
  arbeitsleben: 'Werdegang',
  bildungsweg: 'Ausbildung',
  faehigkeiten: 'Kompetenzen',
  kontakt: 'Kontakt',
});

let currentRoute = 'home';
let readerIsOpen = false;

function formatRoute(target, { includeReader = false } = {}) {
  const segments = String(target || 'home')
    .split('/')
    .filter(Boolean);
  const labels = segments
    .map((segment) => ROUTE_LABELS[segment] || segment);

  if (includeReader && segments[0] === 'lebenslauf') {
    // Lesefassung ist ein Darstellungsmodus innerhalb des Lebenslaufs.
    // Unterbereiche bleiben dahinter sichtbar, zum Beispiel:
    // Lebenslauf > Lesefassung > Kompetenzen.
    labels.splice(1, 0, 'Lesefassung');
  }

  return labels.join(' > ');
}

function updateFooter() {
  const root = currentRoute.split('/')[0] || 'home';
  const escapable = root !== 'home';
  crumb.textContent = formatRoute(currentRoute, {
    includeReader: readerIsOpen,
  });

  if (hint instanceof HTMLButtonElement) {
    const lead = root === 'home'
      ? 'Bereich wählen'
      : root === 'lebenslauf'
        ? readerIsOpen
          ? 'Abschnitt wählen · Scrollen ·'
          : 'Scrollen zum Weiterlesen ·'
        : '';
    const escapeLabel = escapable
      ? readerIsOpen
        ? 'ESC zur Projektion'
        : 'ESC zurück'
      : '';

    hint.innerHTML = [
      lead ? `<span class="foot__hint-lead">${lead}</span>` : '',
      escapeLabel ? `<span class="foot__esc-label">${escapeLabel}</span>` : '',
    ].filter(Boolean).join(' ');
    hint.disabled = !escapable;
    hint.setAttribute(
      'aria-label',
      readerIsOpen
        ? 'Zur Projektion zurückkehren'
        : escapable
          ? 'Zum Hauptbereich zurückkehren'
          : 'Kein Rücksprung verfügbar',
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
    fallback.textContent =
      'Die 3D-Szene konnte nicht gestartet werden. Bitte WebGL bzw. Hardwarebeschleunigung im Browser aktivieren.';
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
  // Die kurzen Signale liegen bereit, bevor sie das erste Mal gebraucht
  // werden; ohne Nutzergeste bleiben sie schlicht stumm.
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
      },
    });
  } else {
    igniteTitle(document.querySelector('.head__role'), { delay: 0.55 });
    stopBrandGlitch = startBrandGlitch({ stage });
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
    unsubscribeExplored();
    stopBrandGlitch?.();
    reader?.dispose();
    download?.dispose();
    stage?.dispose();
  });
}

if (import.meta.env.DEV) window.__stage = stage;
