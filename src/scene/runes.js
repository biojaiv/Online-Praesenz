/**
 * Runen und verwandte Zeichen.
 *
 * Jedes Zeichen ist als Strichzug in einer Einheitsbox definiert
 * (x und y jeweils etwa -1 bis 1) und wird als Liniensegmente gezeichnet.
 * Das passt zur Herkunft: Runen wurden geritzt, nicht geschrieben.
 *
 * Primaer: Aelteres Futhark, sechs Zeichen mit der gewuenschten Bedeutung.
 * Sekundaer: Ogham und alchemistische Zeichen als stilles Beiwerk.
 */

/** [x1, y1, x2, y2] je Strich */
const F = (...s) => s;

const box = (x0, y0, x1, y1) => [
  F(x0, y0, x1, y0), F(x1, y0, x1, y1),
  F(x1, y1, x0, y1), F(x0, y1, x0, y0),
];

const arc = (cx, cy, rx, ry, start = 0, end = Math.PI * 2, steps = 12) => {
  const strokes = [];
  for (let i = 0; i < steps; i++) {
    const a = start + (end - start) * (i / steps);
    const b = start + (end - start) * ((i + 1) / steps);
    strokes.push(F(
      cx + Math.cos(a) * rx, cy + Math.sin(a) * ry,
      cx + Math.cos(b) * rx, cy + Math.sin(b) * ry,
    ));
  }
  return strokes;
};

export const RUNES = {
  /* ---------- Aelteres Futhark ---------- */

  // Fehu — Vieh, beweglicher Besitz -> Wohlstand
  fehu: {
    name: 'Fehu',
    meaning: 'Wohlstand',
    strokes: [
      F(0, -1, 0, 1),
      F(0, 0.62, 0.62, 1.02),
      F(0, 0.06, 0.62, 0.46),
    ],
  },

  // Ansuz — Odin, Wort und Weisheit -> Intelligenz
  ansuz: {
    name: 'Ansuz',
    meaning: 'Intelligenz',
    strokes: [
      F(0, -1, 0, 1),
      F(0, 1, 0.62, 0.58),
      F(0, 0.44, 0.62, 0.02),
    ],
  },

  // Kenaz — Fackel, schoepferisches Feuer -> Kreativitaet
  kenaz: {
    name: 'Kenaz',
    meaning: 'Kreativität',
    strokes: [
      F(0.55, 0.95, -0.15, 0),
      F(-0.15, 0, 0.55, -0.95),
    ],
  },

  // Sowilo — Sonne, Sieg -> Erfolg
  sowilo: {
    name: 'Sowilo',
    meaning: 'Erfolg',
    strokes: [
      F(0.5, 1, -0.12, 0.4),
      F(-0.12, 0.4, 0.5, -0.2),
      F(0.5, -0.2, -0.12, -1),
    ],
  },

  // Algiz — Abwehr, Elchgeweih -> Schutz
  algiz: {
    name: 'Algiz',
    meaning: 'Schutz',
    strokes: [
      F(0, -1, 0, 1),
      F(0, 0.2, -0.6, 1),
      F(0, 0.2, 0.6, 1),
    ],
  },

  // Jera — Ernte, Ertrag der eigenen Arbeit -> Kompetenz
  jera: {
    name: 'Jera',
    meaning: 'Kompetenz',
    strokes: [
      F(-0.1, 1, 0.5, 0.42),
      F(0.5, 0.42, -0.1, -0.05),
      F(0.1, 0.05, -0.5, -0.42),
      F(-0.5, -0.42, 0.1, -1),
    ],
  },

  /* ---------- Beiwerk: Ogham ---------- */

  ogham_beith: {
    name: 'Beith', meaning: null,
    strokes: [F(0, -1, 0, 1), F(0, 0.55, -0.55, 0.55)],
  },
  ogham_luis: {
    name: 'Luis', meaning: null,
    strokes: [F(0, -1, 0, 1), F(0, 0.6, -0.55, 0.6), F(0, 0.25, -0.55, 0.25)],
  },
  ogham_muin: {
    name: 'Muin', meaning: null,
    strokes: [F(0, -1, 0, 1), F(-0.5, 0.7, 0.5, 0.25), F(-0.5, 0.25, 0.5, -0.2)],
  },

  /* ---------- Beiwerk: alchemistische Zeichen ---------- */

  alch_ignis: {  // Feuer
    name: 'Ignis', meaning: null,
    strokes: [F(-0.7, -0.6, 0, 0.85), F(0, 0.85, 0.7, -0.6), F(0.7, -0.6, -0.7, -0.6)],
  },
  alch_aer: {    // Luft
    name: 'Aer', meaning: null,
    strokes: [
      F(-0.7, -0.6, 0, 0.85), F(0, 0.85, 0.7, -0.6), F(0.7, -0.6, -0.7, -0.6),
      F(-0.4, 0.1, 0.4, 0.1),
    ],
  },
  alch_terra: {  // Erde
    name: 'Terra', meaning: null,
    strokes: [
      F(-0.7, 0.6, 0, -0.85), F(0, -0.85, 0.7, 0.6), F(0.7, 0.6, -0.7, 0.6),
      F(-0.42, -0.1, 0.42, -0.1),
    ],
  },
  alch_sal: {    // Salz, Kreis mit Trennlinie
    name: 'Sal', meaning: null,
    strokes: (() => {
      const s = [];
      const N = 16, r = 0.8;
      for (let i = 0; i < N; i++) {
        const a1 = (i / N) * Math.PI * 2;
        const a2 = ((i + 1) / N) * Math.PI * 2;
        s.push(F(Math.cos(a1) * r, Math.sin(a1) * r, Math.cos(a2) * r, Math.sin(a2) * r));
      }
      s.push(F(-r, 0, r, 0));
      return s;
    })(),
  },

  /* ---------- Abstrahierte Systemzeichen ---------- */

  sys_network: {
    name: 'Netzwerk', meaning: null,
    strokes: [
      F(0, 0, -0.72, 0.64), F(0, 0, 0.72, 0.64), F(0, 0, 0, -0.78),
      ...box(-0.13, -0.13, 0.13, 0.13),
      ...box(-0.84, 0.52, -0.60, 0.76),
      ...box(0.60, 0.52, 0.84, 0.76),
      ...box(-0.12, -0.90, 0.12, -0.66),
    ],
  },
  sys_server: {
    name: 'Server', meaning: null,
    strokes: [
      ...box(-0.72, -0.92, 0.72, 0.92),
      F(-0.72, -0.32, 0.72, -0.32), F(-0.72, 0.30, 0.72, 0.30),
      F(-0.50, -0.63, -0.30, -0.63), F(0.37, -0.63, 0.50, -0.63),
      F(-0.50, 0, -0.30, 0), F(0.37, 0, 0.50, 0),
      F(-0.50, 0.61, -0.30, 0.61), F(0.37, 0.61, 0.50, 0.61),
    ],
  },
  sys_database: {
    name: 'Datenbank', meaning: null,
    strokes: [
      ...arc(0, 0.68, 0.68, 0.28, 0, Math.PI * 2, 14),
      F(-0.68, 0.68, -0.68, -0.62), F(0.68, 0.68, 0.68, -0.62),
      ...arc(0, -0.62, 0.68, 0.28, 0, Math.PI, 7),
      ...arc(0, 0.03, 0.68, 0.24, 0, Math.PI, 7),
    ],
  },
  sys_cluster: {
    name: 'Cluster', meaning: null,
    strokes: [
      ...arc(-0.42, 0.05, 0.42, 0.42, 0.48, Math.PI * 1.52, 8),
      ...arc(0.05, 0.42, 0.54, 0.54, Math.PI * 0.96, Math.PI * 1.94, 8),
      ...arc(0.47, 0.02, 0.42, 0.42, Math.PI * 1.45, Math.PI * 2.55, 8),
      F(-0.64, -0.34, 0.61, -0.34),
      F(-0.28, -0.58, 0, -0.34), F(0, -0.34, 0.28, -0.58),
    ],
  },
  sys_terminal: {
    name: 'Terminal', meaning: null,
    strokes: [
      ...box(-0.92, -0.74, 0.92, 0.74),
      F(-0.54, 0.28, -0.08, 0), F(-0.08, 0, -0.54, -0.28),
      F(0.08, -0.30, 0.55, -0.30),
    ],
  },
  sys_code: {
    name: 'Code', meaning: null,
    strokes: [
      F(-0.18, 0.84, -0.78, 0.32), F(-0.78, 0.32, -0.18, -0.20),
      F(0.18, 0.84, 0.78, 0.32), F(0.78, 0.32, 0.18, -0.20),
      F(0.20, -0.88, -0.20, 0.90),
    ],
  },
  sys_shield: {
    name: 'Security', meaning: null,
    strokes: [
      F(0, 0.94, -0.72, 0.62), F(-0.72, 0.62, -0.56, -0.34),
      F(-0.56, -0.34, 0, -0.92), F(0, -0.92, 0.56, -0.34),
      F(0.56, -0.34, 0.72, 0.62), F(0.72, 0.62, 0, 0.94),
      F(-0.30, 0.02, -0.05, -0.22), F(-0.05, -0.22, 0.38, 0.32),
    ],
  },
  sys_chip: {
    name: 'Prozessor', meaning: null,
    strokes: [
      ...box(-0.58, -0.58, 0.58, 0.58), ...box(-0.25, -0.25, 0.25, 0.25),
      F(-0.82, -0.36, -0.58, -0.36), F(-0.82, 0, -0.58, 0), F(-0.82, 0.36, -0.58, 0.36),
      F(0.58, -0.36, 0.82, -0.36), F(0.58, 0, 0.82, 0), F(0.58, 0.36, 0.82, 0.36),
      F(-0.36, -0.82, -0.36, -0.58), F(0, -0.82, 0, -0.58), F(0.36, -0.82, 0.36, -0.58),
      F(-0.36, 0.58, -0.36, 0.82), F(0, 0.58, 0, 0.82), F(0.36, 0.58, 0.36, 0.82),
    ],
  },
  sys_route: {
    name: 'Paketroute', meaning: null,
    strokes: [
      ...box(-0.86, 0.48, -0.46, 0.88), ...box(0.46, -0.88, 0.86, -0.48),
      F(-0.46, 0.68, 0.22, 0.68), F(0.22, 0.68, 0.22, -0.68), F(0.22, -0.68, 0.46, -0.68),
      F(0.02, -0.48, 0.22, -0.68), F(0.02, -0.88, 0.22, -0.68),
    ],
  },
  sys_key: {
    name: 'Authentisierung', meaning: null,
    strokes: [
      ...arc(-0.40, 0.36, 0.40, 0.40, 0, Math.PI * 2, 12),
      F(-0.12, 0.08, 0.76, -0.80), F(0.32, -0.36, 0.58, -0.10),
      F(0.53, -0.57, 0.76, -0.34),
    ],
  },
};

/** Die sechs bedeutungstragenden Runen, in fester Reihenfolge. */
export const PRIMARY = ['fehu', 'jera', 'ansuz', 'sowilo', 'kenaz'];

/** Beiwerk ohne Bedeutung, nur Textur im Hintergrund. */
export const SECONDARY = [
  'ogham_beith', 'ogham_luis', 'ogham_muin',
  'alch_ignis', 'alch_aer', 'alch_terra', 'alch_sal',
];

/** Geometrische IT-Zeichen ohne Marken- oder Textbezug. */
export const SYSTEM_SIGNS = [
  'sys_network', 'sys_server', 'sys_database', 'sys_cluster', 'sys_terminal',
  'sys_code', 'sys_shield', 'sys_chip', 'sys_route', 'sys_key',
];
