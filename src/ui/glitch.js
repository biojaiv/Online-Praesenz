import gsap from 'gsap';

/**
 * Wiederkehrende Tokyo-Verzerrung auf dem Markenzug oben links.
 *
 * Stilvorlage ist die Glitch-Frame-Sammlung: der weisse Grundzug bleibt
 * stehen, waehrend farbige Kopien (Cyan, Magenta, Limette) in schmale,
 * versetzte Slices zerschnitten aufblitzen. Kein Filter-Blur, nur
 * Compositing — dieselbe Technik wie der Intro-Signalbruch.
 *
 * Damit sich der Effekt nie wiederholt anfuehlt, gibt es fuenf Stoerungsarten
 * mit eigenem Rhythmus und eigener Textur:
 *
 *   tear     horizontale Rissbaender, klassisches Kanalversatzbild
 *   slice    senkrechte Spalten, das Wort bricht in Saeulen auseinander
 *   roll     ein Stoerband wandert von oben nach unten durch den Zug
 *   dropout  kurzer Signalabriss mit Invertierung und Nachzuender
 *   wash     symmetrische Farbsaumung, weich und lang, ohne Versatz
 *
 * Selten folgt einem Burst direkt ein zweiter — ein Nachbeben.
 */

const GHOST_KINDS = ['cyan', 'magenta', 'lime'];

// Auftrittswahrscheinlichkeiten der Stoerungsarten. Die ruhigeren Arten
// laufen haeufiger, der harte Signalabriss bleibt ein seltenes Ereignis.
const BURST_KINDS = [
  { kind: 'tear',    weight: 30 },
  { kind: 'slice',   weight: 22 },
  { kind: 'roll',    weight: 20 },
  { kind: 'wash',    weight: 18 },
  { kind: 'dropout', weight: 10 },
];

const TOTAL_WEIGHT = BURST_KINDS.reduce((sum, entry) => sum + entry.weight, 0);

function pickKind() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const entry of BURST_KINDS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.kind;
  }
  return 'tear';
}

const rand = gsap.utils.random;

export function startBrandGlitch({ stage } = {}) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }
  const brand = document.querySelector('.head__brand');
  const name = brand?.querySelector('.head__name');
  const sigil = brand?.querySelector('.head__sigil');
  if (!brand || !name) return () => {};

  const ghosts = GHOST_KINDS.map((kind) => {
    const ghost = document.createElement('span');
    ghost.className = `head__name glitch-ghost glitch-ghost--${kind}`;
    ghost.textContent = name.textContent;
    ghost.setAttribute('aria-hidden', 'true');
    brand.appendChild(ghost);
    return ghost;
  });
  const sigilGhosts = sigil
    ? GHOST_KINDS.map((kind) => {
        const ghost = sigil.cloneNode(true);
        ghost.setAttribute(
          'class',
          `head__sigil glitch-ghost glitch-sigil-ghost glitch-sigil-ghost--${kind}`,
        );
        ghost.setAttribute('aria-hidden', 'true');
        brand.appendChild(ghost);
        return ghost;
      })
    : [];
  const allGhosts = [...ghosts, ...sigilGhosts];
  gsap.set(allGhosts, { opacity: 0 });

  let timer = 0;
  let tl = null;
  let stopped = false;

  function schedule(delay) {
    if (stopped) return;
    timer = window.setTimeout(burst, delay ?? 5200 + Math.random() * 9000);
  }

  /** Platzierung je Burst neu messen, damit Resizes nie danebenliegen. */
  function measure() {
    gsap.set(ghosts, {
      left: name.offsetLeft,
      top: name.offsetTop,
      width: name.offsetWidth,
      height: name.offsetHeight,
    });
    if (sigil) {
      gsap.set(sigilGhosts, {
        left: sigil.offsetLeft,
        top: sigil.offsetTop,
        width: sigil.offsetWidth,
        height: sigil.offsetHeight,
      });
    }
  }

  /** Waagerechtes Rissband. */
  function bandClip(minHeight, maxHeight) {
    const top = rand(0, 100 - maxHeight);
    const height = rand(minHeight, maxHeight);
    return `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)`;
  }

  /** Senkrechte Spalte. */
  function columnClip(minWidth, maxWidth) {
    const left = rand(0, 100 - maxWidth);
    const width = rand(minWidth, maxWidth);
    return `inset(0 ${Math.max(0, 100 - left - width)}% 0 ${left}%)`;
  }

  /* ---------- Stoerungsarten ---------- */

  function tear(timeline, cursor) {
    const frames = 6 + Math.floor(Math.random() * 5);
    let at = cursor;
    for (let i = 0; i < frames; i++) {
      for (const ghost of ghosts) {
        timeline.set(ghost, {
          opacity: rand(0.5, 0.95),
          x: rand(-13, 13),
          y: rand(-2, 2),
          scaleX: rand(0.97, 1.05),
          clipPath: bandClip(4, 22),
        }, at);
      }
      for (const ghost of sigilGhosts) {
        timeline.set(ghost, {
          opacity: rand(0.5, 0.95),
          x: rand(-9, 9),
          y: rand(-3, 3),
          clipPath: bandClip(6, 26),
        }, at);
      }
      timeline.set(name, { x: rand(-4, 4), skewX: rand(-3, 3) }, at);
      if (sigil) timeline.set(sigil, { x: rand(-3, 3), skewX: rand(-5, 5) }, at);
      timeline.call(() => stage?.setGlitch(rand(0.2, 0.42)), null, at);
      at += rand(0.04, 0.075);
    }
    return at;
  }

  function slice(timeline, cursor) {
    // Das Wort bricht in senkrechte Saeulen, die gegeneinander wandern.
    const frames = 5 + Math.floor(Math.random() * 4);
    let at = cursor;
    for (let i = 0; i < frames; i++) {
      ghosts.forEach((ghost, index) => {
        timeline.set(ghost, {
          opacity: rand(0.55, 1),
          x: (index % 2 ? 1 : -1) * rand(3, 16),
          y: rand(-5, 5),
          clipPath: columnClip(8, 30),
        }, at);
      });
      for (const ghost of sigilGhosts) {
        timeline.set(ghost, {
          opacity: rand(0.4, 0.85),
          x: rand(-6, 6),
          clipPath: columnClip(15, 45),
        }, at);
      }
      timeline.set(name, {
        x: rand(-3, 3),
        skewX: 0,
        scaleX: rand(0.94, 1.07),
      }, at);
      timeline.call(() => stage?.setGlitch(rand(0.24, 0.5)), null, at);
      at += rand(0.05, 0.09);
    }
    timeline.set(name, { scaleX: 1 }, at);
    return at;
  }

  function roll(timeline, cursor) {
    // Ein Stoerband wandert gleichmaessig von oben nach unten durch den Zug.
    const steps = 9 + Math.floor(Math.random() * 5);
    const height = rand(9, 17);
    let at = cursor;
    for (let i = 0; i < steps; i++) {
      const top = (i / (steps - 1)) * (100 - height);
      const clip = `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)`;
      ghosts.forEach((ghost, index) => {
        timeline.set(ghost, {
          opacity: 0.85,
          x: (index - 1) * rand(4, 9),
          y: 0,
          scaleX: 1,
          clipPath: clip,
        }, at);
      });
      for (const ghost of sigilGhosts) {
        timeline.set(ghost, { opacity: i % 2 ? 0.7 : 0, x: rand(-4, 4), clipPath: clip }, at);
      }
      timeline.set(name, { x: rand(-1.5, 1.5), skewX: 0 }, at);
      timeline.call(() => stage?.setGlitch(0.16 + (1 - Math.abs(0.5 - i / steps) * 2) * 0.26), null, at);
      at += 0.035;
    }
    return at;
  }

  function dropout(timeline, cursor) {
    // Signalabriss: der Zug verschwindet kurz, kommt invertiert zurueck und
    // zerfaellt danach in ein paar harte Nachzuender.
    let at = cursor;
    timeline.set(name, { opacity: 0.06, x: rand(-16, 16), skewX: rand(-9, 9) }, at);
    timeline.set(allGhosts, { opacity: 0 }, at);
    timeline.call(() => stage?.setGlitch(0.85), null, at);
    at += rand(0.06, 0.1);

    timeline.set(name, { opacity: 1, filter: 'invert(1)', x: rand(-6, 6), skewX: 0 }, at);
    ghosts.forEach((ghost, index) => {
      timeline.set(ghost, {
        opacity: 1,
        x: (index - 1) * 12,
        y: rand(-3, 3),
        clipPath: 'inset(0 0 0 0)',
      }, at);
    });
    timeline.call(() => stage?.setGlitch(1), null, at);
    at += rand(0.05, 0.08);

    timeline.set(name, { filter: 'none' }, at);
    for (let i = 0; i < 4; i++) {
      for (const ghost of ghosts) {
        timeline.set(ghost, {
          opacity: rand(0.4, 0.9),
          x: rand(-20, 20),
          y: rand(-4, 4),
          clipPath: bandClip(5, 30),
        }, at);
      }
      for (const ghost of sigilGhosts) {
        timeline.set(ghost, { opacity: rand(0.3, 0.9), x: rand(-10, 10), clipPath: bandClip(8, 34) }, at);
      }
      timeline.set(name, { x: rand(-7, 7), skewX: rand(-6, 6) }, at);
      timeline.call(() => stage?.setGlitch(rand(0.35, 0.7)), null, at);
      at += rand(0.04, 0.07);
    }
    return at;
  }

  function wash(timeline, cursor) {
    // Weiche Farbsaumung ohne Zerschneiden: der Zug bekommt kurz einen
    // beidseitigen Chromasaum und atmet ihn wieder aus.
    let at = cursor;
    const reach = rand(3, 7);
    timeline.set(ghosts, { clipPath: 'inset(0 0 0 0)', y: 0, scaleX: 1 }, at);
    ghosts.forEach((ghost, index) => {
      timeline.to(ghost, {
        opacity: 0.62,
        x: (index - 1) * reach,
        duration: 0.16,
        ease: 'power2.out',
      }, at);
    });
    for (const ghost of sigilGhosts) {
      timeline.to(ghost, { opacity: 0.4, x: rand(-3, 3), duration: 0.16 }, at);
    }
    timeline.call(() => stage?.setGlitch(0.3), null, at);
    at += 0.16;

    // Zwei kurze Zuckungen mitten im Saum, damit es nicht nur weich ist.
    for (let i = 0; i < 2; i++) {
      for (const ghost of ghosts) {
        timeline.set(ghost, { x: rand(-14, 14), clipPath: bandClip(6, 20) }, at);
      }
      timeline.call(() => stage?.setGlitch(rand(0.4, 0.6)), null, at);
      at += 0.05;
      timeline.set(ghosts, { clipPath: 'inset(0 0 0 0)' }, at);
      at += 0.05;
    }

    ghosts.forEach((ghost, index) => {
      timeline.to(ghost, {
        opacity: 0,
        x: (index - 1) * reach * 0.3,
        duration: 0.3,
        ease: 'power2.inOut',
      }, at);
    });
    timeline.to(sigilGhosts, { opacity: 0, duration: 0.3 }, at);
    at += 0.3;
    return at;
  }

  const ROUTINES = { tear, slice, roll, dropout, wash };

  function burst() {
    if (stopped) return;
    measure();

    tl = gsap.timeline({ onComplete: () => schedule() });
    let at = 0;

    // Selten folgt direkt ein Nachbeben aus einer anderen Stoerungsart.
    const kinds = [pickKind()];
    if (Math.random() < 0.22) {
      let second = pickKind();
      if (second === kinds[0]) second = 'tear';
      kinds.push(second);
    }

    for (const kind of kinds) {
      at = ROUTINES[kind](tl, at);
      if (kinds.length > 1) {
        // Kurze Ruhe zwischen den beiden Wellen.
        tl.set(allGhosts, { opacity: 0 }, at);
        tl.set(name, { x: 0, skewX: 0, scaleX: 1 }, at);
        tl.call(() => stage?.setGlitch(0), null, at);
        at += rand(0.09, 0.2);
      }
    }

    tl.set(allGhosts, { opacity: 0, clipPath: 'inset(0 0 0 0)', x: 0, y: 0 }, at);
    tl.set(name, { x: 0, y: 0, skewX: 0, scaleX: 1, opacity: 1, filter: 'none' }, at);
    if (sigil) tl.set(sigil, { x: 0, skewX: 0 }, at);
    tl.call(() => stage?.setGlitch(0), null, at);
  }

  schedule();

  return function stop() {
    stopped = true;
    window.clearTimeout(timer);
    tl?.kill();
    ghosts.forEach((ghost) => ghost.remove());
    sigilGhosts.forEach((ghost) => ghost.remove());
    gsap.set([name, sigil].filter(Boolean), { clearProps: 'transform,filter,opacity' });
    stage?.setGlitch(0);
  };
}
