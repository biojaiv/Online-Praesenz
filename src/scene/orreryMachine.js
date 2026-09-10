// EPIC_ORRERY_MACHINE_V6
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { lightColor } from './palette.js';

/**
 * Die Maschine im Hintergrund.
 *
 * Ein riesiges, prozedural gebautes Planetarium aus Ringen, Zahnkraenzen,
 * Sphaerenkaefigen und Streben. Es steht schraeg hinter und um die drei
 * Sockel, sodass ein Kamera-Orbit die Struktur aus wechselnden Blickwinkeln
 * zeigt. Die Maschine liegt im Dunkeln. Sichtbar wird sie nur von Zeit zu
 * Zeit: durch Laeufer, die ein Stueck weit ueber einen einzelnen Ring
 * wandern und dabei nur dessen Umgebung erhellen, und durch keilfoermige
 * Lichtfronten, die vom Kern aus einen Sektor der Struktur ueberstreichen.
 * Die geneigten Ringe praezedieren dazu langsam um die Achse des Kerns.
 *
 * Alle statischen Teile einer Drehgruppe werden zu einer Geometrie
 * verschmolzen; Sphaeren und Zahnraeder sind Instanzen. Das haelt die Zahl
 * der Zeichenaufrufe klein, obwohl das Konstrukt gross ist.
 */

const X_AXIS = new THREE.Vector3(1, 0, 0);
const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();
const TMP_C = new THREE.Vector3();
const TMP_Q = new THREE.Quaternion();
const TMP_S = new THREE.Vector3();
const TMP_M = new THREE.Matrix4();
const TMP_E = new THREE.Euler();

const PALETTE = Object.freeze({
  ice: new THREE.Color(0xdff4ff),
  cyan: lightColor('fiberBlue'),
  amber: lightColor('amber'),
  violet: lightColor('violet'),
  fog: new THREE.Color(0x020407),
});

// Lage der Maschine in der Welt. Der Kern sitzt hinter und ueber den
// Sockeln, die Scheibe ist zum Betrachter geneigt, die aeusseren Ringe
// umschliessen Sockel und Kamera.
const MACHINE_CENTRE = new THREE.Vector3(-7, 6, -34);
const MACHINE_TILT = new THREE.Euler(0.5, 0.3, -0.06);
// Mittelpunkt der Sockelreihe: um diesen Punkt kreist die Kamera. Zwei
// flache Ringe liegen genau darum.
const PIVOT = new THREE.Vector3(0, -5, 0);

const WAVE_MAX_RADIUS = 96;
const WAVE_SPEED = 8.5;          // Welteinheiten je Sekunde
const WAVE_PAUSE_MIN = 11;
const WAVE_PAUSE_MAX = 22;

// Laeufer: kurzlebige Lichter, die ein Stueck eines Rings entlangwandern.
const RUNNER_SLOTS = 4;
const RUNNER_PAUSE_MIN = 1.8;
const RUNNER_PAUSE_MAX = 5.5;
const RUNNER_MAX_ACTIVE = 3;

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smooth01(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

/* ---------- Geometrie-Bausteine ---------- */

/** Ring in der xz-Ebene um den Ursprung, optional versetzt und geneigt. */
function ring(parts, radius, tube, segments, { y = 0, tilt = null, tubeSegments = 6 } = {}) {
  const geometry = new THREE.TorusGeometry(radius, tube, tubeSegments, segments);
  geometry.rotateX(Math.PI / 2);
  if (tilt) geometry.applyMatrix4(TMP_M.makeRotationFromEuler(tilt));
  if (y) geometry.translate(0, y, 0);
  parts.push(geometry);
}

/** Quader zwischen zwei Punkten. */
const BAR_MID = new THREE.Vector3();
const BAR_DIR = new THREE.Vector3();
function bar(parts, start, end, width, height = width) {
  BAR_MID.copy(start).add(end).multiplyScalar(0.5);
  BAR_DIR.copy(end).sub(start);
  const length = Math.max(0.001, BAR_DIR.length());
  BAR_DIR.multiplyScalar(1 / length);
  TMP_Q.setFromUnitVectors(X_AXIS, BAR_DIR);
  TMP_S.set(length, width, height);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.applyMatrix4(TMP_M.compose(BAR_MID, TMP_Q, TMP_S));
  parts.push(geometry);
}

/** Kleiner Knoten an einer Position. */
function node(parts, position, size) {
  const geometry = new THREE.IcosahedronGeometry(size, 1);
  geometry.translate(position.x, position.y, position.z);
  parts.push(geometry);
}

/**
 * Skalenzaehne rund um einen Ring: kurze radiale Staebe, jeder n-te
 * laenger. Erzeugt den Eindruck der Gradteilungen auf dem Vorbild.
 */
function ticks(parts, radius, count, { y = 0, length = 0.5, majorEvery = 10, majorLength = 1.1, thickness = 0.07 } = {}) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const major = majorEvery > 0 && index % majorEvery === 0;
    const size = major ? majorLength : length;
    TMP_A.set(Math.cos(angle) * (radius - size * 0.5), y, Math.sin(angle) * (radius - size * 0.5));
    TMP_B.set(Math.cos(angle) * (radius + size * 0.5), y, Math.sin(angle) * (radius + size * 0.5));
    bar(parts, TMP_A, TMP_B, thickness, major ? thickness * 1.6 : thickness);
  }
}

/**
 * Doppelschiene: zwei Ringe mit Sprossen — die breiten Laufbahnen des
 * Vorbilds, auf denen die Laternen wandern.
 */
function track(parts, radius, gap, segments, rungs, { y = 0, tube = 0.11 } = {}) {
  ring(parts, radius, tube, segments, { y: y + gap * 0.5 });
  ring(parts, radius, tube, segments, { y: y - gap * 0.5 });
  for (let index = 0; index < rungs; index += 1) {
    const angle = (index / rungs) * Math.PI * 2;
    TMP_A.set(Math.cos(angle) * radius, y + gap * 0.5, Math.sin(angle) * radius);
    TMP_B.set(Math.cos(angle) * radius, y - gap * 0.5, Math.sin(angle) * radius);
    bar(parts, TMP_A, TMP_B, 0.08, 0.16);
  }
}

/** Zahnkranz: Ring mit rechteckigen Zaehnen. */
function cog(parts, radius, teeth, { y = 0, tube = 0.14, toothHeight = 0.55, toothWidth = 0.22 } = {}) {
  ring(parts, radius, tube, Math.max(48, teeth * 3), { y });
  for (let index = 0; index < teeth; index += 1) {
    const angle = (index / teeth) * Math.PI * 2;
    TMP_A.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    TMP_B.set(Math.cos(angle) * (radius + toothHeight), y, Math.sin(angle) * (radius + toothHeight));
    bar(parts, TMP_A, TMP_B, toothWidth, tube * 1.9);
  }
}

function mergeParts(parts) {
  // Polyeder kommen ohne Index; fuer das Verschmelzen brauchen alle Teile
  // dieselbe Struktur.
  const indexed = parts.map((part) => (part.index ? part : mergeVertices(part)));
  const merged = mergeGeometries(indexed, false);
  for (const part of parts) part.dispose();
  for (const part of indexed) part.dispose();
  merged.computeBoundingSphere();
  return merged;
}

/** Einheits-Sphaerenkaefig: drei orthogonale Ringe, zwei Breitenkreise, Kern. */
function makeOrbGeometry() {
  const parts = [];
  ring(parts, 1, 0.045, 30, { tubeSegments: 5 });
  ring(parts, 1, 0.045, 30, { tilt: new THREE.Euler(Math.PI / 2, 0, 0), tubeSegments: 5 });
  ring(parts, 1, 0.045, 30, { tilt: new THREE.Euler(0, 0, Math.PI / 2), tubeSegments: 5 });
  ring(parts, 0.72, 0.03, 24, { y: 0.69, tubeSegments: 5 });
  ring(parts, 0.72, 0.03, 24, { y: -0.69, tubeSegments: 5 });
  const core = new THREE.IcosahedronGeometry(0.34, 1);
  parts.push(core);
  return mergeParts(parts);
}

/** Einheits-Zahnrad: Kranz, Zaehne, Speichen, Nabe. */
function makeGearGeometry() {
  const parts = [];
  cog(parts, 1, 18, { tube: 0.075, toothHeight: 0.16, toothWidth: 0.13 });
  ring(parts, 0.2, 0.05, 20);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    TMP_A.set(Math.cos(angle) * 0.22, 0, Math.sin(angle) * 0.22);
    TMP_B.set(Math.cos(angle) * 0.95, 0, Math.sin(angle) * 0.95);
    bar(parts, TMP_A, TMP_B, 0.06, 0.05);
  }
  return mergeParts(parts);
}

/* ---------- Material ---------- */

// Kamerabezogene Schutzzone hinter der Sockelreihe. Sie dreht beim Orbit
// mit: Vordergrundstreben verschwinden weich, auch wenn sie beleuchtet sind.
// Derselbe Ausschnitt gilt fuer Metall, Staub und die Lichtkoerper.
const BACKGROUND_VISIBILITY_GLSL = /* glsl */`
  uniform vec3 uStageCentre;
  float backgroundVisibility(vec3 worldPosition) {
    float stageDepth = -(viewMatrix * vec4(uStageCentre, 1.0)).z;
    float fragmentDepth = -(viewMatrix * vec4(worldPosition, 1.0)).z;
    return smoothstep(10.0, 18.0, fragmentDepth - stageDepth);
  }
`;

function makeSharedUniforms() {
  return {
    uTime: { value: 0 },
    uVisible: { value: 0 },
    uStageCentre: { value: PIVOT.clone() },
    uDocumentOpen: { value: 0 },
    uCore: { value: MACHINE_CENTRE.clone() },
    uCoreGlow: { value: 0 },
    uWaveRadius: { value: -50 },
    uWaveStrength: { value: 0 },
    // Richtung und Oeffnung des Sektors, den die Front ueberstreicht
    // (Kosinus des halben Oeffnungswinkels).
    uWaveDir: { value: new THREE.Vector3(0, 0, 1) },
    uWaveCone: { value: 0.75 },
    uWaveColourA: { value: PALETTE.ice.clone() },
    uWaveColourB: { value: PALETTE.cyan.clone() },
    // Laeufer: Position, Farbe + Staerke (w), Leuchtradius.
    uRunnerPos: { value: Array.from({ length: RUNNER_SLOTS }, () => new THREE.Vector3()) },
    uRunnerCol: { value: Array.from({ length: RUNNER_SLOTS }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uRunnerRadius: { value: new Float32Array(RUNNER_SLOTS).fill(8) },
    uFogDensity: { value: 0.0074 },
  };
}

function makeMachineMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    toneMapped: false,
    vertexShader: /* glsl */`
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      void main() {
        vec4 local = vec4(position, 1.0);
        vec3 localNormal = normal;
        #ifdef USE_INSTANCING
          mat3 basis = mat3(instanceMatrix);
          vec3 inverseScaleSq = vec3(
            1.0 / max(dot(basis[0], basis[0]), 0.000001),
            1.0 / max(dot(basis[1], basis[1]), 0.000001),
            1.0 / max(dot(basis[2], basis[2]), 0.000001)
          );
          local = instanceMatrix * local;
          localNormal = basis * (localNormal * inverseScaleSq);
        #endif
        vec4 world = modelMatrix * local;
        vWorldPos = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */`
      #define RUNNERS ${RUNNER_SLOTS}
      uniform float uTime, uVisible, uDocumentOpen, uCoreGlow;
      uniform vec3 uCore;
      uniform float uWaveRadius, uWaveStrength, uWaveCone;
      uniform vec3 uWaveDir, uWaveColourA, uWaveColourB;
      uniform vec3 uRunnerPos[RUNNERS];
      uniform vec4 uRunnerCol[RUNNERS];
      uniform float uRunnerRadius[RUNNERS];
      uniform float uFogDensity;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      ${BACKGROUND_VISIBILITY_GLSL}

      vec3 runner(vec3 position, vec4 colour, float radius, vec3 n) {
        vec3 toLight = position - vWorldPos;
        float d = length(toLight);
        vec3 l = toLight / max(d, 0.0001);
        // Enger Kern, weicher Saum: das Licht bleibt lokal.
        float falloff = exp(-(d * d) / (radius * radius))
          * (1.0 - smoothstep(radius, radius * 1.6, d));
        float diffuse = 0.22 + 0.78 * max(0.0, dot(n, l));
        return colour.rgb * falloff * diffuse * colour.a;
      }

      void main() {
        float backgroundFade = backgroundVisibility(vWorldPos);
        if (uVisible <= 0.0 || backgroundFade <= 0.0) discard;
        vec3 n = normalize(vWorldNormal);
        vec3 v = normalize(cameraPosition - vWorldPos);
        if (dot(n, v) < 0.0) n = -n;
        float facing = abs(dot(n, v));
        float rim = pow(1.0 - facing, 2.6);

        // Ohne lokales Licht gibt es weder Grundhelligkeit noch Konturen.
        vec3 colour = vec3(0.0);

        // Der Kern glimmt nur schwach auf die naechsten Flaechen.
        vec3 toCore = uCore - vWorldPos;
        float coreDistance = length(toCore);
        vec3 coreDirection = toCore / max(coreDistance, 0.0001);
        float coreDiffuse = max(0.0, dot(n, coreDirection));
        float coreFalloff = (1.0 - smoothstep(8.0, 16.0, coreDistance))
          / (1.0 + coreDistance * coreDistance * 0.03);
        colour += vec3(0.95, 0.74, 0.46) * coreDiffuse * coreFalloff * uCoreGlow * 0.42;

        // Die Lichtfront: eine Kugelschale, die vom Kern nach aussen laeuft,
        // aber nur innerhalb eines Kegels — sie streift einen Sektor der
        // Maschine und laesst den Rest im Dunkeln.
        float shell = coreDistance - uWaveRadius;
        float front = exp(-(shell * shell) / 9.0)
          * (1.0 - smoothstep(6.0, 10.0, abs(shell)));
        float tail = exp(min(shell, 0.0) / 6.0) * step(shell, 0.0) * (1.0 - front)
          * (1.0 - smoothstep(14.0, 24.0, -shell));
        float sector = smoothstep(uWaveCone - 0.16, uWaveCone + 0.06, dot(-coreDirection, uWaveDir));
        float grazing = 0.4 + 0.6 * abs(dot(n, coreDirection));
        vec3 waveColour = mix(uWaveColourB, uWaveColourA, front);
        // Hinter dem geoeffneten Dokument bleibt die Front nur ein Schimmer,
        // damit die Seite lesbar bleibt.
        float waveScale = mix(1.0, 0.16, uDocumentOpen) * sector;
        float wave = (front * 0.58 + tail * 0.18) * grazing * uWaveStrength * waveScale;
        colour += waveColour * wave;
        colour += uWaveColourA * rim * front * uWaveStrength * 0.40 * waveScale;

        // Laeufer auf den Ringen.
        float runnerScale = mix(1.0, 0.4, uDocumentOpen);
        for (int index = 0; index < RUNNERS; index += 1) {
          colour += runner(uRunnerPos[index], uRunnerCol[index], uRunnerRadius[index], n) * runnerScale;
        }

        // Geoeffnetes Dokument: die Welt tritt etwas zurueck.
        colour *= mix(1.0, 0.72, uDocumentOpen);

        // Nebel daempft nur vorhandenes Licht. Er darf dunkle Geometrie
        // nicht wieder als deckende, nebelgefaerbte Silhouette zeichnen.
        float viewDistance = length(cameraPosition - vWorldPos);
        colour *= exp(-pow(viewDistance * uFogDensity, 2.0));
        float illumination = max(colour.r, max(colour.g, colour.b));
        float alpha = smoothstep(0.002, 0.035, illumination) * uVisible * backgroundFade;
        if (alpha <= 0.001) discard;
        gl_FragColor = vec4(colour, alpha);
      }
    `,
  });
}

/* ---------- Bausteine der Maschine ---------- */

/**
 * Baut eine komplette Orrery-Baugruppe in lokalen Koordinaten (Achse = y).
 * `scale` skaliert die gesamte Auslegung; kleine Satelliten nutzen `detail`
 * < 1 fuer weniger Teile.
 */
function buildOrrery({ material, orbGeometry, gearGeometry, rng, scale = 1, detail = 1 }) {
  const root = new THREE.Group();
  const rotors = [];
  const orbSets = [];
  const gearSets = [];
  // Ringbahnen, auf denen Laeufer wandern koennen: Objekt + lokaler Radius.
  const paths = [];

  /**
   * Haengt ein geneigtes Teil in einen Halter, der um die Kernachse (y)
   * kreist. So praezediert die Ringebene sichtbar um den Kern, statt nur
   * in sich zu drehen.
   */
  function precess(object, speed) {
    const holder = new THREE.Group();
    holder.add(object);
    root.add(holder);
    rotors.push({ object: holder, speed, axis: 'y' });
    return holder;
  }

  /* Kern: Spirale aus gestaffelten Zahnkraenzen plus Kardanringe. */
  {
    const parts = [];
    const layers = detail >= 1 ? 7 : 4;
    for (let index = 0; index < layers; index += 1) {
      const t = index / (layers - 1);
      const radius = 2.4 + t * 6.2;
      const y = Math.sin(t * Math.PI * 1.35 + 0.4) * 1.4 - 0.5 + t * 0.6;
      cog(parts, radius, Math.round(14 + t * 34), {
        y, tube: 0.10 + t * 0.05, toothHeight: 0.32 + t * 0.2, toothWidth: 0.16 + t * 0.06,
      });
      if (index % 2 === 0) {
        for (let spoke = 0; spoke < 6; spoke += 1) {
          const angle = (spoke / 6) * Math.PI * 2 + index * 0.35;
          TMP_A.set(Math.cos(angle) * 0.8, y, Math.sin(angle) * 0.8);
          TMP_B.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
          bar(parts, TMP_A, TMP_B, 0.09, 0.07);
        }
      }
    }
    ring(parts, 1.15, 0.08, 40, { tilt: new THREE.Euler(0.6, 0, 0.2) });
    ring(parts, 1.6, 0.06, 40, { tilt: new THREE.Euler(-0.4, 0.4, 1.2) });
    const core = new THREE.Mesh(mergeParts(parts), material);
    core.name = 'orrery-core';
    root.add(core);
    rotors.push({ object: core, speed: -0.055, axis: 'y' });

    // Drei Kardanringe um den Kern, jeder auf eigener Achse. Sie drehen
    // sich in sich und kreisen zugleich um die Kernachse.
    const gimbalSpecs = [
      [10.2, new THREE.Euler(1.1, 0.2, 0.3), 0.021, 0.030],
      [11.4, new THREE.Euler(0.4, 1.3, -0.6), -0.017, -0.022],
      [12.8, new THREE.Euler(-0.8, 0.5, 1.9), 0.013, 0.016],
    ];
    for (const [radius, tilt, speed, orbitSpeed] of gimbalSpecs) {
      const gimbalParts = [];
      ring(gimbalParts, radius, 0.13, 128);
      ticks(gimbalParts, radius, 72, { length: 0.42, majorEvery: 6, majorLength: 0.95, thickness: 0.06 });
      const gimbal = new THREE.Mesh(mergeParts(gimbalParts), material);
      gimbal.rotation.copy(tilt);
      precess(gimbal, orbitSpeed);
      rotors.push({ object: gimbal, speed, axis: 'local' });
      paths.push({ object: gimbal, radius, y: 0, weight: 1.4 });
    }
  }

  /* Hauptscheibe: konzentrische Ringe, Laufbahnen, Skalen, Arme. */
  {
    const parts = [];
    const movingRings = [];
    const discRings = [
      { r: 16, tube: 0.16, y: 0.0, tick: 96 },
      { r: 19.5, tube: 0.11, y: 0.6, tick: 0 },
      { r: 22.5, tube: 0.20, y: -0.4, tick: 144 },
      { r: 30, tube: 0.24, y: 0.0, tick: 180 },
      { r: 34.5, tube: 0.13, y: 0.9, tick: 0 },
      { r: 40, tube: 0.28, y: -0.6, tick: 240 },
      { r: 47, tube: 0.16, y: 0.3, tick: 0 },
      { r: 54, tube: 0.34, y: 0.0, tick: 288 },
    ];
    const ringCount = detail >= 1 ? discRings.length : 4;
    for (let index = 0; index < ringCount; index += 1) {
      const spec = discRings[index];
      const ringParts = [];
      ring(ringParts, spec.r, spec.tube, Math.round(96 + spec.r * 3.2));
      if (spec.tick && detail >= 1) {
        ticks(ringParts, spec.r, spec.tick, {
          length: 0.45 + spec.r * 0.008, majorEvery: 12,
          majorLength: 1.0 + spec.r * 0.02, thickness: 0.06 + spec.r * 0.0012,
        });
      }
      const discRing = new THREE.Mesh(mergeParts(ringParts), material);
      discRing.name = `orrery-disc-ring-${index}`;
      discRing.position.y = spec.y;
      movingRings.push(discRing);
      // Jeder Ring kippt um seinen eigenen waagerechten Durchmesser.
      // Benachbarte Ringe laufen gegenlaeufig, aussen etwas langsamer.
      rotors.push({ object: discRing, speed: (index % 2 ? -1 : 1) * (0.022 - index * 0.0015), axis: 'x' });
      paths.push({ object: discRing, radius: spec.r, y: 0, weight: 1 });
    }
    // Zwei Laufbahnen mit Sprossen, bevorzugte Bahnen der Laeufer.
    const trackSpecs = [
      { radius: 26.4, gap: 1.15, segments: 200, rungs: 132, y: -0.2, tube: 0.10, speed: -0.017 },
      { radius: 43.5, gap: 1.5, segments: 260, rungs: 156, y: 0.2, tube: 0.12, speed: 0.014 },
    ];
    const movingTracks = [];
    for (const spec of trackSpecs.slice(0, detail >= 1 ? 2 : 1)) {
      const trackParts = [];
      track(trackParts, spec.radius, spec.gap, spec.segments, spec.rungs, { tube: spec.tube });
      const discTrack = new THREE.Mesh(mergeParts(trackParts), material);
      discTrack.name = `orrery-disc-track-${movingTracks.length}`;
      discTrack.position.y = spec.y;
      movingTracks.push(discTrack);
      rotors.push({ object: discTrack, speed: spec.speed, axis: 'x' });
      paths.push({ object: discTrack, radius: spec.radius, y: 0, weight: 2 });
    }

    // Radiale Arme vom Kern bis zum aeusseren Rand, unregelmaessig verteilt.
    const armCount = detail >= 1 ? 11 : 6;
    const outer = discRings[ringCount - 1].r;
    for (let index = 0; index < armCount; index += 1) {
      const angle = (index / armCount) * Math.PI * 2 + rng() * 0.32;
      const reach = outer * (0.62 + rng() * 0.38);
      const start = 9.5 + rng() * 4;
      const width = 0.14 + rng() * 0.12;
      const y = (rng() - 0.5) * 1.2;
      TMP_A.set(Math.cos(angle) * start, y, Math.sin(angle) * start);
      TMP_B.set(Math.cos(angle) * reach, y, Math.sin(angle) * reach);
      bar(parts, TMP_A, TMP_B, width, width * 0.7);
      // Knoten an jedem gekreuzten Ring.
      for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
        const r = discRings[ringIndex].r;
        if (r < start || r > reach) continue;
        TMP_C.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
        node(parts, TMP_C, 0.34 + rng() * 0.22);
      }
      // Ein Doppeltraeger fuer jeden dritten Arm.
      if (index % 3 === 0) {
        const side = TMP_C.set(-Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(0.7);
        TMP_A.add(side); TMP_B.add(side);
        bar(parts, TMP_A, TMP_B, width * 0.6, width * 0.5);
        const steps = Math.floor((reach - start) / 3.2);
        for (let step = 0; step <= steps; step += 1) {
          const t = step / Math.max(1, steps);
          const r = THREE.MathUtils.lerp(start, reach, t);
          const a = TMP_A.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
          const b = TMP_B.copy(a).add(side);
          bar(parts, a, b, 0.06, 0.06);
        }
      }
    }

    const disc = new THREE.Mesh(mergeParts(parts), material);
    disc.name = 'orrery-disc';
    disc.add(...movingRings, ...movingTracks);
    root.add(disc);
    rotors.push({ object: disc, speed: 0.0085, axis: 'y' });

    // Zwei leicht geneigte Wanderringe: sie liegen nicht in der Scheibe,
    // sondern kreisen um die Kernachse und schneiden die Scheibe dabei
    // sichtbar — das ist die Bewegung, die man von aussen liest.
    if (detail >= 1) {
      const wanderSpecs = [
        { r: 25, tube: 0.15, tilt: new THREE.Euler(0.26, 0, 0.08), speed: 0.012 },
        { r: 44, tube: 0.18, tilt: new THREE.Euler(-0.19, 0, 0.22), speed: -0.0075 },
      ];
      for (const spec of wanderSpecs) {
        const wanderParts = [];
        ring(wanderParts, spec.r, spec.tube, Math.round(120 + spec.r * 3));
        ticks(wanderParts, spec.r, Math.round(spec.r * 3), { length: 0.5, majorEvery: 8, majorLength: 1.1, thickness: 0.07 });
        const wander = new THREE.Mesh(mergeParts(wanderParts), material);
        wander.name = 'orrery-wander';
        wander.rotation.copy(spec.tilt);
        precess(wander, spec.speed);
        paths.push({ object: wander, radius: spec.r, y: 0, weight: 1.6 });
      }
    }

    // Sphaerenkaefige und Zahnraeder sitzen auf den Scheibenringen.
    const orbMatrices = [];
    const gearMatrices = [];
    const orbCount = detail >= 1 ? 18 : 6;
    for (let index = 0; index < orbCount; index += 1) {
      const ringIndex = Math.floor(rng() * ringCount);
      const spec = discRings[ringIndex];
      const angle = rng() * Math.PI * 2;
      const size = 0.9 + Math.pow(rng(), 1.6) * 2.3;
      const position = new THREE.Vector3(
        Math.cos(angle) * spec.r, (rng() - 0.5) * 0.4, Math.sin(angle) * spec.r,
      );
      orbMatrices.push({ position, ring: movingRings[ringIndex], size, spin: (rng() - 0.5) * 0.9, phase: rng() * 6.28 });
    }
    const gearCount = detail >= 1 ? 12 : 4;
    for (let index = 0; index < gearCount; index += 1) {
      const ringIndex = Math.floor(rng() * ringCount);
      const spec = discRings[ringIndex];
      const angle = rng() * Math.PI * 2;
      const size = 1.4 + rng() * 3.4;
      const position = new THREE.Vector3(
        Math.cos(angle) * spec.r, (rng() - 0.5) * 0.6, Math.sin(angle) * spec.r,
      );
      gearMatrices.push({
        position, ring: movingRings[ringIndex], size, spin: (rng() < 0.5 ? -1 : 1) * (0.12 + rng() * 0.35),
        tilt: new THREE.Euler((rng() - 0.5) * 0.8, 0, (rng() - 0.5) * 0.8),
        phase: rng() * 6.28,
      });
    }
    const orbs = new THREE.InstancedMesh(orbGeometry, material, orbMatrices.length);
    orbs.name = 'orrery-orbs';
    disc.add(orbs);
    orbSets.push({ mesh: orbs, items: orbMatrices });
    const gears = new THREE.InstancedMesh(gearGeometry, material, gearMatrices.length);
    gears.name = 'orrery-gears';
    disc.add(gears);
    gearSets.push({ mesh: gears, items: gearMatrices });
  }

  /* Grosse schraege Ringe, die das Ganze umfassen. */
  if (detail >= 1) {
    const greatSpecs = [
      { r: 36, tube: 0.22, tilt: new THREE.Euler(1.05, 0.3, 0.25), speed: 0.006, orbit: 0.0085, orbs: 3 },
      { r: 49, tube: 0.26, tilt: new THREE.Euler(0.75, -1.1, 0.9), speed: -0.0045, orbit: -0.0060, orbs: 4 },
      { r: 63, tube: 0.30, tilt: new THREE.Euler(1.35, 0.9, -0.4), speed: 0.0032, orbit: 0.0042, orbs: 4 },
    ];
    for (const spec of greatSpecs) {
      const parts = [];
      ring(parts, spec.r, spec.tube, Math.round(140 + spec.r * 3), {});
      ticks(parts, spec.r, Math.round(spec.r * 5), {
        length: 0.6, majorEvery: 15, majorLength: 1.5, thickness: 0.08,
      });
      // Eine zweite, feine Schiene mit Sprossen begleitet den grossen Ring.
      ring(parts, spec.r - 1.6, spec.tube * 0.45, Math.round(120 + spec.r * 2.5), {});
      for (let index = 0; index < 60; index += 1) {
        const angle = (index / 60) * Math.PI * 2;
        TMP_A.set(Math.cos(angle) * spec.r, 0, Math.sin(angle) * spec.r);
        TMP_B.set(Math.cos(angle) * (spec.r - 1.6), 0, Math.sin(angle) * (spec.r - 1.6));
        bar(parts, TMP_A, TMP_B, 0.07, 0.07);
      }
      const great = new THREE.Mesh(mergeParts(parts), material);
      great.rotation.copy(spec.tilt);
      precess(great, spec.orbit);
      rotors.push({ object: great, speed: spec.speed, axis: 'local' });
      paths.push({ object: great, radius: spec.r, y: 0, weight: 1.2 });

      const items = [];
      for (let index = 0; index < spec.orbs; index += 1) {
        const angle = rng() * Math.PI * 2;
        items.push({
          position: new THREE.Vector3(Math.cos(angle) * spec.r, 0, Math.sin(angle) * spec.r),
          size: 1.3 + rng() * 2.4, spin: (rng() - 0.5) * 0.7, phase: rng() * 6.28,
        });
      }
      const orbs = new THREE.InstancedMesh(orbGeometry, material, items.length);
      great.add(orbs);
      orbSets.push({ mesh: orbs, items });
    }
  }

  root.scale.setScalar(scale);
  return { root, rotors, orbSets, gearSets, paths };
}

/* ---------- Staub und Leuchtkoerper ---------- */

function createDust(uniforms, rng) {
  const count = 5200;
  const compactCount = 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 2);
  const sizes = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const angle = rng() * Math.PI * 2;
    const local = TMP_A;
    if (index % 3 === 0) {
      // Ein Drittel schwebt als Kugelwolke um die Sockel.
      const radius = 22 + Math.pow(rng(), 0.8) * 60;
      const elevation = (rng() - 0.5) * Math.PI;
      local.set(
        Math.cos(angle) * Math.cos(elevation) * radius,
        Math.sin(elevation) * radius * 0.6,
        Math.sin(angle) * Math.cos(elevation) * radius,
      ).add(PIVOT);
    } else {
      // Der Rest liegt in einer dicken Scheibe um die Maschine.
      const radius = 8 + Math.pow(rng(), 0.7) * 92;
      local.set(Math.cos(angle) * radius, (rng() - 0.5) * 22, Math.sin(angle) * radius);
      local.applyEuler(MACHINE_TILT).add(MACHINE_CENTRE);
    }
    positions[index * 3] = local.x;
    positions[index * 3 + 1] = local.y;
    positions[index * 3 + 2] = local.z;
    seeds[index * 2] = rng();
    seeds[index * 2 + 1] = rng();
    sizes[index] = 0.5 + Math.pow(rng(), 2.2) * 2.4;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 2));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.boundingSphere = new THREE.Sphere(MACHINE_CENTRE.clone(), 120);

  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uPixelRatio: { value: 1 } },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      #define RUNNERS ${RUNNER_SLOTS}
      attribute vec2 aSeed;
      attribute float aSize;
      uniform float uTime, uPixelRatio, uVisible, uDocumentOpen;
      uniform vec3 uCore, uWaveDir;
      uniform float uWaveRadius, uWaveStrength, uWaveCone;
      uniform vec3 uRunnerPos[RUNNERS];
      uniform vec4 uRunnerCol[RUNNERS];
      uniform float uRunnerRadius[RUNNERS];
      varying float vAlpha;
      varying float vWave;
      varying vec3 vRunnerColour;
      ${BACKGROUND_VISIBILITY_GLSL}

      void main() {
        vec3 point = position;
        point.x += sin(uTime * (0.05 + aSeed.x * 0.04) + aSeed.y * 21.0) * (0.3 + aSeed.x * 0.9);
        point.y += cos(uTime * (0.04 + aSeed.y * 0.03) + aSeed.x * 17.0) * (0.2 + aSeed.y * 0.7);
        vec4 world = modelMatrix * vec4(point, 1.0);

        vec3 fromCore = world.xyz - uCore;
        float shell = length(fromCore) - uWaveRadius;
        float sector = smoothstep(uWaveCone - 0.16, uWaveCone + 0.06, dot(normalize(fromCore), uWaveDir));
        float wave = exp(-(shell * shell) / 24.0) * uWaveStrength * sector * mix(0.4, 0.05, uDocumentOpen);

        float runners = 0.0;
        vec3 runnerColour = vec3(0.0);
        for (int index = 0; index < RUNNERS; index += 1) {
          float d = distance(world.xyz, uRunnerPos[index]);
          // Enger als auf den Flaechen: der Staub soll den Laeufer nur
          // saeumen, nicht als Wolke ueberstrahlen.
          float radius = uRunnerRadius[index];
          float glow = exp(-(d * d) / (radius * radius * 0.55)) * uRunnerCol[index].a
            * (1.0 - smoothstep(radius, radius * 1.6, d));
          runners += glow;
          runnerColour += uRunnerCol[index].rgb * glow;
        }
        vWave = wave;
        vRunnerColour = runnerColour / max(0.0001, runners);

        vec4 viewPosition = viewMatrix * world;
        float depthFade = (1.0 - smoothstep(40.0, 150.0, -viewPosition.z))
          * backgroundVisibility(world.xyz);
        // Auch der Staub verschwindet ohne Licht vollstaendig.
        vAlpha = (wave * 0.9 + runners * 0.35)
          * uVisible * (0.4 + aSeed.x * 0.6) * depthFade
          * mix(1.0, 0.5, uDocumentOpen);
        gl_PointSize = min(6.0, aSize * uPixelRatio * (150.0 / max(1.0, -viewPosition.z)) * (0.7 + wave * 1.2 + runners * 0.8));
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uWaveColourA;
      varying float vAlpha;
      varying float vWave;
      varying vec3 vRunnerColour;

      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float d = length(point);
        if (d > 0.5) discard;
        float core = 1.0 - smoothstep(0.0, 0.5, d);
        vec3 idle = vec3(0.30, 0.42, 0.56);
        vec3 colour = mix(idle, mix(vRunnerColour, uWaveColourA, clamp(vWave * 2.0, 0.0, 1.0)), 0.75);
        float alpha = vAlpha * core * core;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(colour, alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'orrery-dust';
  points.frustumCulled = false;
  points.renderOrder = -4;

  return {
    points,
    material,
    setCompact(value) { geometry.setDrawRange(0, value ? compactCount : count); },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}

function createGlowBody(radius, haloScale) {
  const group = new THREE.Group();
  const coreMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uStageCentre: { value: PIVOT.clone() },
      uColour: { value: PALETTE.ice.clone() },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: /* glsl */`
      varying vec3 vWorldPos;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColour;
      uniform float uOpacity;
      varying vec3 vWorldPos;
      ${BACKGROUND_VISIBILITY_GLSL}
      void main() {
        float alpha = uOpacity * backgroundVisibility(vWorldPos);
        if (alpha <= 0.001) discard;
        gl_FragColor = vec4(uColour, alpha);
      }
    `,
  });
  const haloMaterial = coreMaterial.clone();
  const coreGeometry = new THREE.IcosahedronGeometry(radius, 2);
  const haloGeometry = new THREE.IcosahedronGeometry(radius * haloScale, 2);
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  group.add(core, halo);
  group.visible = false;
  return {
    group,
    set(position, colour, strength) {
      group.position.copy(position);
      group.visible = strength > 0.004;
      coreMaterial.uniforms.uColour.value.copy(colour);
      haloMaterial.uniforms.uColour.value.copy(colour);
      coreMaterial.uniforms.uOpacity.value = Math.min(0.9, strength * 0.7);
      haloMaterial.uniforms.uOpacity.value = Math.min(0.16, strength * 0.09);
      core.scale.setScalar(0.8 + strength * 0.5);
      halo.scale.setScalar(1 + strength * 0.9);
    },
    dispose() {
      coreGeometry.dispose(); haloGeometry.dispose();
      coreMaterial.dispose(); haloMaterial.dispose();
    },
  };
}

/* ---------- Die Maschine ---------- */

export function createOrreryMachine({ renderer = null } = {}) {
  const group = new THREE.Group();
  group.name = 'epic-orrery-machine-v6';

  const rng = makeRng(0x0c0ffee5);
  const uniforms = makeSharedUniforms();
  const material = makeMachineMaterial(uniforms);
  const orbGeometry = makeOrbGeometry();
  const gearGeometry = makeGearGeometry();

  const rotors = [];
  const orbSets = [];
  const gearSets = [];
  const paths = [];

  // Hauptmaschine, geneigt hinter den Sockeln.
  const main = buildOrrery({ material, orbGeometry, gearGeometry, rng, scale: 1, detail: 1 });
  const machine = new THREE.Group();
  machine.name = 'orrery-main';
  machine.position.copy(MACHINE_CENTRE);
  machine.rotation.copy(MACHINE_TILT);
  machine.add(main.root);
  group.add(machine);
  rotors.push(...main.rotors, { object: machine, speed: 0.0024, axis: 'y' });
  orbSets.push(...main.orbSets);
  gearSets.push(...main.gearSets);
  paths.push(...main.paths);

  // Drei Satelliten-Mechanismen rund um die Sockel, damit jeder Blickwinkel
  // Struktur zeigt.
  const satellites = [];
  const satelliteSpecs = [
    { position: [58, 18, -12], tilt: [0.9, 0.4, 0.5], scale: 0.34, speed: -0.014 },
    { position: [-52, 24, 18], tilt: [1.2, -0.6, 0.2], scale: 0.28, speed: 0.011 },
    // Die beiden hinteren liegen im Ruecken der Ausgangskamera: erst der
    // Orbit bringt sie ins Bild.
    { position: [-28, 10, 76], tilt: [0.55, 1.5, 0.8], scale: 0.52, speed: 0.009 },
    { position: [46, -6, 62], tilt: [-0.7, 0.9, -0.3], scale: 0.36, speed: -0.012 },
  ];
  for (const spec of satelliteSpecs) {
    const satellite = buildOrrery({ material, orbGeometry, gearGeometry, rng, scale: spec.scale, detail: 0.5 });
    const holder = new THREE.Group();
    holder.position.fromArray(spec.position);
    holder.rotation.set(...spec.tilt);
    holder.add(satellite.root);
    group.add(holder);
    satellites.push(holder);
    rotors.push(...satellite.rotors, { object: holder, speed: spec.speed, axis: 'y' });
    orbSets.push(...satellite.orbSets);
    gearSets.push(...satellite.gearSets);
    for (const path of satellite.paths) paths.push({ ...path, weight: path.weight * 0.35, holder });
  }

  // Zwei flache Skalenringe genau um den Kamera-Drehpunkt: sie fassen die
  // drei Sockel ein und bleiben beim Orbit an ihrem Ort.
  {
    const parts = [];
    ring(parts, 30, 0.22, 220, { y: -4.2 });
    ticks(parts, 30, 180, { y: -4.2, length: 0.5, majorEvery: 15, majorLength: 1.3, thickness: 0.07 });
    ring(parts, 37, 0.14, 240, { y: -6.4, tilt: new THREE.Euler(0.07, 0, -0.04) });
    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2 + 0.13;
      TMP_A.set(Math.cos(angle) * 30, -4.2, Math.sin(angle) * 30);
      TMP_B.set(Math.cos(angle) * 37, -6.4, Math.sin(angle) * 37);
      bar(parts, TMP_A, TMP_B, 0.09, 0.09);
      node(parts, TMP_B, 0.3);
    }
    const halo = new THREE.Mesh(mergeParts(parts), material);
    halo.name = 'pivot-halo';
    halo.position.copy(PIVOT);
    group.add(halo);
    rotors.push({ object: halo, speed: -0.0036, axis: 'y' });
    paths.push({ object: halo, radius: 30, y: -4.2, weight: 1.5 });
    paths.push({ object: halo, radius: 37, y: -6.4, weight: 1.0 });

    // Zwei grosse, steil stehende Ringe um den Drehpunkt: eine Armillarsphaere,
    // in der die Sockel stehen. Sie schliessen die Szene auch nach hinten.
    const armillarySpecs = [
      { r: 46, tube: 0.26, tilt: new THREE.Euler(1.15, 0.55, 0.35), speed: 0.0028, orbs: 3 },
      { r: 56, tube: 0.30, tilt: new THREE.Euler(-0.95, -0.7, 1.05), speed: -0.0021, orbs: 4 },
    ];
    for (const spec of armillarySpecs) {
      const armParts = [];
      ring(armParts, spec.r, spec.tube, Math.round(150 + spec.r * 3), {});
      ticks(armParts, spec.r, Math.round(spec.r * 4), { length: 0.6, majorEvery: 12, majorLength: 1.5, thickness: 0.08 });
      ring(armParts, spec.r - 1.8, spec.tube * 0.4, Math.round(130 + spec.r * 2.5), {});
      for (let index = 0; index < 48; index += 1) {
        const angle = (index / 48) * Math.PI * 2;
        TMP_A.set(Math.cos(angle) * spec.r, 0, Math.sin(angle) * spec.r);
        TMP_B.set(Math.cos(angle) * (spec.r - 1.8), 0, Math.sin(angle) * (spec.r - 1.8));
        bar(armParts, TMP_A, TMP_B, 0.07, 0.07);
      }
      const armillary = new THREE.Mesh(mergeParts(armParts), material);
      armillary.name = 'pivot-armillary';
      armillary.position.copy(PIVOT);
      armillary.rotation.copy(spec.tilt);
      // Auch die Armillarringe kreisen um die Achse ihres Mittelpunkts.
      const armHolder = new THREE.Group();
      armHolder.position.copy(PIVOT);
      armillary.position.set(0, 0, 0);
      armHolder.add(armillary);
      group.add(armHolder);
      rotors.push({ object: armHolder, speed: spec.speed * 1.6, axis: 'y' });
      rotors.push({ object: armillary, speed: spec.speed, axis: 'local' });
      paths.push({ object: armillary, radius: spec.r, y: 0, weight: 1.3 });

      const items = [];
      for (let index = 0; index < spec.orbs; index += 1) {
        const angle = rng() * Math.PI * 2;
        items.push({
          position: new THREE.Vector3(Math.cos(angle) * spec.r, 0, Math.sin(angle) * spec.r),
          size: 1.4 + rng() * 2.2, spin: (rng() - 0.5) * 0.6, phase: rng() * 6.28,
        });
      }
      const orbs = new THREE.InstancedMesh(orbGeometry, material, items.length);
      armillary.add(orbs);
      orbSets.push({ mesh: orbs, items });
    }
  }

  const dust = createDust(uniforms, rng);
  group.add(dust.points);

  const coreGlow = createGlowBody(0.55, 2.6);
  group.add(coreGlow.group);

  // Laeufer: bis zu RUNNER_SLOTS Lichter, die fuer einige Sekunden ein
  // Stueck einer Ringbahn entlangwandern und dann verloeschen.
  const runners = Array.from({ length: RUNNER_SLOTS }, (_, index) => {
    const glow = createGlowBody(0.28, 3.0);
    group.add(glow.group);
    return {
      slotIndex: index,
      active: false, path: null, angle: 0, speed: 0, born: 0, duration: 0,
      radius: 8, colour: PALETTE.cyan.clone(), strength: 0, glow,
      position: uniforms.uRunnerPos.value[index],
      colourUniform: uniforms.uRunnerCol.value[index],
    };
  });
  const pathWeightTotal = () => paths.reduce((sum, path) => sum + (path.holder && !path.holder.visible ? 0 : path.weight), 0);
  let nextRunnerAt = 1.2;

  function pickPath() {
    let pick = rng() * pathWeightTotal();
    for (const path of paths) {
      if (path.holder && !path.holder.visible) continue;
      pick -= path.weight;
      if (pick <= 0) return path;
    }
    return paths[paths.length - 1];
  }

  function launchRunner(elapsed) {
    const runner = runners.find((candidate) => !candidate.active);
    if (!runner) return;
    const path = pickPath();
    runner.active = true;
    runner.path = path;
    runner.angle = rng() * Math.PI * 2;
    // Winkelgeschwindigkeit so, dass die Bahngeschwindigkeit aehnlich bleibt.
    const worldRadius = path.radius * path.object.getWorldScale(TMP_S).x;
    const linear = 4 + rng() * 5;
    runner.speed = (rng() < 0.5 ? -1 : 1) * (linear / Math.max(4, worldRadius));
    runner.born = elapsed;
    runner.duration = 5 + rng() * 7;
    runner.radius = 6 + rng() * 6;
    const roll = rng();
    if (roll < 0.62) runner.colour.copy(PALETTE.cyan).lerp(PALETTE.ice, rng() * 0.5);
    else if (roll < 0.9) runner.colour.copy(PALETTE.amber);
    else runner.colour.copy(PALETTE.ice);
    uniforms.uRunnerRadius.value[runner.slotIndex] = runner.radius;
  }

  function updateRunners(elapsed, dt) {
    const activeCount = runners.filter((runner) => runner.active).length;
    if (activeCount < RUNNER_MAX_ACTIVE && elapsed >= nextRunnerAt) {
      launchRunner(elapsed);
      nextRunnerAt = elapsed + RUNNER_PAUSE_MIN + rng() * (RUNNER_PAUSE_MAX - RUNNER_PAUSE_MIN);
    }
    for (const runner of runners) {
      if (!runner.active) {
        runner.colourUniform.set(0, 0, 0, 0);
        runner.glow.set(runner.position, runner.colour, 0);
        continue;
      }
      const age = elapsed - runner.born;
      if (age > runner.duration) {
        runner.active = false;
        runner.colourUniform.set(0, 0, 0, 0);
        runner.glow.set(runner.position, runner.colour, 0);
        continue;
      }
      runner.angle += runner.speed * dt;
      // Weich auf- und abblenden, dazwischen ein leichtes Flackern.
      const envelope = smooth01(age / 1.2) * (1 - smooth01((age - runner.duration + 1.8) / 1.8));
      const flicker = 0.88 + 0.12 * Math.sin(elapsed * 5.3 + runner.angle * 3.0);
      runner.strength = envelope * flicker * visibility;
      runner.path.object.updateWorldMatrix(true, false);
      TMP_A.set(
        Math.cos(runner.angle) * runner.path.radius,
        runner.path.y,
        Math.sin(runner.angle) * runner.path.radius,
      ).applyMatrix4(runner.path.object.matrixWorld);
      runner.position.copy(TMP_A);
      runner.colourUniform.set(runner.colour.r, runner.colour.g, runner.colour.b, runner.strength);
      runner.glow.set(TMP_A, runner.colour, runner.strength * 0.7);
    }
  }

  let disposed = false;
  let effectsEnabled = true;
  let compact = false;
  let documentOpen = false;
  let suspended = false;
  let visibility = 0;
  let visibilityTarget = 1;
  let lastElapsed = 0;

  // Wellen-Zustand
  let waveActive = false;
  let waveStart = 0;
  let waveIndex = 0;
  let nextWaveAt = 2.4;
  let coreFlash = 0;

  function launchWave(elapsed) {
    waveActive = true;
    waveStart = elapsed;
    waveIndex += 1;
    coreFlash = 1;
    // Richtung des Sektors: zufaellig, aber bevorzugt in den Bereich vor
    // und um die Sockel, wo die Kamera hinschaut.
    const yaw = rng() * Math.PI * 2;
    const pitch = (rng() - 0.5) * 1.6;
    uniforms.uWaveDir.value.set(
      Math.cos(pitch) * Math.sin(yaw),
      Math.sin(pitch),
      Math.cos(pitch) * Math.cos(yaw),
    );
    if (rng() < 0.55) {
      // Zum Drehpunkt hin blenden, damit die Front die Szene um die Sockel trifft.
      TMP_A.copy(PIVOT).sub(MACHINE_CENTRE).normalize();
      uniforms.uWaveDir.value.lerp(TMP_A, 0.6).normalize();
    }
    // Halber Oeffnungswinkel 22..40 Grad.
    uniforms.uWaveCone.value = Math.cos(THREE.MathUtils.degToRad(22 + rng() * 18));
    // Jede dritte Front ist bernsteinfarben, sonst Eis ueber Cyan.
    if (waveIndex % 3 === 0) {
      uniforms.uWaveColourA.value.copy(PALETTE.amber).lerp(PALETTE.ice, 0.35);
      uniforms.uWaveColourB.value.copy(PALETTE.amber).multiplyScalar(0.8);
    } else if (waveIndex % 5 === 0) {
      uniforms.uWaveColourA.value.copy(PALETTE.ice);
      uniforms.uWaveColourB.value.copy(PALETTE.violet);
    } else {
      uniforms.uWaveColourA.value.copy(PALETTE.ice);
      uniforms.uWaveColourB.value.copy(PALETTE.cyan);
    }
  }

  function updateWave(elapsed) {
    if (!waveActive && elapsed >= nextWaveAt) launchWave(elapsed);
    if (!waveActive) {
      uniforms.uWaveStrength.value = 0;
      uniforms.uWaveRadius.value = -50;
      return;
    }
    const age = elapsed - waveStart;
    const radius = age * WAVE_SPEED;
    if (radius > WAVE_MAX_RADIUS + 20) {
      waveActive = false;
      nextWaveAt = elapsed + WAVE_PAUSE_MIN + rng() * (WAVE_PAUSE_MAX - WAVE_PAUSE_MIN);
      uniforms.uWaveStrength.value = 0;
      return;
    }
    // Aufblenden am Kern, ausklingen am Rand.
    const envelope = smooth01(radius / 6) * (1 - smooth01((radius - WAVE_MAX_RADIUS) / 20));
    uniforms.uWaveRadius.value = radius;
    uniforms.uWaveStrength.value = envelope * (0.9 + 0.1 * Math.sin(elapsed * 3.1));
  }

  function updateRotors(elapsed, dt) {
    const activity = suspended || documentOpen ? 0.7 : 1;
    for (const rotor of rotors) {
      const step = rotor.speed * dt * activity;
      if (rotor.axis === 'y') rotor.object.rotation.y += step;
      else if (rotor.axis === 'x') rotor.object.rotateX(step);
      else rotor.object.rotateY(step);
    }
    for (const set of orbSets) {
      set.items.forEach((item, index) => {
        TMP_E.set(
          elapsed * item.spin * 0.6 + item.phase,
          elapsed * item.spin + item.phase * 0.7,
          Math.sin(elapsed * 0.1 + item.phase) * 0.3,
        );
        TMP_Q.setFromEuler(TMP_E);
        TMP_S.setScalar(item.size);
        TMP_M.compose(item.position, TMP_Q, TMP_S);
        // Anbauteile folgen dem kippenden Ring, bleiben aber instanziert.
        if (item.ring) {
          item.ring.updateMatrix();
          TMP_M.premultiply(item.ring.matrix);
        }
        set.mesh.setMatrixAt(index, TMP_M);
      });
      set.mesh.instanceMatrix.needsUpdate = true;
    }
    for (const set of gearSets) {
      set.items.forEach((item, index) => {
        TMP_E.set(item.tilt.x, elapsed * item.spin + item.phase, item.tilt.z);
        TMP_Q.setFromEuler(TMP_E);
        TMP_S.setScalar(item.size);
        TMP_M.compose(item.position, TMP_Q, TMP_S);
        if (item.ring) {
          item.ring.updateMatrix();
          TMP_M.premultiply(item.ring.matrix);
        }
        set.mesh.setMatrixAt(index, TMP_M);
      });
      set.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // Bounding-Sphaeren der Instanzen einmal grosszuegig setzen, damit das
  // Frustum-Culling nicht bei jeder Drehung neu rechnet.
  for (const set of [...orbSets, ...gearSets]) {
    set.mesh.frustumCulled = false;
  }

  // Vor transparenten Projektionen zeichnen; kein Teil des Hintergrunds
  // darf den Tiefenpuffer fuer Lebenslauf, Beschriftung oder Partikel sperren.
  group.traverse((object) => {
    if (object.isMesh || object.isPoints) object.renderOrder = -10;
  });

  const api = {
    group,
    ready: Promise.resolve(true),

    setEffectsEnabled(value) {
      effectsEnabled = Boolean(value);
      visibilityTarget = effectsEnabled ? 1 : 0;
      if (!effectsEnabled) {
        visibility = 0;
        uniforms.uVisible.value = 0;
        group.visible = false;
      } else {
        group.visible = true;
        // Nach dem Intro startet die erste Front kurz nach dem Erscheinen.
        nextWaveAt = Math.min(nextWaveAt, lastElapsed + 1.8);
      }
    },

    setSuspended(value) { suspended = Boolean(value); },

    setDocumentOpen(value) {
      documentOpen = Boolean(value);
    },

    setCompact(value) {
      compact = Boolean(value);
      for (const holder of satellites) holder.visible = !compact;
      dust.setCompact(compact);
    },

    setPointerNdc() {
      // Die Beleuchtung ist autonom.
    },

    setPixelRatio(value) {
      dust.material.uniforms.uPixelRatio.value = Math.min(1.6, Math.max(0.75, Number(value) || 1));
    },

    /** Kompatibel zur Intro-Steuerung, aber ohne dauerhafte Grundhelligkeit. */
    setAmbient() {},

    /** Loest sofort eine neue Lichtfront aus. */
    triggerSparseIllumination() {
      if (!effectsEnabled || disposed) return false;
      launchWave(lastElapsed);
      return true;
    },

    /** Schickt sofort einen Laeufer auf die Reise (Test und Entwicklung). */
    triggerRunner() {
      if (!effectsEnabled || disposed) return false;
      launchRunner(lastElapsed);
      return true;
    },

    update(elapsed, delta) {
      lastElapsed = Number.isFinite(elapsed) ? elapsed : lastElapsed;
      const dt = Math.min(0.1, Math.max(0, delta || 0));
      visibility += (visibilityTarget - visibility) * (1 - Math.pow(0.02, dt));
      uniforms.uVisible.value = visibility;
      uniforms.uTime.value = elapsed;
      // Der Dokumentzustand wandert in etwa einer Sekunde, statt zu springen.
      uniforms.uDocumentOpen.value += ((documentOpen ? 1 : 0) - uniforms.uDocumentOpen.value)
        * (1 - Math.pow(0.03, dt));

      if (!effectsEnabled && visibility < 0.002) {
        group.visible = false;
        return;
      }
      group.visible = true;

      updateRotors(elapsed, dt);
      updateWave(elapsed);
      updateRunners(elapsed, dt);

      // Nur beim Start einer Front flammt der Kern kurz auf.
      coreFlash = Math.max(0, coreFlash - dt / 2.2);
      const pulse = coreFlash * 0.9;
      uniforms.uCoreGlow.value = pulse * visibility;
      coreGlow.set(MACHINE_CENTRE, uniforms.uWaveColourA.value, pulse * visibility * 0.5);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      group.traverse((object) => {
        if (object.isMesh && object.geometry !== orbGeometry && object.geometry !== gearGeometry) {
          object.geometry?.dispose?.();
        }
      });
      orbGeometry.dispose();
      gearGeometry.dispose();
      material.dispose();
      dust.dispose();
      coreGlow.dispose();
      for (const runner of runners) runner.glow.dispose();
      group.clear();
    },
  };

  // Nur im Entwicklungsmodus: Zugriff fuer Sichtpruefungen.
  if (import.meta.env?.DEV && typeof window !== 'undefined') window.__orrery = api;
  return api;
}
