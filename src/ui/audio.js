/**
 * Die Klangebene der Buehne.
 *
 * Kurze Signale fuer Momente, die etwas bedeuten: Aufbau und Absprung des
 * Intros, Sockel und Menue, das Portal (Aufladen, Entfalten, Herunterfahren),
 * das 30-Sekunden-Profil und Ladefehler. Keine Dauerschleifen. Jeder Klang
 * spielt bis zu seinem eigenen Ende; `stopSound` kann ihn vorzeitig ausblenden.
 * Jeder Ruf bleibt folgenlos, wenn der Browser das Abspielen ohne Nutzergeste
 * verweigert — die Seite funktioniert vollstaendig ohne Ton.
 *
 * Jeder Klang besitzt ein vorgeladenes Element, das beim ersten Startsignal
 * freigeschaltet und danach fuer kurze, direkt aufeinanderfolgende Impulse
 * an den Anfang gesetzt wird.
 */

const losslessAudio = document.createElement('audio').canPlayType('audio/flac');
const lossless = (flac, wav) => (losslessAudio ? flac : wav).href;
const SOURCES = {
  build: lossless(new URL('../../sounds/combeep1.flac', import.meta.url), new URL('../../sounds/combeep1.wav', import.meta.url)),
  warp: lossless(new URL('../../sounds/Start.flac', import.meta.url), new URL('../../sounds/pbewht00.wav', import.meta.url)),
  focus: lossless(new URL('../../sounds/tdrtra00.flac', import.meta.url), new URL('../../sounds/tdrtra00.wav', import.meta.url)),
  release: lossless(new URL('../../sounds/tdrtra01.flac', import.meta.url), new URL('../../sounds/tdrtra01.wav', import.meta.url)),
  // Menu buttons at the top right and the language switch.
  menu: lossless(new URL('../../sounds/Menue_Knöpfe_rechts_oben.flac', import.meta.url), new URL('../../sounds/Menue_Knöpfe_rechts_oben.wav', import.meta.url)),
  // Pointer comes to rest on a pedestal.
  pedestal: new URL('../../sounds/Sockelauswahlgeräusch.mp3', import.meta.url).href,
  // Portal: power up on selection, machinery while unfolding, power down on close.
  charge: lossless(new URL('../../sounds/ppbwht00.flac', import.meta.url), new URL('../../sounds/ppbwht00.wav', import.meta.url)),
  unfold: lossless(new URL('../../sounds/dronemachine3.flac', import.meta.url), new URL('../../sounds/dronemachine3.wav', import.meta.url)),
  powerdown: lossless(new URL('../../sounds/ppwrdown.flac', import.meta.url), new URL('../../sounds/ppwrdown.wav', import.meta.url)),
  // 30-second profile: incoming briefing and completed reading time.
  transmit: lossless(new URL('../../sounds/t2b00tad.flac', import.meta.url), new URL('../../sounds/t2b00tad.wav', import.meta.url)),
  complete: lossless(new URL('../../sounds/ppywht00.flac', import.meta.url), new URL('../../sounds/ppywht00.wav', import.meta.url)),
  // A page could not be loaded.
  warn: lossless(new URL('../../sounds/warn1.flac', import.meta.url), new URL('../../sounds/warn1.wav', import.meta.url)),
};

// Bewusst zurueckhaltend: nochmals rund vierzig Prozent leiser.
const VOLUME = {
  // Der Aufbau tickt Buchstabe fuer Buchstabe; darum deutlich leiser.
  build: 0.1,
  warp: 0.2,
  focus: 0.18,
  release: 0.18,
  menu: 0.16,
  pedestal: 0.14,
  charge: 0.16,
  unfold: 0.12,
  powerdown: 0.16,
  transmit: 0.08,
  complete: 0.08,
  warn: 0.16,
};
// Hover signals repeat at most this often (ms).
const SPACING = { menu: 90, pedestal: 250 };

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

/** Load only after audio is unlocked; blocked autoplay must not compete with the scene. */
export function primeSounds() {
  if (unlocked) for (const name of Object.keys(SOURCES)) base(name).load();
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

const fades = new Map(), lastPlayed = new Map();

function fade(name, audio, to, duration, then) {
  cancelAnimationFrame(fades.get(name));
  const from = audio.volume, start = performance.now();
  const step = now => {
    const t = Math.min(1, (now - start) / Math.max(1, duration));
    audio.volume = from + (to - from) * t;
    if (t < 1) fades.set(name, requestAnimationFrame(step));
    else { fades.delete(name); then?.(); }
  };
  fades.set(name, requestAnimationFrame(step));
}

/**
 * Play a signal. `queue: false` drops it while audio is still locked instead of
 * replaying it after the first gesture (for signals that only make sense now).
 */
export function playSound(name, { queue = true } = {}) {
  if (!(name in SOURCES)) return;
  if (!unlocked) { if (queue) pending = name; return; }
  const now = performance.now();
  if (SPACING[name] && now - (lastPlayed.get(name) ?? -Infinity) < SPACING[name]) return;
  lastPlayed.set(name, now);
  const audio = base(name);
  cancelAnimationFrame(fades.get(name));
  audio.pause();
  audio.currentTime = 0;
  audio.volume = VOLUME[name] ?? 0.3;
  const started = audio.play();
  if (started && typeof started.catch === 'function') {
    started.catch(() => {
      if (!unlocked && queue) pending = name;
    });
  }
}

/** Fade a running signal out (e.g. when the pointer leaves what triggered it). */
export function stopSound(name, duration = 220) {
  const audio = cache.get(name);
  if (!audio || audio.paused) return;
  if (pending === name) pending = null;
  fade(name, audio, 0, duration, () => { audio.pause(); audio.currentTime = 0; });
}
