/**
 * Heilige Geometrie als Strichzuege.
 *
 * Jede Figur ist eine Liste von Segmenten [x1, y1, x2, y2] in einer
 * Einheitsbox (ca. -1..1). Vorlage ist der Referenzatlas
 * Heiligegeometrie/DIVINE_SACRED_GEOMETRY_SYMBOLS-01.png. Die zwoelf Motive
 * sind dort in vier Reihen zu drei Spalten angeordnet und werden hier so
 * genau wie moeglich als Vektorgeometrie nachgebaut. Der Schriftzug der
 * Vorlage wird bewusst nicht uebernommen.
 *
 * Das Feld `round` unterscheidet kreisbasierte Motive von eckigen. Nur die
 * runden Figuren drehen sich im Hintergrund um die eigene Achse; alle
 * driften durch den Raum (siehe background.js).
 */

const TAU = Math.PI * 2;
const SQRT3 = Math.sqrt(3);

function circle(strokes, cx, cy, r, segments = 28) {
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * TAU;
    const b = ((i + 1) / segments) * TAU;
    strokes.push([
      cx + Math.cos(a) * r, cy + Math.sin(a) * r,
      cx + Math.cos(b) * r, cy + Math.sin(b) * r,
    ]);
  }
}

function polygon(strokes, points) {
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    strokes.push([x1, y1, x2, y2]);
  }
}

/** Mittelpunkte eines Sechsecks: Zentrum plus sechs Nachbarn im Abstand r. */
function hexCenters(r, phase = Math.PI / 2) {
  const centers = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + phase;
    centers.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return centers;
}

/**
 * Dreiecksgitter: alle Punkte eines Dreiecksrasters mit Abstand `step`,
 * deren Abstand zum Ursprung hoechstens `limit` betraegt.
 */
function triangularLattice(step, limit) {
  const points = [];
  const span = Math.ceil(limit / step) + 1;
  for (let q = -span; q <= span; q++) {
    for (let r = -span; r <= span; r++) {
      const x = step * (q + r * 0.5);
      const y = step * r * (SQRT3 / 2);
      if (Math.hypot(x, y) <= limit + 1e-6) points.push([x, y]);
    }
  }
  return points;
}

/** Dreieck mit vollstaendigem inneren Dreiecksraster (n Unterteilungen). */
function subdividedTriangle(strokes, verts, n) {
  const [A, B, C] = verts;
  const lerp = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
  polygon(strokes, verts);
  const families = [[A, B, C], [B, C, A], [C, A, B]];
  for (const [P, Q, R] of families) {
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const [x1, y1] = lerp(P, Q, t);
      const [x2, y2] = lerp(P, R, t);
      strokes.push([x1, y1, x2, y2]);
    }
  }
}

/** Gleichseitiges Dreieck um den Ursprung, `up` bestimmt die Ausrichtung. */
function equilateral(radius, up = true, lift = 0) {
  const phase = up ? Math.PI / 2 : -Math.PI / 2;
  const points = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + phase;
    points.push([Math.cos(a) * radius, Math.sin(a) * radius + lift]);
  }
  return points;
}

/* ---------- Reihe 1 ---------- */

/** Vesica Piscis: zwei gleich grosse Kreise, senkrecht ueberschnitten. */
function vesicaPiscis() {
  const s = [];
  const r = 0.66;
  circle(s, 0, r * 0.52, r, 40);
  circle(s, 0, -r * 0.52, r, 40);
  return s;
}

/**
 * Torus / Lotus of Life: eine Schar gleich grosser Kreise, deren Mittelpunkte
 * auf einem Kreis liegen und die alle durch das Zentrum laufen. Daraus
 * entsteht die Rosettenstruktur der Vorlage.
 */
function torusLotus() {
  const s = [];
  const count = 28;
  const r = 0.5;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    circle(s, Math.cos(a) * r, Math.sin(a) * r, r, 30);
  }
  circle(s, 0, 0, 1, 44);
  return s;
}

/** Saat des Lebens: sieben verschraenkte Kreise plus Umkreis. */
function seedOfLife() {
  const s = [];
  const r = 0.5;
  for (const [cx, cy] of hexCenters(r)) circle(s, cx, cy, r, 30);
  circle(s, 0, 0, 1, 44);
  return s;
}

/* ---------- Reihe 2 ---------- */

/** Baum des Lebens: zehn Sephiroth und die zweiundzwanzig Pfade. */
function treeOfLife() {
  const s = [];
  const nodes = [
    [0, 1.0],       // Kether
    [0.46, 0.68],   // Chokmah
    [-0.46, 0.68],  // Binah
    [0.46, 0.2],    // Chesed
    [-0.46, 0.2],   // Geburah
    [0, -0.04],     // Tiphareth
    [0.46, -0.5],   // Netzach
    [-0.46, -0.5],  // Hod
    [0, -0.74],     // Yesod
    [0, -1.06],     // Malkuth
  ];
  const paths = [
    [0, 1], [0, 2], [0, 5], [1, 2], [1, 3], [1, 5], [2, 4], [2, 5],
    [3, 4], [3, 5], [3, 6], [4, 5], [4, 7], [5, 6], [5, 7], [5, 8],
    [6, 7], [6, 8], [6, 9], [7, 8], [7, 9], [8, 9],
  ];
  for (const [a, b] of paths) {
    s.push([nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1]]);
  }
  for (const [x, y] of nodes) circle(s, x, y, 0.095, 16);
  return s;
}

/**
 * Blume des Lebens: vollstaendige Kreispackung auf einem Dreiecksraster,
 * begrenzt von einem doppelten Umkreis wie in der Vorlage.
 */
function flowerOfLife() {
  const s = [];
  const r = 0.25;
  for (const [cx, cy] of triangularLattice(r, r * 3)) circle(s, cx, cy, r, 22);
  circle(s, 0, 0, r * 4, 52);
  circle(s, 0, 0, r * 4.16, 52);
  return s;
}

/**
 * Star Tetrahedron: das Vierundsechzig-Tetraeder-Gitter der Vorlage,
 * zwei entgegengesetzt unterteilte Grossdreiecke.
 */
function starTetrahedron() {
  const s = [];
  const n = 4;
  subdividedTriangle(s, equilateral(1.0, true), n);
  subdividedTriangle(s, equilateral(1.0, false), n);
  // Innere Verdichtung: ein zweites, kleineres Sternpaar erzeugt die
  // raeumliche Tiefe des Gitters.
  subdividedTriangle(s, equilateral(0.5, true), 2);
  subdividedTriangle(s, equilateral(0.5, false), 2);
  return s;
}

/* ---------- Reihe 3 ---------- */

/** Ei des Lebens: sieben einander beruehrende Kreise. */
function eggOfLife() {
  const s = [];
  const r = 1 / 3;
  for (const [cx, cy] of hexCenters(2 * r)) circle(s, cx, cy, r, 26);
  return s;
}

/** Frucht des Lebens: dreizehn einander beruehrende Kreise. */
function fruitOfLifeCenters(r) {
  const centers = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 2;
    centers.push([Math.cos(a) * 2 * r, Math.sin(a) * 2 * r]);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 2 + Math.PI / 6;
    centers.push([Math.cos(a) * 2 * SQRT3 * r, Math.sin(a) * 2 * SQRT3 * r]);
  }
  return centers;
}

function fruitOfLife() {
  const s = [];
  const r = 0.23;
  for (const [cx, cy] of fruitOfLifeCenters(r)) circle(s, cx, cy, r, 24);
  return s;
}

/** Metatrons Wuerfel: Frucht des Lebens mit allen achtundsiebzig Sehnen. */
function metatronCube() {
  const s = [];
  const r = 0.22;
  const nodes = fruitOfLifeCenters(r);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      s.push([nodes[i][0], nodes[i][1], nodes[j][0], nodes[j][1]]);
    }
  }
  for (const [cx, cy] of nodes) circle(s, cx, cy, r, 20);
  return s;
}

/* ---------- Reihe 4 ---------- */

/**
 * Merkabah: zwei durchdrungene Tetraeder in perspektivischer Ansicht,
 * mit den sichtbaren Innenkanten der Vorlage.
 */
function merkaba() {
  const s = [];
  polygon(s, equilateral(1.0, true));
  polygon(s, equilateral(1.0, false));

  // Perspektivische Tetraeder: Spitze oben, Grundflaeche als flach
  // liegendes Dreieck. Dasselbe gespiegelt fuer den Gegentetraeder.
  const apexUp = [0, 1.0];
  const baseUp = [[-0.5, -0.29], [0.5, -0.29], [0, 0.02]];
  const apexDown = [0, -1.0];
  const baseDown = [[0.5, 0.29], [-0.5, 0.29], [0, -0.02]];

  for (const [apex, base] of [[apexUp, baseUp], [apexDown, baseDown]]) {
    polygon(s, base);
    for (const v of base) s.push([apex[0], apex[1], v[0], v[1]]);
  }
  return s;
}

/**
 * Sri Yantra: neun ineinander geschobene Dreiecke, vier nach oben und
 * fuenf nach unten, in absteigender Groesse wie in der Vorlage.
 */
function sriYantra() {
  const s = [];
  // Vier aufwaerts und fuenf abwaerts gerichtete Dreiecke, konzentrisch
  // gestaffelt. Der leichte Hoehenversatz erzeugt das typische Ineinander.
  const upward = [1.0, 0.78, 0.56, 0.34];
  const downward = [1.0, 0.84, 0.66, 0.46, 0.24];
  for (const scale of upward) {
    polygon(s, equilateral(scale, true, (1 - scale) * 0.1));
  }
  for (const scale of downward) {
    polygon(s, equilateral(scale, false, (1 - scale) * -0.1));
  }
  circle(s, 0, 0, 0.075, 16);
  return s;
}

/** Sechsbluetige Rosette: sechs Kreise im Umkreis, klassische Blume. */
function sixPetalRosette() {
  const s = [];
  const r = 0.5;
  for (const [cx, cy] of hexCenters(r).slice(1)) circle(s, cx, cy, r, 30);
  circle(s, 0, 0, 1, 46);
  return s;
}

export const SACRED_FIGURES = [
  { name: 'Vesica Piscis',        round: true,  strokes: vesicaPiscis() },
  { name: 'Torus / Lotus of Life', round: true,  strokes: torusLotus() },
  { name: 'Seed of Life',         round: true,  strokes: seedOfLife() },
  { name: 'Tree of Life',         round: false, strokes: treeOfLife() },
  { name: 'Flower of Life',       round: true,  strokes: flowerOfLife() },
  { name: 'Egg of Life',          round: true,  strokes: eggOfLife() },
  { name: 'Metatrons Cube',       round: true,  strokes: metatronCube() },
  { name: 'Fruit of Life',        round: true,  strokes: fruitOfLife() },
  { name: 'Merkabah',             round: false, strokes: merkaba() },
  { name: 'Sri Yantra',           round: false, strokes: sriYantra() },
  { name: 'Six Petal Rosette',    round: true,  strokes: sixPetalRosette() },
];
