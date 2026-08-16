/**
 * Die Klangebene der Buehne.
 *
 * Wenige kurze Signale, mehr nicht: der Aufbau und der Absprung des Intros
 * sowie das Heran- und Herausfahren an einen Sockel. Knoepfe bleiben stumm.
 * Jeder Ruf bleibt folgenlos, wenn der Browser das Abspielen ohne Nutzergeste
 * verweigert — die Seite funktioniert vollstaendig ohne Ton.
 *
 * Jeder Klang besitzt ein vorgeladenes Element, das beim ersten Startsignal
 * freigeschaltet und danach fuer kurze, direkt aufeinanderfolgende Impulse
 * an den Anfang gesetzt wird.
 */

const SOURCES = {
  build: new URL('../../sounds/combeep1.wav', import.meta.url).href,
  warp: new URL('../../sounds/pbewht00.wav', import.meta.url).href,
  focus: new URL('../../sounds/tdrtra00.wav', import.meta.url).href,
  release: new URL('../../sounds/tdrtra01.wav', import.meta.url).href,
};

// Bewusst zurueckhaltend: nochmals rund vierzig Prozent leiser.
const VOLUME = {
  // Der Aufbau tickt Buchstabe fuer Buchstabe; darum deutlich leiser.
  build: 0.1,
  warp: 0.2,
  focus: 0.18,
  release: 0.18,
};

const cache = new Map();

/** Grundelement je Klang; es dient nur als Vorlage und spielt selbst nie. */
function base(name) {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(SOURCES[name]);
    audio.preload = 'auto';
    cache.set(name, audio);
  }
  return audio;
}

/** Alle Dateien im Hintergrund holen, damit der erste Ruf nicht wartet. */
export function primeSounds() {
  for (const name of Object.keys(SOURCES)) base(name).load();
}

/**
 * Solange keine Nutzergeste vorlag, weist der Browser jedes Abspielen ab.
 * Der erste Zeiger- oder Tastendruck schaltet die Tonspur mit einem stummen
 * Probelauf frei; danach klingen alle weiteren Rufe. Ein waehrend der Sperre
 * abgewiesener Klang — etwa das Signal des Intros — wird dabei nachgeholt.
 */
const GESTURES = ['pointerdown', 'keydown', 'touchstart'];
let unlocked = false;
let pending = null;
let resolveUnlock;
const unlockPromise = new Promise((resolve) => { resolveUnlock = resolve; });

function unlock() {
  if (unlocked) return;
  unlocked = true;
  for (const type of GESTURES) window.removeEventListener(type, unlock, true);
  for (const name of Object.keys(SOURCES)) {
    const audio = base(name);
    audio.volume = 0;
    const started = audio.play();
    if (started && typeof started.then === 'function') {
      started.then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    }
  }
  resolveUnlock();
  if (pending) {
    const name = pending;
    pending = null;
    playSound(name);
  }
}

for (const type of GESTURES) window.addEventListener(type, unlock, true);

export function waitForSoundUnlock() {
  return unlocked ? Promise.resolve() : unlockPromise;
}

export function playSound(name) {
  if (!(name in SOURCES)) return;
  const audio = base(name);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = VOLUME[name] ?? 0.3;
  const started = audio.play();
  if (started && typeof started.catch === 'function') {
    started.catch(() => {
      if (!unlocked) pending = name;
    });
  }
}
