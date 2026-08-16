import gsap from 'gsap';
import { playSound } from './audio.js';

/**
 * Die Intro-Sequenz.
 *
 * Ablauf (cinematisch, jederzeit per Klick oder Taste ueberspringbar):
 *
 *   1. Nur der Raum. Die Kamera faehrt aus der Tiefe zurueck,
 *      die Runen glimmen im goldenen Takt (uAmbient steht auf 1).
 *   2. Der Name materialisiert sich Buchstabe fuer Buchstabe.
 *   3. Ein kurzer Tokyo-Neon-Impuls weckt das Sigil: farbige Geister
 *      springen in Streifen, Filmkorn und Bloom reissen mit.
 *   4. Erst danach blendet die Rollenbezeichnung langsam und ruhig ein,
 *      waehrend das Sigil erwacht — aeusseres Quadrat dreht nach links,
 *      mittleres nach rechts, der Kern pulsiert.
 *   5. Warp: der ganze Zug faehrt nach oben links und rastet exakt an
 *      seinem Platz in der Kopfzeile ein (das Element ist dasselbe,
 *      nur sein Transform faellt auf null zurueck — kein Duplikat).
 *
 * Der Schriftzug bleibt dabei durchgehend echtes DOM: ein Screenreader
 * liest ihn genau einmal, und nach dem Intro traegt er keinerlei Reste.
 */

/** Intro bei jedem echten Laden der Hauptseite, Deep Links bleiben direkt. */
export function shouldPlayIntro() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const hash = location.hash.replace(/^#/, '').trim();
  if (hash && hash !== 'home') return false;
  return true;
}

export function playIntro({ stage, onDone } = {}) {
  const frame = document.getElementById('frame');
  const nav = document.getElementById('nav');
  const stageEl = document.getElementById('stage');
  const brand = document.querySelector('.head__brand');
  const name = document.querySelector('.head__name');
  const role = document.querySelector('.head__role');
  const sigil = document.querySelector('.head__sigil');
  const rects = {
    outer: sigil.querySelector('.sigil__outer'),
    mid: sigil.querySelector('.sigil__mid'),
    core: sigil.querySelector('.sigil__core'),
  };

  document.documentElement.classList.remove('pre-intro');
  frame.classList.add('is-intro');
  nav.setAttribute('inert', '');
  name.classList.add('intro__source-hidden');
  gsap.set(role, { opacity: 0 });
  gsap.set(Object.values(rects), { scale: 0, transformOrigin: '50% 50%' });

  /* Die visuelle Buchstabenfassung ist aria-hidden. Das echte Namenselement
     bleibt als genau ein zugaenglicher Knoten erhalten. */
  const nameVisual = document.createElement('span');
  nameVisual.className = 'intro__name-letters';
  nameVisual.setAttribute('aria-hidden', 'true');
  const nameGlyphs = [...name.textContent].map((character) => {
    const glyph = document.createElement('span');
    glyph.className = character === ' ' ? 'intro__name-space' : 'intro__name-glyph';
    glyph.textContent = character === ' ' ? '\u00a0' : character;
    nameVisual.appendChild(glyph);
    return glyph;
  });
  brand.appendChild(nameVisual);

  const neonKinds = ['red', 'cyan', 'white'];
  const ghosts = neonKinds.map((kind) => {
    const ghost = document.createElement('span');
    ghost.className = `head__name intro__ghost intro__ghost--${kind}`;
    ghost.textContent = name.textContent;
    ghost.setAttribute('aria-hidden', 'true');
    brand.appendChild(ghost);
    return ghost;
  });
  const sigilGhosts = neonKinds.map((kind) => {
    const ghost = sigil.cloneNode(true);
    ghost.setAttribute('class', `head__sigil intro__sigil-ghost intro__sigil-ghost--${kind}`);
    ghost.setAttribute('aria-hidden', 'true');
    brand.appendChild(ghost);
    return ghost;
  });

  const fiberField = document.createElement('div');
  fiberField.className = 'intro__fiber-field';
  fiberField.setAttribute('aria-hidden', 'true');
  Array.from({ length: 13 }, (_, index) => {
    const fiber = document.createElement('i');
    fiber.style.setProperty('--fiber-index', index);
    fiber.style.setProperty('--fiber-phase', `${(index * 0.6180339887) % 1}`);
    fiberField.appendChild(fiber);
    return fiber;
  });
  stageEl.appendChild(fiberField);

  const introFilters = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  introFilters.setAttribute('class', 'intro__filters');
  introFilters.setAttribute('aria-hidden', 'true');
  introFilters.innerHTML = `
    <defs>
      <filter id="intro-signal-warp" x="-28%" y="-42%" width="156%" height="184%">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.028" numOctaves="2" seed="31" result="signalNoise">
          <animate attributeName="baseFrequency"
            values="0.006 0.028;0.012 0.018;0.004 0.034;0.006 0.028"
            dur="2.4s" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="signalNoise" scale="18"
          xChannelSelector="R" yChannelSelector="B" />
      </filter>
    </defs>`;
  stageEl.appendChild(introFilters);

  const signal = document.createElement('div');
  signal.className = 'intro__signal';
  signal.setAttribute('aria-hidden', 'true');
  const tears = Array.from({ length: 5 }, (_, index) => {
    const tear = document.createElement('i');
    tear.className = `intro__tear intro__tear--${index + 1}`;
    signal.appendChild(tear);
    return tear;
  });
  frame.appendChild(signal);

  const flash = document.createElement('div');
  flash.className = 'intro__flash';
  frame.appendChild(flash);

  let tl = null;
  let done = false;
  // Auch bei stark gedrosseltem WebGL/RAF darf die Navigation nie im
  // Intro-Zustand eingeschlossen bleiben.
  const safetyTimer = window.setTimeout(() => finalize(), 14000);

  function finalize(skipped = false) {
    if (done) return;
    done = true;
    window.clearTimeout(safetyTimer);
    tl?.kill();
    window.removeEventListener('pointerdown', skip, true);
    window.removeEventListener('keydown', skip, true);

    const roleGlyphs = role.querySelectorAll('.glyph');
    gsap.killTweensOf([
      brand, name, nameVisual, ...nameGlyphs, role, ...roleGlyphs, sigil,
      ...Object.values(rects), ...ghosts, ...sigilGhosts,
      fiberField, signal, ...tears, flash,
      stage.background.ambient,
    ]);

    nameVisual.remove();
    ghosts.forEach((ghost) => ghost.remove());
    sigilGhosts.forEach((ghost) => ghost.remove());
    fiberField.remove();
    introFilters.remove();
    signal.remove();
    flash.remove();

    name.classList.remove('intro__source-hidden');
    gsap.set([brand, name, role, sigil, ...Object.values(rects)], { clearProps: 'all' });
    if (roleGlyphs.length) gsap.set(roleGlyphs, { clearProps: 'all' });
    Object.values(rects).forEach((rect) => {
      rect.removeAttribute('transform');
      rect.removeAttribute('data-svg-origin');
      rect.style.removeProperty('transform-origin');
    });

    frame.classList.remove('is-intro');
    document.documentElement.classList.remove('pre-intro');
    brand.classList.remove('is-signal-break');
    brand.style.removeProperty('filter');
    nav.removeAttribute('inert');
    stage.setGlitch(0);
    stage.intro.finish();
    stage.background.ambient.value = 0.18;
    if (skipped) stage.toHome(0.9);
    onDone?.();
  }

  function skip() { finalize(true); }
  window.addEventListener('pointerdown', skip, { capture: true, once: true });
  window.addEventListener('keydown', skip, { capture: true, once: true });

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, 1200))]).then(build);

  function build() {
    if (done) return;

    const frameRect = frame.getBoundingClientRect();
    const brandRect = brand.getBoundingClientRect();
    const scaleTo = Math.min(2.3, (frameRect.width * 0.86) / brandRect.width);
    const dx = frameRect.left + frameRect.width / 2 - (brandRect.left + brandRect.width / 2);
    const dy = frameRect.top + frameRect.height * 0.47 - (brandRect.top + brandRect.height / 2);
    gsap.set(brand, { x: dx, y: dy, scale: scaleTo, transformOrigin: '50% 50%' });

    const namePlacement = {
      left: name.offsetLeft,
      top: name.offsetTop,
      width: name.offsetWidth,
      height: name.offsetHeight,
    };
    gsap.set([nameVisual, ...ghosts], namePlacement);
    gsap.set(sigilGhosts, {
      left: sigil.offsetLeft,
      top: sigil.offsetTop,
      width: sigil.offsetWidth,
      height: sigil.offsetHeight,
    });
    gsap.set(nameGlyphs, { opacity: 0 });
    gsap.set([signal, flash], { opacity: 0 });
    gsap.set(fiberField, { opacity: 0, scaleY: 0.72, transformOrigin: '50% 100%' });

    tl = gsap.timeline({ onComplete: finalize });

    /* 1 — Drei Sekunden lebt nur die verteilte Symbolarchitektur. */
    tl.call(() => stage.intro.play(5.0), null, 0);
    tl.to(fiberField, {
      opacity: 0.58,
      scaleY: 1,
      duration: 2.1,
      ease: 'power2.out',
    }, 0.08);

    /* 2 — Der Name materialisiert sich ruhig von links nach rechts. */
    tl.fromTo(nameGlyphs,
      {
        opacity: 0,
        x: (index) => (index % 2 ? 4 : -3),
        y: (index) => (index % 3 - 1) * 4,
        filter: 'blur(3px)',
        textShadow: '0 0 0 rgba(127,212,255,0)',
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        filter: 'blur(0px)',
        textShadow: '0 0 10px rgba(127,212,255,.6), 0 0 22px rgba(240,160,60,.22)',
        duration: 0.62,
        stagger: 0.145,
        ease: 'power2.out',
      },
      3.28);
    // Ein einziger Impuls quittiert den fertig aufgebauten Schriftzug; er
    // faellt genau dann, wenn der letzte Buchstabe steht.
    tl.call(() => playSound('build'), null, 3.28 + (nameGlyphs.length - 1) * 0.145 + 0.62);
    tl.to(nameGlyphs,
      { textShadow: '0 0 0 rgba(127,212,255,0)', duration: 0.75, stagger: 0.035 },
      4.05);
    // Der Schriftzug steht: erst jetzt faellt der Klang, danach erst setzt
    // sich die Buehne in Bewegung.
    tl.call(() => playSound('warp'), null, 5.8);
    tl.call(() => name.classList.remove('intro__source-hidden'), null, 5.82);
    tl.to(nameVisual, { opacity: 0, duration: 0.22, ease: 'power1.out' }, 5.82);
    tl.to(fiberField, { opacity: 0.16, duration: 1.3, ease: 'power1.inOut' }, 5.45);

    /* 3 — Ein kurzer analoger Signalverlust weckt das Sigil. */
    tl.call(() => {
      signal.classList.add('is-active');
      brand.classList.add('is-signal-break');
      brand.style.filter = 'url(#intro-signal-warp)';
    }, null, 6.12);
    tl.to(signal, { opacity: 0.82, duration: 0.06, ease: 'none' }, 6.12);
    let glitchTime = 6.14;
    for (let i = 0; i < 11; i++) {
      for (const ghost of ghosts) {
        const top = gsap.utils.random(0, 76);
        const bottom = Math.max(0, 94 - top - gsap.utils.random(5, 22));
        tl.set(ghost, {
          opacity: gsap.utils.random(0.55, 1),
          x: gsap.utils.random(-15, 15),
          y: gsap.utils.random(-3, 3),
          clipPath: `inset(${top}% 0 ${bottom}% 0)`,
        }, glitchTime);
      }
      for (const ghost of sigilGhosts) {
        const top = gsap.utils.random(0, 74);
        const bottom = Math.max(0, 95 - top - gsap.utils.random(5, 24));
        tl.set(ghost, {
          opacity: gsap.utils.random(0.6, 1),
          x: gsap.utils.random(-13, 13),
          y: gsap.utils.random(-4, 4),
          scale: gsap.utils.random(0.9, 1.15),
          clipPath: `inset(${top}% 0 ${bottom}% 0)`,
        }, glitchTime);
      }
      tears.forEach((tear) => tl.set(tear, {
        x: gsap.utils.random(-42, 42),
        opacity: gsap.utils.random(0.25, 0.9),
      }, glitchTime));
      tl.set(brand, {
        scale: scaleTo * gsap.utils.random(0.97, 1.045),
        skewX: gsap.utils.random(-5.5, 5.5),
        y: dy + gsap.utils.random(-7, 7),
      }, glitchTime);
      tl.set(name, { x: gsap.utils.random(-6, 6), skewX: gsap.utils.random(-4, 4) }, glitchTime);
      tl.set(sigil, {
        x: gsap.utils.random(-5, 5),
        y: gsap.utils.random(-3, 3),
        scale: gsap.utils.random(0.93, 1.1),
        skewX: gsap.utils.random(-8, 8),
      }, glitchTime);
      tl.call(() => stage.setGlitch(gsap.utils.random(0.55, 1)), null, glitchTime);
      glitchTime += gsap.utils.random(0.038, 0.072);
    }
    tl.set([...ghosts, ...sigilGhosts, ...tears], { opacity: 0 }, glitchTime);
    tl.set(brand, { scale: scaleTo, skewX: 0, y: dy }, glitchTime);
    tl.set(name, { x: 0, skewX: 0 }, glitchTime);
    tl.set(sigil, { x: 0, y: 0, scale: 1, skewX: 0 }, glitchTime);
    tl.call(() => {
      signal.classList.remove('is-active');
      brand.classList.remove('is-signal-break');
      brand.style.removeProperty('filter');
      stage.setGlitch(0);
    }, null, glitchTime);
    tl.to(signal, { opacity: 0, duration: 0.18 }, glitchTime);

    /* 4 — Nach dem vollstaendigen Namen atmet die Unterschrift langsam ein. */
    tl.fromTo(role,
      { opacity: 0, y: 5, filter: 'blur(4px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 3.4, ease: 'power1.inOut' },
      7.05);

    /* GSAP endet bei exakt null Grad; dort uebernehmen die CSS-Dauerspuren. */
    tl.fromTo(rects.outer, { rotation: 630 }, { rotation: 0, duration: 8.65, ease: 'none' }, 6.2);
    tl.to(rects.outer, { scale: 1, duration: 2.45, ease: 'power3.out' }, 6.2);
    tl.fromTo(rects.mid, { rotation: -630 }, { rotation: 0, duration: 8.6, ease: 'none' }, 6.25);
    tl.to(rects.mid, { scale: 1, duration: 2.45, ease: 'power3.out' }, 6.25);
    tl.fromTo(rects.core,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 0.4, duration: 1.65, ease: 'power2.out' },
      6.3);
    tl.to(rects.core, {
      opacity: 0.95,
      scale: 1.35,
      duration: 1.05,
      yoyo: true,
      repeat: 5,
      ease: 'sine.inOut',
    }, 8.2);

    /* 5 — Der unveraenderte DOM-Markenzug rastet pixelgenau im Header ein. */
    tl.to(brand, { scale: scaleTo * 0.94, duration: 0.55, ease: 'power2.in' }, 12.15);
    tl.call(() => {
      gsap.killTweensOf(role);
      role.style.textShadow = '';
      stage.intro.recoil();
      // Erst mit dem Warp des Schriftzugs steigen die Sockel aus der Tiefe.
      stage.intro.revealWorld(2.35);
    }, null, 12.7);
    tl.to(brand, { x: 0, y: 0, scale: 1, duration: 2.35, ease: 'power4.inOut' }, 12.7);
    tl.fromTo(flash,
      { opacity: 0.5, scale: 0.4 },
      { opacity: 0, scale: 1.6, duration: 1.2, ease: 'power2.out' },
      12.7);
    tl.to(stage.background.ambient,
      { value: 0.18, duration: 3.7, ease: 'power1.inOut' },
      11.2);

    // Bewusst filmisches Tempo: die Sequenz laeuft rund zwei Sekunden laenger
    // als die fruehere Fassung und laesst jedem Moment Raum zum Nachklingen.
    tl.timeScale(1.55);
  }
}
