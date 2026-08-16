import * as THREE from 'three';
import { RUNES, PRIMARY, SECONDARY, SYSTEM_SIGNS } from './runes.js';
import { SACRED_FIGURES } from './sacredGeometry.js';
import { lightColor } from './palette.js';

/**
 * Hintergrund-Szenerie.
 *
 * Ruhendes Bild: ein weit entferntes Leiterbahnengeflecht im Universum.
 * Darauf laufen hoechstens ein bis zwei Impulse gleichzeitig.
 *
 * Ablauf eines Impulses:
 *   1. Impuls startet am Anfang einer Bahn
 *   2. waehrend er laeuft, glimmt die ihm zugeordnete Rune auf
 *   3. am Ende schlaegt er auf: die Chipstruktur am Bahnende blitzt
 *      kurz in derselben Farbe auf, die Rune erreicht ihr Maximum
 *   4. alles klingt ab, es bleibt wieder still
 *
 * Alle Zustaende liegen in einer kleinen Datentextur (eine Spalte je Bahn),
 * dadurch bleibt es bei drei Draw Calls fuer beliebig viele Bahnen.
 *   R = Kopfposition 0..1   (-1 = ruht)
 *   G = Impulslaenge
 *   B = Farbton 0 = blaugruen, 1 = bernstein
 *   A = Aufprallblitz 0..1
 */

const FIB = [3, 5, 8, 13, 21, 34, 55];

const MAX_ACTIVE   = 1;
const SPAWN_MIN    = 4.2;
const SPAWN_MAX    = 9.5;
const IMPACT_DECAY = 1.1;   // Sekunden bis der Aufprall verglommen ist
const MAX_SACRED_ACTIVE = 2;
// Die Erscheinungshaeufigkeit der heiligen Geometrie liegt bewusst niedrig:
// gegenueber der ersten Fassung um rund 45 Prozent gestreckt.
const SACRED_SPAWN_MIN = 8.0;
const SACRED_SPAWN_MAX = 16.7;
// Anteil der Impuls-Aufprallstellen, die zusaetzlich eine Figur entzuenden.
const SACRED_IMPACT_CHANCE = 0.34;
// Letzte Lebensphase: die Figur blinkt schnell, bevor sie verschwindet.
const SACRED_BLINK_DUR = 1.63;
const SACRED_BLINK_HZ  = 6.5;

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/** Leiterbahn: achsenparallel mit gelegentlichen 45-Grad-Schraegen. */
function routeTrace(rng, origin, layer) {
  const pts = [origin.clone()];
  const segments = 3 + Math.floor(rng() * 4);
  const dir = new THREE.Vector2(rng() < 0.5 ? 1 : -1, 0);

  for (let i = 0; i < segments; i++) {
    const len = (FIB[1 + Math.floor(rng() * 4)] / 7) * (1 + layer * 0.3);
    const last = pts[pts.length - 1];
    pts.push(new THREE.Vector3(last.x + dir.x * len, last.y + dir.y * len, last.z));

    const turn = rng();
    if (turn < 0.5) {
      dir.set(0, rng() < 0.5 ? 1 : -1);
    } else if (turn < 0.72) {
      const s = 0.7071;
      dir.set(dir.x !== 0 ? Math.sign(dir.x) * s : (rng() < 0.5 ? s : -s),
              dir.y !== 0 ? Math.sign(dir.y) * s : (rng() < 0.5 ? s : -s));
    }
  }
  return pts;
}

/** Chipgehaeuse als Strichzeichnung: Rahmen, Kern, Beinchen, Innenleitungen. */
function chipStrokes(rng) {
  const w = 0.85 + rng() * 0.5;
  const h = 0.62 + rng() * 0.45;
  const s = [];
  const rect = (x0, y0, x1, y1) => {
    s.push([x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]);
  };

  rect(-w, -h, w, h);
  rect(-w * 0.58, -h * 0.58, w * 0.58, h * 0.58);

  const pins = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < pins; i++) {
    const y = -h + ((i + 0.5) / pins) * h * 2;
    s.push([-w, y, -w - 0.3, y], [w, y, w + 0.3, y]);
  }
  const top = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < top; i++) {
    const x = -w + ((i + 0.5) / top) * w * 2;
    s.push([x, h, x, h + 0.26], [x, -h, x, -h - 0.26]);
  }
  for (let i = 0; i < 3; i++) {
    const y = (rng() - 0.5) * h;
    s.push([-w * 0.5, y, w * 0.5 * (rng() < 0.5 ? -0.2 : 1), y]);
  }
  return s;
}

export function createBackground({ layers = 3, tracesPerLayer = 10, seed = 20260802 } = {}) {
  const group = new THREE.Group();
  // Leiterbahnen, Chips, Runen und sakrale Geometrie liegen zusammen: sie
  // treten hinter dem geoeffneten Lebenslauf zurueck. Sterne und Nebel
  // bleiben dagegen immer stehen — der Raum verschwindet nie.
  const traceGroup = new THREE.Group();
  group.add(traceGroup);
  const rng = makeRng(seed);

  const traces = [];
  const linePos = [], lineDist = [], lineId = [], lineDim = [];
  const chipPos = [], chipId = [], chipDim = [];
  const runePos = [], runeId = [], runeDim = [], runeKind = [];
  let runeCursor = 0;

  for (let l = 0; l < layers; l++) {
    const depth = -22 - l * 15;
    const spreadX = 40 + l * 16;
    const spreadY = 22 + l * 9;
    const dim = 0.72 - l * 0.18;

    for (let t = 0; t < tracesPerLayer; t++) {
      const id = traces.length;
      const origin = new THREE.Vector3(
        (rng() - 0.5) * spreadX * 2,
        (rng() - 0.5) * spreadY * 2,
        depth + (rng() - 0.5) * 5
      );
      const pts = routeTrace(rng, origin, l);

      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
      const total = cum[cum.length - 1];
      if (total < 1) continue;

      traces.push({ id, total, dim });

      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
        lineDist.push(cum[i] / total, cum[i + 1] / total);
        lineId.push(id, id);
        lineDim.push(dim, dim);
      }

      // Chip am Bahnende
      const end = pts[pts.length - 1];
      const scale = 0.8 + l * 0.32;
      for (const [x0, y0, x1, y1] of chipStrokes(rng)) {
        chipPos.push(end.x + x0 * scale, end.y + y0 * scale, end.z,
                     end.x + x1 * scale, end.y + y1 * scale, end.z);
        chipId.push(id, id);
        chipDim.push(dim, dim);
      }

      // Rune, hinter der Bahnmitte
      const mid = pts[Math.floor(pts.length / 2)];
      const family = runeCursor % 4;
      const isPrimary = family < 2;
      const key = isPrimary
        ? PRIMARY[runeCursor % PRIMARY.length]
        : family === 2
          ? SYSTEM_SIGNS[Math.floor(runeCursor / 4) % SYSTEM_SIGNS.length]
          : SECONDARY[Math.floor(rng() * SECONDARY.length)];
      runeCursor++;

      const rs = 1.6 + l * 0.7 + rng() * 0.8;
      const rx = mid.x + (rng() - 0.5) * 7;
      const ry = mid.y + (rng() - 0.5) * 5;
      const rz = origin.z - 7 - rng() * 5;
      const kind = isPrimary ? 1 : 0;

      for (const [x0, y0, x1, y1] of RUNES[key].strokes) {
        runePos.push(rx + x0 * rs, ry + y0 * rs, rz, rx + x1 * rs, ry + y1 * rs, rz);
        runeId.push(id, id);
        runeDim.push(dim, dim);
        runeKind.push(kind, kind);
      }
    }
  }

  /* ---------- Zustandstextur ---------- */

  const count = traces.length;
  const stateData = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) stateData[i * 4] = -1;

  const stateTex = new THREE.DataTexture(stateData, count, 1, THREE.RGBAFormat, THREE.FloatType);
  stateTex.minFilter = stateTex.magFilter = THREE.NearestFilter;
  stateTex.needsUpdate = true;

  const shared = {
    uState: { value: stateTex },
    uCount: { value: count },
    uTime:  { value: 0 },
    uAmbient: { value: 0.18 },   // Staerke des Runen-Grundglimmers, im Intro auf 1
    uAmber: { value: lightColor('amber') },
    uCyan:  { value: lightColor('fiber') },
    uBase:  { value: lightColor('base') },
  };

  const SAMPLE = /* glsl */`
    uniform sampler2D uState;
    uniform float uCount;
    vec4 fetchState(float id) {
      return texture2D(uState, vec2((id + 0.5) / uCount, 0.5));
    }
  `;

  /* ---------- Leiterbahnen ---------- */

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  lineGeo.setAttribute('aDist',    new THREE.Float32BufferAttribute(lineDist, 1));
  lineGeo.setAttribute('aId',      new THREE.Float32BufferAttribute(lineId, 1));
  lineGeo.setAttribute('aDim',     new THREE.Float32BufferAttribute(lineDim, 1));

  traceGroup.add(new THREE.LineSegments(lineGeo, new THREE.ShaderMaterial({
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      ${SAMPLE}
      attribute float aDist, aId, aDim;
      varying float vDist, vHead, vPulse, vDim, vTint;
      void main() {
        vec4 st = fetchState(aId);
        vDist = aDist; vHead = st.r; vPulse = st.g; vTint = st.b; vDim = aDim;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uAmber, uCyan, uBase;
      varying float vDist, vHead, vPulse, vDim, vTint;
      void main() {
        float base = 0.18 * vDim;
        float energy = 0.0;
        if (vHead >= 0.0) {
          float behind = vHead - vDist;
          if (behind >= 0.0) energy = exp(-behind / max(vPulse, 0.001) * 2.4);
          energy += smoothstep(0.025, 0.0, -behind) * 0.5;
          energy = clamp(energy, 0.0, 1.5) * vDim;
        }
        vec3 hot = mix(uCyan, uAmber, vTint);
        float a = base + energy * 0.9;
        if (a < 0.005) discard;
        gl_FragColor = vec4(uBase * base + hot * energy, a);
      }
    `,
  })));

  /* ---------- Chipstrukturen ---------- */

  const chipGeo = new THREE.BufferGeometry();
  chipGeo.setAttribute('position', new THREE.Float32BufferAttribute(chipPos, 3));
  chipGeo.setAttribute('aId',      new THREE.Float32BufferAttribute(chipId, 1));
  chipGeo.setAttribute('aDim',     new THREE.Float32BufferAttribute(chipDim, 1));

  traceGroup.add(new THREE.LineSegments(chipGeo, new THREE.ShaderMaterial({
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      ${SAMPLE}
      attribute float aId, aDim;
      varying float vFlash, vTint, vDim;
      void main() {
        vec4 st = fetchState(aId);
        vFlash = st.a; vTint = st.b; vDim = aDim;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uAmber, uCyan, uBase;
      varying float vFlash, vTint, vDim;
      void main() {
        float base = 0.08 * vDim;
        float a = base + vFlash * 0.9 * vDim;
        if (a < 0.005) discard;
        vec3 hot = mix(uCyan, uAmber, vTint);
        gl_FragColor = vec4(uBase * base + hot * vFlash * 1.15, a);
      }
    `,
  })));

  /* ---------- Runen ---------- */

  const runeGeo = new THREE.BufferGeometry();
  runeGeo.setAttribute('position', new THREE.Float32BufferAttribute(runePos, 3));
  runeGeo.setAttribute('aId',      new THREE.Float32BufferAttribute(runeId, 1));
  runeGeo.setAttribute('aDim',     new THREE.Float32BufferAttribute(runeDim, 1));
  runeGeo.setAttribute('aKind',    new THREE.Float32BufferAttribute(runeKind, 1));

  traceGroup.add(new THREE.LineSegments(runeGeo, new THREE.ShaderMaterial({
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      ${SAMPLE}
      uniform float uTime, uAmbient;
      attribute float aId, aDim, aKind;
      varying float vGlow, vTint, vDim, vKind;
      void main() {
        vec4 st = fetchState(aId);
        vDim = aDim; vKind = aKind;
        float travel = st.r >= 0.0 ? smoothstep(0.0, 0.85, st.r) * 0.45 : 0.0;

        // Grundglimmer im goldenen Takt: die Phase je Bahn ist Bahnnummer mal
        // goldener Schnitt. Das verteilt die Aufleuchtmomente maximal
        // gleichmaessig, ohne dass je zwei Runen synchron laufen. Der hohe
        // Exponent macht aus der Welle kurze Glimmer statt Dauerwabern.
        float phase = fract(aId * 0.6180339887) * 6.2831853;
        float amb = pow(0.5 + 0.5 * sin(uTime * 0.35 - phase), 6.0)
                  * uAmbient * mix(0.35, 1.0, aKind);
        float amberMoment = pow(max(0.0, sin(uTime * 0.43 + phase * 1.71)), 20.0);
        vTint = max(st.b, amberMoment);

        vGlow = max(max(travel, st.a), amb);
        vec3 p = position;
        p.x += sin(uTime * 0.19 + phase) * mix(0.018, 0.065, aDim);
        p.y += cos(uTime * 0.16 + phase * 1.37) * mix(0.014, 0.052, aDim);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uAmber, uCyan;
      varying float vGlow, vTint, vDim, vKind;
      void main() {
        float strength = mix(0.34, 1.0, vKind);
        float a = (0.035 + vGlow * 0.72) * strength * vDim * 0.62;
        if (a < 0.004) discard;
        vec3 hot = mix(uCyan, uAmber, vTint);
        gl_FragColor = vec4(hot * (0.42 + vGlow * 0.7), a);
      }
    `,
  })));

  /* ---------- Heilige Geometrie ---------- */

  // Die Bildvorlage im Ordner Heiligegeometrie ist ein Referenzatlas. Die
  // zwölf Motive liegen als Vektoren vor, damit sie ohne Bildrahmen, Text und
  // feste Positionen frei im Raum materialisieren koennen.
  const sacredGroup = new THREE.Group();
  traceGroup.add(sacredGroup);

  const sacredPool = SACRED_FIGURES.map((figure) => {
    const positions = [];
    for (const [x0, y0, x1, y1] of figure.strokes) {
      positions.push(x0, y0, 0, x1, y1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const uniforms = {
      uIntensity: { value: 0 },
      uTint: { value: 0 },
      uAmber: shared.uAmber,
      uCyan: shared.uCyan,
    };
    const mesh = new THREE.LineSegments(geometry, new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uAmber, uCyan;
        uniform float uIntensity, uTint;
        void main() {
          float a = uIntensity * 0.55;
          if (a < 0.004) discard;
          vec3 color = mix(uCyan, uAmber, uTint) * (0.55 + uIntensity * 0.95);
          gl_FragColor = vec4(color, a);
        }
      `,
    }));
    mesh.visible = false;
    mesh.frustumCulled = false;
    sacredGroup.add(mesh);
    return {
      mesh,
      uniforms,
      name: figure.name,
      round: Boolean(figure.round),
      life: -1,
      dur: 1,
      spin: 0,
      tiltSpin: 0,
      yawSpin: 0,
      drift: new THREE.Vector3(),
    };
  });

  let sacredActive = 0;
  let sacredNextSpawn = 5.0 + rng() * 5.2;
  let symbolOnly = false;
  let documentOpen = false;

  function syncSacredVisibility() {
    sacredGroup.visible = !symbolOnly && !documentOpen;
  }

  /**
   * Setzt eine Vorlage an eine neue Stelle. Der Pool verhindert, dass die
   * Geometrien den ruhigen Hintergrund mit mehr als zwei Lichtzeichen fuellen.
   *
   * Die Figuren stehen weit hinten und streuen ueber die gesamte Bildflaeche.
   * Alle driften langsam durch den Raum; nur die kreisbasierten Motive drehen
   * sich zusaetzlich um die eigene Achse, im oder gegen den Uhrzeigersinn.
   */
  function igniteSacred(tint) {
    if (!sacredGroup.visible || sacredActive >= MAX_SACRED_ACTIVE) return false;
    const idle = sacredPool.filter((entry) => entry.life < 0);
    if (!idle.length) return false;

    const entry = idle[Math.floor(rng() * idle.length)];
    const depth = -72 - rng() * 128;
    const depthScale = (Math.abs(depth) - 72) / 128;
    entry.mesh.position.set(
      (rng() - 0.5) * (150 + depthScale * 140),
      (rng() - 0.5) * (62 + depthScale * 76),
      depth,
    );
    entry.mesh.scale.setScalar((3.8 + rng() * 5.2) * (1 + depthScale * 0.7));
    entry.mesh.rotation.set(
      (rng() - 0.5) * 0.34,
      (rng() - 0.5) * 0.5,
      rng() * Math.PI * 2,
    );

    // Kreisbasierte Motive rotieren, eckige bleiben in ihrer Lage stehen.
    const turn = rng() < 0.5 ? -1 : 1;
    entry.spin     = entry.round ? turn * (0.045 + rng() * 0.085) : 0;
    entry.tiltSpin = entry.round ? turn * (0.006 + rng() * 0.012) : 0;
    entry.yawSpin  = entry.round ? turn * (0.005 + rng() * 0.011) : 0;

    // Alle Figuren treiben durch den Raum, bevor sie wieder vergehen.
    entry.drift.set(
      (rng() - 0.5) * 3.1,
      (rng() - 0.5) * 1.9,
      (rng() - 0.5) * 1.4,
    );

    entry.dur = 9.5 + rng() * 6.5;
    entry.life = 0;
    entry.uniforms.uTint.value = tint;
    entry.mesh.visible = true;
    sacredActive++;
    return true;
  }

  /* ---------- Sternenstaub ---------- */

  const starCount = 440;
  const starPos = new Float32Array(starCount * 3);
  const starSeed = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3]     = (rng() - 0.5) * 260;
    starPos[i * 3 + 1] = (rng() - 0.5) * 170;
    starPos[i * 3 + 2] = -25 - rng() * 210;
    starSeed[i] = rng() * 100;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  starGeo.setAttribute('aSeed',    new THREE.Float32BufferAttribute(starSeed, 1));

  const starUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uCompact: { value: 0 },
  };
  group.add(new THREE.Points(starGeo, new THREE.ShaderMaterial({
    uniforms: starUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime, uPixelRatio;
      varying float vTw, vWarm;
      void main() {
        vTw = 0.3 + 0.7 * (0.5 + 0.5 * sin(uTime * 0.28 + aSeed));
        vWarm = fract(aSeed * 0.37);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (0.9 + vTw * 1.1) * uPixelRatio * (30.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uCompact;
      varying float vTw, vWarm;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float r = length(p);
        if (r > 0.5) discard;
        vec3 col = mix(vec3(0.62, 0.78, 0.96), vec3(0.68, 0.58, 0.92), step(0.88, vWarm));
        gl_FragColor = vec4(col, smoothstep(0.5, 0.0, r) * vTw * 0.32 * mix(1.0, 0.38, uCompact));
      }
    `,
  })));

  /* ---------- Weltraumnebel: weit hinten, sehr langsam ---------- */

  // Fuenf grosszuegige Schichten in wachsender Entfernung. Der Farbverlauf
  // laeuft von kaltem Blau ueber Violett bis zu einem gedaempften Bernstein,
  // damit die Nebel dieselbe Farbwelt wie die Impulse tragen.
  const nebulaTime = { value: 0 };
  const nebulaMaterials = [];
  const nebulaMeshes = [];
  const nebulaSpecs = [
    { x: -86, y:  32, z: -238, w: 260, h: 158, seed: 1.0,  tint: 0.10, a: 0.30, drift:  0.42, warp: 1.0 },
    { x:  74, y: -36, z: -276, w: 300, h: 182, seed: 3.7,  tint: 0.74, a: 0.24, drift: -0.31, warp: 1.3 },
    { x:  24, y:  56, z: -210, w: 190, h: 122, seed: 6.2,  tint: 0.44, a: 0.17, drift:  0.55, warp: 0.8 },
    { x: -38, y: -52, z: -318, w: 340, h: 196, seed: 9.4,  tint: 0.92, a: 0.15, drift: -0.22, warp: 1.6 },
    { x: 108, y:  62, z: -352, w: 300, h: 174, seed: 12.1, tint: 0.30, a: 0.13, drift:  0.18, warp: 1.1 },
  ];

  for (const n of nebulaSpecs) {
    const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: nebulaTime,
          uSeed: { value: n.seed },
          uTint: { value: n.tint },
          uAlpha: { value: n.a },
          uWarp: { value: n.warp },
          uCompact: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */`
          uniform float uTime, uSeed, uTint, uAlpha, uWarp, uCompact;
          varying vec2 vUv;

          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                       mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
          }
          float fbm(vec2 p){
            float v = 0.0, a = 0.5;
            for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
            return v;
          }

          void main() {
            vec2 p = (vUv - 0.5) * 2.4;
            // Sehr traege Eigenbewegung: eine volle Schwebung dauert Minuten.
            float t = uTime * 0.0022;

            // Domain-Warping gibt der Wolke ihre schlierigen Auslaeufer.
            vec2 q = vec2(
              fbm(p * 1.2 + vec2(uSeed, uSeed * 0.7) + vec2(t, -t * 0.6)),
              fbm(p * 1.2 + vec2(uSeed * 1.9 + 5.2, uSeed * 0.3) + vec2(-t * 0.8, t))
            );
            vec2 r = vec2(
              fbm(p * 1.7 + uWarp * 2.4 * q + vec2(1.7, 9.2) + t * 0.5),
              fbm(p * 1.7 + uWarp * 2.4 * q + vec2(8.3, 2.8) - t * 0.4)
            );
            float n = fbm(p * 1.9 + uWarp * 2.0 * r + uSeed);

            // Zwei Dichtestufen: weicher Grundschleier und heller Kern.
            float veil = pow(smoothstep(0.28, 0.92, n), 1.9);
            float core = pow(smoothstep(0.58, 0.98, n), 4.2);
            float filament = pow(1.0 - abs(r.x - r.y) * 1.7, 6.0) * 0.35;

            float vign = smoothstep(1.12, 0.05, length(p));

            vec3 cold  = vec3(0.045, 0.15, 0.32);
            vec3 mid   = vec3(0.17, 0.10, 0.36);
            vec3 warm  = vec3(0.34, 0.19, 0.20);
            vec3 col = mix(cold, mid, smoothstep(0.0, 0.6, uTint));
            col = mix(col, warm, smoothstep(0.6, 1.0, uTint));
            // Der Kern zieht leicht ins Helle, so bekommen die Wolken Tiefe.
            col = mix(col, col + vec3(0.24, 0.26, 0.30), core);

            float alpha = (veil * 0.62 + core * 0.5 + max(0.0, filament) * veil)
              * vign * uAlpha * mix(1.0, 0.12, uCompact);
            if (alpha < 0.002) discard;
            gl_FragColor = vec4(col, alpha);
          }
        `,
      });
    nebulaMaterials.push(material);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(n.w, n.h), material);
    mesh.position.set(n.x, n.y, n.z);
    mesh.userData.driftSpeed = n.drift;
    mesh.userData.homeX = n.x;
    mesh.userData.homeY = n.y;
    nebulaMeshes.push(mesh);
    group.add(mesh);
  }

  /* ---------- Ablaufsteuerung ---------- */

  const runtime = traces.map((t) => ({
    head: -1, speed: 0, pulse: 0, tint: 0, impact: 0, total: t.total,
  }));
  let active = 0;
  let nextSpawn = 1.4;
  let compactFactor = 1;

  function spawn() {
    const idle = [];
    for (let i = 0; i < runtime.length; i++) if (runtime[i].head < 0) idle.push(i);
    if (!idle.length) return;

    const r = runtime[idle[Math.floor(rng() * idle.length)]];
    const velocity = 4.5 + rng() * 5.5;        // Einheiten je Sekunde
    r.head = 0;
    r.speed = velocity / r.total;
    r.pulse = 0.1 + rng() * 0.26;
    r.tint = rng() < 0.3 ? 1 : 0;
    active++;
  }

  return {
    group,
    traceCount: count,

    /** Uniform des Runen-Grundglimmers; das Intro dreht ihn auf und wieder ab. */
    ambient: shared.uAmbient,

    /** Intro blendet den zufaelligen Symbol-Pool kurz aus. */
    setSymbolOnly(active) {
      symbolOnly = Boolean(active);
      syncSacredVisibility();
    },

    /** Keep the geometric background out of the transparent CV text field. */
    setDocumentOpen(active) {
      documentOpen = Boolean(active);
      // Die Projektion ist die Buehne: das nahe Leiterbahnfeld tritt ab,
      // damit keine Rune mit der Schrift konkurriert. Sterne und Nebel
      // bleiben, sonst staende der Lebenslauf im Nichts.
      traceGroup.visible = !documentOpen;
      syncSacredVisibility();
    },

    setCompact(active) {
      compactFactor = active ? 0.07 : 1;
      starUniforms.uCompact.value = active ? 1 : 0;
      for (const material of nebulaMaterials) material.uniforms.uCompact.value = active ? 1 : 0;
    },

    setPixelRatio(pr) { starUniforms.uPixelRatio.value = pr; },

    update(elapsed, delta) {
      const dt = Math.min(delta, 0.1);
      starUniforms.uTime.value = elapsed;
      shared.uTime.value = elapsed;
      nebulaTime.value = elapsed;
      // Die Nebelschichten wandern kaum merklich seitwaerts.
      for (const mesh of nebulaMeshes) {
        const speed = mesh.userData.driftSpeed;
        mesh.position.x = mesh.userData.homeX
          + Math.sin(elapsed * 0.0043 * speed + speed * 3.1) * 22;
        mesh.position.y = mesh.userData.homeY
          + Math.cos(elapsed * 0.0031 * speed + speed * 1.7) * 11;
      }
      group.rotation.z = Math.sin(elapsed * 0.017) * 0.01;

      nextSpawn -= dt;
      if (nextSpawn <= 0) {
        if (active < MAX_ACTIVE) spawn();
        nextSpawn = SPAWN_MIN + rng() * (SPAWN_MAX - SPAWN_MIN);
      }

      sacredNextSpawn -= dt;
      if (sacredNextSpawn <= 0) {
        igniteSacred(rng() < 0.26 ? 1 : 0);
        sacredNextSpawn = SACRED_SPAWN_MIN
          + rng() * (SACRED_SPAWN_MAX - SACRED_SPAWN_MIN);
      }

      for (let i = 0; i < runtime.length; i++) {
        const r = runtime[i];
        if (r.head >= 0) {
          r.head += r.speed * dt;
          if (r.head >= 1) {
            r.head = -1;
            r.impact = 1;      // Aufprall auf den Chip
            // Nur ein Teil der Aufprallstellen entzuendet zusaetzlich eine
            // Figur; sonst waere der Hintergrund zu belebt.
            if (rng() < SACRED_IMPACT_CHANCE) igniteSacred(r.tint);
            active--;
          }
        }
        if (r.impact > 0) r.impact = Math.max(0, r.impact - dt / IMPACT_DECAY);

        const o = i * 4;
        stateData[o]     = r.head;
        stateData[o + 1] = r.pulse;
        stateData[o + 2] = r.tint;
        stateData[o + 3] = r.impact * r.impact;   // schneller Abfall
      }
      stateTex.needsUpdate = true;

      // Aufleuchtende Geometrie: schneller Anstieg, ruhige Wanderung durch den
      // Raum, langes Verglimmen und zum Schluss ein schnelles Blinken.
      for (const entry of sacredPool) {
        if (entry.life < 0) continue;
        entry.life += dt;
        const t = entry.life / entry.dur;
        if (t >= 1) {
          entry.life = -1;
          entry.uniforms.uIntensity.value = 0;
          entry.mesh.visible = false;
          sacredActive--;
          continue;
        }
        const attack = Math.min(1, entry.life / 0.55);
        const decay = Math.pow(1 - t, 1.7);
        const remaining = entry.dur - entry.life;
        let envelope = attack * decay;
        if (remaining <= SACRED_BLINK_DUR) {
          // Waehrend der Blinkphase haelt eine Untergrenze die Figur sichtbar,
          // damit das Flackern nicht im Verglimmen untergeht.
          const phase = (SACRED_BLINK_DUR - remaining) * SACRED_BLINK_HZ;
          const on = Math.sin(phase * Math.PI * 2) > 0 ? 1 : 0.06;
          envelope = attack * Math.max(0.45, decay) * on;
        }
        entry.uniforms.uIntensity.value = envelope * compactFactor;

        entry.mesh.position.addScaledVector(entry.drift, dt);
        if (entry.round) {
          entry.mesh.rotation.z += entry.spin * dt;
          entry.mesh.rotation.x += entry.tiltSpin * dt;
          entry.mesh.rotation.y += entry.yawSpin * dt;
        }
      }
    },

    dispose() {
      group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
      stateTex.dispose();
    },
  };
}
