import * as THREE from 'three';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LIGHT_PALETTE, lightColor } from './palette.js';
import { createResumeProjection, CV_ANCHORS, CV_PAGE_COUNT } from './resumeProjection.js';

/**
 * Die drei interaktiven Bereichssockel.
 *
 * Alle drei Bereiche teilen dieselbe geladene Sockelquelle. Die Instanzen
 * entstehen per clone(), Geometrien, Texturen und Materialien bleiben geteilt.
 * Bis zum Laden hält ein leichter prozeduraler Fallback die Navigation bereit.
 *
 * Der Lebenslauf-Sockel traegt zusaetzlich das Dokumentfenster: eine Flaeche
 * direkt ueber der Sockeloberkante, durch die der Lebenslauf laeuft.
 */

const BASE_Y = -6.15;
// Die gesamte Sockelreihe sitzt im Startbild etwas tiefer. Der Versatz
// nimmt ungefaehr ein Drittel des bisherigen Abstandes zum unteren Rand weg.
const HOME_ROW_DROP = -1.6;
const BASE_BOTTOM = BASE_Y - 0.9;
const BASE_TOP = BASE_Y + 0.9;
const BASE_DIAMETER = 7.4;
// Radius des weissen Rings auf der Sockeloberflaeche. Nur aus diesem Ring
// treten die Partikel des Lebenslauf-Sockels aus.
const RING_RADIUS = 1.95;
// Steighoehe und Aufweitung des Partikelstrahls. Bewusst knapp ein Drittel
// der frueheren Ausdehnung: der Strahl begleitet das Dokument, statt es zu
// ueberstrahlen — auch im Startbild.
const JET_HEIGHT = 1.3;
const JET_SPREAD = 0.23;
// Hoehe des "Coming soon"-Schriftzugs ueber der Sockeloberkante. Er steht
// bewusst ueber der Partikelfahne, damit die Schrift lesbar bleibt.
const TEASER_Y = 1.62;
// Zusaetzliche Klickhoehe ueber der Sockeloberkante: die beiden
// angekuendigten Bereiche nehmen ihren Schriftzug mit, der Lebenslauf sein
// Dokument. Frueher hing hier ein 6 Einheiten hoher Trefferkoerper im Leeren.
const HIT_HEADROOM = { abschluss: TEASER_Y + 0.6, projekte: TEASER_Y + 0.6, lebenslauf: JET_HEIGHT };
// Grenzen des Dokumentfensters in Welteinheiten. Das Fenster ist genau eine
// Seite hoch; die Breite folgt daraus und bleibt hoechstens so breit wie der
// Sockel.
const DOC_MAX_WIDTH = 7.35;
// Das Blatt greift leicht in die obere Zone der Partikelfahne. Zusammen mit
// der bereits eingerueckten unteren Rahmenkante wirkt es dadurch, als wuerde
// das Hologramm unmittelbar aus dem Duesenstrahl materialisieren.
const DOC_LIFT = JET_HEIGHT - 0.13;
// Das Blatt schwebt nahezu zentrisch ueber dem Sockel — direkt ueber dem
// Partikelstrahl, nicht weit davor. Ein kleiner Z-Versatz haelt den
// vorderen Sockelrand aus dem Blick auf den Seitenfuss.
const DOC_FRONT = 0.4;
const RESUME_KEY = 'lebenslauf';
// Ruhehelligkeit der Lebenslauf-Vorschau, solange der Sockel nicht offen ist.
const RESUME_IDLE_OPACITY = 0.85;
// Das Dokument behaelt beim Anklicken exakt dieselbe physische Groesse.
// Nur die Kamera faehrt heran; dadurch gibt es kein Schrumpfen oder Strecken.
const RESUME_IDLE_SCALE = 1;
// Die Weltgeometrie der Projektion bleibt bewusst etwas kleiner als der
// Sockeldurchmesser. Da die Fokus-Kamera aus den Dokumentgrenzen berechnet
// wird, bleibt die Nahansicht unveraendert gross. Im Startbild passen dagegen
// auch die obere Dokumentkante und der dynamische Partikelrahmen ins Bild.
const RESUME_WORLD_SCALE = 0.88;
// Die Projektion darf nach dem Oeffnen ohne Anschlag um ihre Hochachse
// gedreht werden. Die Werte steuern Empfindlichkeit und Auslauf.
const RESUME_ROTATION_SPEED = 0.0105;
const RESUME_ROTATION_DAMPING = 0.055;

const MODEL_URL = new URL(
  '../../Elemente/Sockel/Sockel_V2_web.glb',
  import.meta.url,
).href;

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();
const _matrix = new THREE.Matrix4();

function makeBase(accent = LIGHT_PALETTE.fiberBlue) {
  const g = new THREE.Group();

  // Platzhalter, bis Sockel_V2 einmalig geladen und geklont wurde.
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 3.3, 0.62, 6, 1),
    new THREE.MeshStandardMaterial({
      color: 0x1c2a37, roughness: 0.5, metalness: 0.9,
      emissive: lightColor('base'), emissiveIntensity: 0.42,
    })
  );
  body.position.y = BASE_Y;
  body.rotation.y = Math.PI / 6;
  g.add(body);

  // Bewusst ueberhelle Akzentfarbe: mit additivem Blending zieht der Bloom
  // die Kanten ins Grelle, ohne dass die Linienstaerke waechst.
  const lineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(accent).multiplyScalar(1.6),
    transparent: true, opacity: 0.42,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });

  for (const [r, y] of [[3.7, BASE_Y - 0.34], [3.05, BASE_Y + 0.34], [2.2, BASE_Y + 0.36]]) {
    const pts = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }

  // Streben, die zur Platte hinaufweisen
  const strut = [];
  for (const sx of [-1, 1]) {
    strut.push(
      new THREE.Vector3(sx * 2.2, BASE_Y + 0.36, 0), new THREE.Vector3(sx * 3.4, BASE_Y + 0.9, 0),
      new THREE.Vector3(sx * 3.4, BASE_Y + 0.9, 0),  new THREE.Vector3(sx * 3.4, BASE_Y + 0.35, 0),
      new THREE.Vector3(sx * 3.7, BASE_Y - 0.34, 0), new THREE.Vector3(sx * 3.7, BASE_Y - 0.9, 0)
    );
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(strut), lineMat));

  return g;
}

function makeAccentRing(accent) {
  const points = [];
  for (let index = 0; index <= 96; index++) {
    const angle = index / 96 * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * RING_RADIUS, 0, Math.sin(angle) * RING_RADIUS));
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: new THREE.Color(accent).multiplyScalar(1.7),
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
}

/**
 * Ringduese: bunte Partikel steigen ausschliesslich aus dem weissen Ring der
 * Sockeloberflaeche auf. Der Aufstieg folgt einem Duesenprofil — sehr schnell
 * am Austritt, danach ausrollend und sprudelnd aufgefaechert.
 */
function makeRingJet(time, { originY = BASE_TOP, radius = RING_RADIUS, height = JET_HEIGHT } = {}) {
  const count = 3400;
  const positions = new Float32Array(count * 3);
  const angles = new Float32Array(count);
  const seeds = new Float32Array(count);
  const speeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const hues = new Float32Array(count);

  // Jedes Attribut zieht aus einem eigenen Hash. Gekoppelte Folgen wie
  // index * goldener Schnitt wuerden sichtbare Gittermuster im Strahl
  // erzeugen, weil Winkel, Phase und Tempo dann korrelieren.
  const hash = (n) => {
    const value = Math.sin(n) * 43758.5453123;
    return value - Math.floor(value);
  };

  for (let index = 0; index < count; index += 1) {
    const angle = hash(index * 1.13 + 0.7) * Math.PI * 2;
    angles[index] = angle;
    seeds[index] = hash(index * 2.31 + 4.2);
    // Duesenabgas: hohe, breit gestreute Austrittsgeschwindigkeit.
    speeds[index] = 0.9 + hash(index * 3.77 + 9.1) * 1.5;
    const sizeSeed = hash(index * 5.11 + 13.3);
    sizes[index] = 0.34 + sizeSeed * sizeSeed * 1.35;
    phases[index] = hash(index * 7.93 + 21.7);
    hues[index] = hash(index * 11.37 + 31.4);
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 0;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aHue', new THREE.BufferAttribute(hues, 1));

  const uniforms = {
    uTime: time,
    uOriginY: { value: originY },
    uRadius: { value: radius },
    uHeight: { value: height },
    uHeightScale: { value: 1 },
    uSpread: { value: JET_SPREAD },
    uHover: { value: 0 },
    uCompact: { value: 0 },
    uReveal: { value: 1 },
    uPixelRatio: { value: 1 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAngle, aSeed, aSpeed, aSize, aPhase, aHue;
      uniform float uTime, uOriginY, uRadius, uHeight, uHeightScale, uSpread;
      uniform float uReveal, uPixelRatio, uHover;
      varying float vT, vHue, vSeed, vSpark;
      void main() {
        float t = fract(aPhase + uTime * aSpeed * 0.9);
        vT = t;
        vHue = aHue;
        vSeed = aSeed;

        // Duesenprofil: harter Schub am Austritt, danach bremst das Abgas ab.
        float rise = 1.0 - pow(1.0 - t, 2.1);

        // Sprudeln: drei ueberlagerte Wirbel unterschiedlicher Frequenz.
        float churn = sin(uTime * 3.1 + aSeed * 61.0 + t * 23.0)
                    + sin(uTime * 1.9 - aSeed * 37.0 + t * 13.0) * 0.55
                    + sin(uTime * 5.3 + aSeed * 97.0 + t * 41.0) * 0.3;

        // Der Strahl tritt eng am weissen Ring aus und faechert nach oben
        // kegelfoermig auf, wie eine sich entspannende Abgasfahne.
        float swirl = aAngle + t * (0.5 + (aSeed - 0.5) * 1.1);
        float r = uRadius * (1.0 - 0.05 * t)
                + (aSeed - 0.5) * 0.055
                + churn * 0.018 * (0.25 + t * 1.6)
                + t * t * uSpread;

        vec3 p;
        p.x = cos(swirl) * r;
        p.z = sin(swirl) * r;
        p.y = uOriginY + rise * uHeight * uHeightScale + churn * 0.025;

        // Stetiges Verwehen statt harter Kante: die Fahne loest sich oben auf.
        vSpark = smoothstep(0.0, 0.04, t) * pow(1.0 - t, 1.7);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        // Perspektivisch korrekte Punktgroesse: der Strahl wird beim
        // Heranfahren groesser, statt in einer festen Groesse zu kleben.
        gl_PointSize = aSize * (0.45 + t * 1.75) * (1.0 + uHover * 0.3)
          * uPixelRatio * (24.5 / max(9.0, -mv.z)) * uReveal;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uHover, uCompact, uReveal;
      varying float vT, vHue, vSeed, vSpark;
      vec3 hue2rgb(float h) {
        return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      }
      void main() {
        // Senkrecht gestauchte Punktform: aus dem runden Sprite wird ein
        // Bewegungsstrich, wie bei einem sehr schnellen Abgasstrahl.
        vec2 point = gl_PointCoord - 0.5;
        point.y *= mix(0.46, 0.15, vT);
        float d = length(point);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);

        // Am Austritt weissglueheend, mit der Hoehe saettigt sich die Farbe.
        vec3 tone = hue2rgb(fract(vHue + vT * 0.18));
        vec3 color = mix(vec3(1.0, 0.97, 0.92), tone, smoothstep(0.0, 0.22, vT));
        color = mix(color, tone * 1.3, smoothstep(0.3, 0.85, vT));

        float alpha = core * vSpark * (0.26 + uHover * 0.12)
          * uReveal * mix(1.0, 0.6, uCompact);
        if (alpha < 0.005) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const group = new THREE.Group();
  group.userData.kind = 'ring-jet';
  group.add(new THREE.Points(geometry, material));

  let revealTarget = 1;
  return {
    group,
    uniforms,
    setOrigin(y) { uniforms.uOriginY.value = y; },
    setReveal(value, immediate = false) {
      revealTarget = value;
      if (immediate) uniforms.uReveal.value = value;
    },
    setPixelRatio(value) { uniforms.uPixelRatio.value = value; },
    update(delta) {
      const response = 1 - Math.pow(0.01, Math.min(delta, 0.1));
      uniforms.uReveal.value += (revealTarget - uniforms.uReveal.value) * response;
    },
  };
}

/**
 * Partikelrahmen des Lebenslaufs: ausschliesslich Duesenpartikel, die
 * laengs der vier Kanten des Dokumentfensters entlangfliessen. Keine
 * geschlossene geometrische Umrandung, kein Sockelbegleitlicht — nur
 * der Strahl, der am Rand entlangwandert.
 */
function makeResumeFrame(time, { reduced = false, idleOpacity = 0 } = {}) {
  const count = 820;
  const offsets = new Float32Array(count);
  const speeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const hues = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    // Gleichmaessige Verteilung auf dem Umfang, damit keine Kante duenn bleibt.
    offsets[index] = (index / count + (Math.sin(index * 12.9898) * 0.5 + 0.5) * 0.3) % 1;
    speeds[index] = 0.45 + ((Math.sin(index * 7.13) * 0.5 + 0.5)) * 0.75;
    sizes[index] = 0.5 + ((Math.sin(index * 3.77) * 0.5 + 0.5)) * 1.4;
    seeds[index] = (Math.sin(index * 5.123) * 43758.5453) % 1;
    seeds[index] = seeds[index] - Math.floor(seeds[index]);
    // Eigener Hash fuer den Farbton, damit Farbe und Tempo nicht korrelieren
    // und derselbe Regenbogen entsteht wie in den Duesenstrahlen.
    hues[index] = (Math.sin(index * 11.37 + 31.4) * 43758.5453123) % 1;
    hues[index] = hues[index] - Math.floor(hues[index]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aHue', new THREE.BufferAttribute(hues, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 24);

  const uniforms = {
    uTime: time,
    uOpacity: { value: 0 },
    uReduced: { value: reduced ? 1 : 0 },
    uHalfWidth: { value: DOC_MAX_WIDTH * 0.5 },
    uHalfHeight: { value: 1.6 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aOffset, aSpeed, aSize, aSeed, aHue;
      uniform float uTime, uReduced, uHalfWidth, uHalfHeight;
      varying float vSeed, vSpark, vHue;
      void main() {
        float motion = uReduced > 0.5 ? 0.0 : 1.0;
        // Betont traeges Fliessen: der Rahmen wandert, ohne zu hetzen.
        float t = fract(aOffset + uTime * aSpeed * 0.018 * motion);

        float w = uHalfWidth;
        float h = uHalfHeight;
        // Umfang: unten(2w), rechts(2h), oben(2w), links(2h) = 4*(w+h).
        float total = 4.0 * (w + h);
        float dist = t * total;
        vec3 p;
        if (dist < 2.0 * w) {
          p = vec3(-w + dist, -h, 0.0);
        } else if (dist < 2.0 * w + 2.0 * h) {
          p = vec3(w, -h + (dist - 2.0 * w), 0.0);
        } else if (dist < 4.0 * w + 2.0 * h) {
          p = vec3(w - (dist - 2.0 * w - 2.0 * h), h, 0.0);
        } else {
          p = vec3(-w, h - (dist - 4.0 * w - 2.0 * h), 0.0);
        }

        // Feines Flimmern, ohne die Bahn zu verlassen.
        p += vec3(
          sin(uTime * 0.9 + aSeed * 30.0) * 0.012,
          cos(uTime * 0.7 + aSeed * 25.0) * 0.012,
          0.0
        );

        // Helle Schwaden wandern um den Rahmen, statt zu einem Ende hin
        // auszubrennen: jede Kante bleibt gleich stark besetzt.
        float wave = 0.5 + 0.5 * sin(t * 87.9646 - uTime * 0.6 * motion);
        vSpark = pow(wave, 2.0);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * (1.0 + 0.5 * vSpark)
          * (24.0 / max(9.0, -mv.z));
        gl_Position = projectionMatrix * mv;
        vSeed = aSeed;
        vHue = aHue;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uOpacity, uTime;
      varying float vSeed, vSpark, vHue;
      vec3 hue2rgb(float h) {
        return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      }
      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float core = smoothstep(0.5, 0.04, length(point));
        // Dieselbe Regenbogenpalette wie in den Duesenstrahlen; der Farbton
        // wandert nur ganz langsam weiter.
        vec3 tone = hue2rgb(fract(vHue + uTime * 0.01 + vSeed * 0.08));
        vec3 color = mix(tone * 1.3, vec3(1.0, 0.97, 0.92), vSpark * 0.3);
        float alpha = core * uOpacity * (0.4 + 0.45 * vSpark);
        if (alpha < 0.008) discard;
        gl_FragColor = vec4(color * 1.25, alpha);
      }
    `,
  });
  const group = new THREE.Group();
  group.userData.kind = 'resume-frame';
  group.add(new THREE.Points(geometry, material));
  group.visible = false;

  const idle = THREE.MathUtils.clamp(idleOpacity, 0, 1);
  let opacityTarget = idle;
  let originY = 0;
  let open = false;
  let hidden = false;

  function applyTarget(immediate) {
    opacityTarget = hidden ? 0 : (open ? 1 : idle);
    if (immediate || reduced) uniforms.uOpacity.value = opacityTarget;
    if (opacityTarget > 0) group.visible = true;
    else if (immediate || reduced) group.visible = false;
  }

  return {
    group,
    uniforms,
    setOrigin(y) { originY = y; },
    setWindow(width, height) {
      // Die obere Rahmenkante bleibt exakt unveraendert. Die untere
      // Partikelbahn wird auf die sichtbare blaue Abschlusskante des
      // Dokuments gelegt, sodass beide Raender deckungsgleich erscheinen.
      const bottomOverlap = height * 0.106;
      const frameHeight = height - bottomOverlap;
      uniforms.uHalfWidth.value = width * 0.5;
      uniforms.uHalfHeight.value = frameHeight * 0.5;
      group.position.set(
        0,
        originY + DOC_LIFT + bottomOverlap + frameHeight * 0.5,
        DOC_FRONT,
      );
      if (idle > 0 && !hidden) group.visible = true;
    },
    setOpen(value, immediate = false) {
      open = Boolean(value);
      applyTarget(immediate);
    },
    /** Solange die Lesefassung steht, tritt der Rahmen ganz ab. */
    setHidden(value) {
      hidden = Boolean(value);
      applyTarget(false);
    },
    setCompact(value) {
      uniforms.uReduced.value = reduced || value ? 1 : 0;
    },
    update(delta) {
      if (!group.visible) return;
      const response = reduced ? 1 : 1 - Math.pow(0.01, Math.min(delta, 0.1));
      uniforms.uOpacity.value += (opacityTarget - uniforms.uOpacity.value) * response;
      if (opacityTarget === 0 && uniforms.uOpacity.value < 0.02) group.visible = false;
    },
  };
}

/**
 * Ankuendigungsschild der beiden noch unfertigen Bereiche.
 *
 * Der Schriftzug entsteht einmalig auf einem Canvas — dieselbe schmale
 * Versalienschrift wie in Kopfzeile und Fusszeile, additiv geblendet, damit
 * der Bloom ihn wie die uebrigen Lichtelemente aufnimmt.
 */
function makeComingSoon(accent, maxAnisotropy = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  function draw() {
    if (!context) return;
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);

    // Additives Blenden liest Schwarz als Nichts: der Grund bleibt leer.
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    if ('letterSpacing' in context) context.letterSpacing = '0.34em';

    const tint = new THREE.Color(accent).getStyle();
    context.shadowColor = tint;
    context.shadowBlur = 34;
    context.font = '600 92px "Barlow Condensed", "DejaVu Sans Condensed", sans-serif';
    context.fillStyle = '#dceeff';
    // Der Sperrsatz schiebt den Text nach rechts; die halbe Sperre gleicht aus.
    context.fillText('COMING SOON', width * 0.5 - 15, height * 0.45);

    // Ein beidseitig auslaufender Strich traegt die Zeile.
    context.shadowBlur = 0;
    const rule = context.createLinearGradient(0, 0, width, 0);
    rule.addColorStop(0, 'rgba(120,191,255,0)');
    rule.addColorStop(0.5, 'rgba(201,232,255,0.55)');
    rule.addColorStop(1, 'rgba(120,191,255,0)');
    context.fillStyle = rule;
    context.fillRect(width * 0.14, height * 0.66, width * 0.72, 2);

    texture.needsUpdate = true;
  }

  draw();
  // Die Schriften kommen aus dem Netz; ohne zweiten Anlauf bliebe der
  // Schriftzug in der Ersatzschrift stehen.
  document.fonts?.ready.then(draw).catch(() => {});

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    opacity: 0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), material);
  mesh.name = 'coming-soon';
  mesh.renderOrder = 2;

  const group = new THREE.Group();
  group.userData.kind = 'coming-soon';
  group.add(mesh);

  let reveal = 1;
  let revealTarget = 1;
  return {
    group,
    setOrigin(y) { group.position.y = y + TEASER_Y; },
    setReveal(value, immediate = false) {
      revealTarget = value;
      if (immediate) reveal = value;
    },
    update(elapsed, delta, hover) {
      reveal += (revealTarget - reveal) * (1 - Math.pow(0.01, Math.min(delta, 0.1)));
      const pulse = 0.7 + 0.1 * Math.sin(elapsed * 0.9);
      material.opacity = (pulse + hover * 0.28) * reveal;
      group.visible = material.opacity > 0.01;
      mesh.position.y = Math.sin(elapsed * 0.5) * 0.03;
    },
  };
}

function disposeObject(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
      for (const uniform of Object.values(material.uniforms ?? {})) {
        if (uniform?.value?.isTexture) textures.add(uniform.value);
      }
    }
  });

  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

/**
 * Weiche Ueberblendung zwischen Platzhalter und geladenem Sockel.
 * `needsUpdate` faellt nur an, wenn sich der Materialzustand wirklich
 * aendert — sonst leitet three jedes Bild eine Programmpruefung ein.
 */
function setObjectFade(root, factor) {
  root.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      if (!material.userData.fadeState) {
        material.userData.fadeState = {
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        };
      }
      const state = material.userData.fadeState;
      const transparent = state.transparent || factor < 0.999;
      material.opacity = state.opacity * factor;
      material.depthWrite = factor >= 0.999 ? state.depthWrite : false;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
    }
  });
}

/** Trefferkoerper: Sockelmasse plus genau die Hoehe des Partikelstrahls. */
function setHitBody(card, modelBox) {
  card.baseBounds.copy(modelBox);
  card.hitBounds.copy(modelBox);
  // Die dauerhaft sichtbare Lebenslauf-Vorschau soll selbst anklickbar sein,
  // nicht nur der Stein darunter.
  const headroom = card.key === RESUME_KEY
    ? Math.max(
        HIT_HEADROOM[card.key],
        card.windowHeight * RESUME_IDLE_SCALE + DOC_LIFT,
      )
    : HIT_HEADROOM[card.key];
  card.hitBounds.max.y = Math.max(card.hitBounds.max.y, card.surfaceY + headroom);
  card.hitBounds.getSize(_size);
  card.hitBounds.getCenter(_center);
  card.hit.geometry.dispose();
  card.hit.geometry = new THREE.BoxGeometry(
    Math.max(_size.x, 0.5),
    Math.max(_size.y, 0.5),
    Math.max(_size.z, 0.5),
  );
  card.hit.position.copy(_center);
}

/**
 * Setzt das Dokumentfenster ueber die Sockeloberkante. Die Breite bleibt
 * hoechstens so breit wie der Sockel; die Hoehe reicht bis zu einer ganzen
 * Seite und folgt sonst dem Bildschirmfenster, das die Buehne vorgibt.
 */
function updateResumeWindow(card, notify = true) {
  const projection = card.resumeProjection;
  const pageAspect = projection?.pageAspect;
  if (!projection?.ready || !pageAspect || card.disposed) return;

  card.baseBounds.getSize(_size);
  const fullWidth = Math.min(
    DOC_MAX_WIDTH,
    Math.max(_size.x, _size.z, 1),
  );
  // Die Unterkante bleibt an derselben Stelle. Nur die Blattabmessungen
  // werden verkleinert; dadurch wandern obere Dokument- und Rahmenkante
  // sicher nach unten, ohne Sockel, Kamera oder Interaktionen zu veraendern.
  const width = fullWidth * RESUME_WORLD_SCALE;

  // Eine Seite behaelt immer ihr echtes Seitenverhaeltnis.
  // Bildschirmformat und Lesefassung duerfen die 3D-Projektion nicht stauchen.
  const height = width / pageAspect;
  const bottom = card.surfaceY + DOC_LIFT;

  card.windowWidth = width;
  card.windowHeight = height;

  projection.setWindow(width, height);

  card.documentBounds.min.set(
    -width * 0.5,
    bottom,
    DOC_FRONT - 0.05,
  );
  card.documentBounds.max.set(
    width * 0.5,
    bottom + height,
    DOC_FRONT + 0.05,
  );

  applyResumeScale(card);
  setHitBody(card, card.baseBounds);

  if (notify) card.notifyBoundsChange(card.key);
}

/** Das Blatt aendert beim Oeffnen weder Groesse noch Seitenverhaeltnis. */
function applyResumeScale(card) {
  const projection = card.resumeProjection;
  if (!projection?.ready || !card.windowWidth) return;

  const width = card.windowWidth;
  const height = card.windowHeight;
  const bottom = card.surfaceY + DOC_LIFT;

  projection.setWindow(width, height);
  projection.mesh.scale.set(width, height, 1);
  projection.mesh.position.set(
    0,
    bottom + height * 0.5,
    DOC_FRONT,
  );
  card.resumeFrame?.setWindow(width, height);
}

function sharpenModel(model, maxAnisotropy) {
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = false;
    object.receiveShadow = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      for (const [key, texture] of Object.entries(material)) {
        if (!texture?.isTexture) continue;
        texture.anisotropy = maxAnisotropy;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        if (key === 'map' || key === 'emissiveMap') texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
      }
      if (material.color?.isColor) material.color.lerp(lightColor('fiber'), 0.1);
      if ('roughness' in material) material.roughness = THREE.MathUtils.clamp(material.roughness, 0.38, 0.62);
      if ('metalness' in material) material.metalness = THREE.MathUtils.clamp(material.metalness, 0.16, 0.55);
      if (material.emissive?.isColor) material.emissive.lerp(lightColor('fiberBlue'), 0.28);
      if ('emissiveIntensity' in material) {
        material.emissiveIntensity = THREE.MathUtils.clamp(material.emissiveIntensity || 0.34, 0.34, 0.5);
      }
      if ('envMapIntensity' in material) material.envMapIntensity = 0.7;
      if ('normalMap' in material) material.normalMap = null;
      material.side = THREE.FrontSide;
      material.needsUpdate = true;
    }
  });
}

function createSharedRenderGeometry(sourceGeometry) {
  const geometry = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'tangent']) {
    const attribute = sourceGeometry.getAttribute(name);
    if (attribute) geometry.setAttribute(name, attribute);
  }
  if (sourceGeometry.index) geometry.setIndex(sourceGeometry.index);
  geometry.boundingBox = sourceGeometry.boundingBox?.clone() ?? null;
  geometry.boundingSphere = sourceGeometry.boundingSphere?.clone() ?? null;
  return geometry;
}

function createStaticSource(source) {
  const staticSource = new THREE.Group();
  staticSource.name = 'Sockel_V2_Source';
  const materials = new Map();
  source.updateWorldMatrix(true, true);
  const inverseRoot = source.matrixWorld.clone().invert();
  source.traverse((object) => {
    if (!object.isMesh) return;
    // Sockel_V2 ist zwar als SkinnedMesh exportiert, besitzt aber keine
    // Animation. Für drei ruhige Sockel wird die Bind-Pose als normales Mesh
    // verwendet; so bleiben Geometrie, Material und Texturen wirklich geteilt.
    if (!materials.has(object.material)) {
      materials.set(object.material, new THREE.MeshStandardMaterial({
        color: object.material.color,
        map: object.material.map,
        emissive: object.material.emissive,
        emissiveMap: object.material.emissiveMap,
        emissiveIntensity: object.material.emissiveIntensity,
        roughness: object.material.roughness,
        metalness: object.material.metalness,
      }));
    }
    const mesh = new THREE.Mesh(
      createSharedRenderGeometry(object.geometry),
      materials.get(object.material),
    );
    mesh.name = object.name;
    _matrix.copy(inverseRoot).multiply(object.matrixWorld);
    _matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
    mesh.renderOrder = object.renderOrder;
    mesh.frustumCulled = object.frustumCulled;
    staticSource.add(mesh);
  });
  return staticSource;
}

function loadLeanGLB(url, onLoad, onError) {
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_GLTF_CONFIG);
  new GLTFLoader().setDRACOLoader(draco).load(
    url,
    (gltf) => {
      draco.dispose();
      onLoad(gltf);
    },
    undefined,
    (error) => {
      draco.dispose();
      onError(error);
    },
  );
}

function loadSharedBases(cards, maxAnisotropy, shouldFade, onSettled) {
  loadLeanGLB(
    MODEL_URL,
    (gltf) => {
      const source = createStaticSource(gltf.scene);
      if (cards.every((card) => card.disposed)) {
        disposeObject(source);
        onSettled?.('disposed');
        return;
      }

      _box.setFromObject(source).getSize(_size);
      const horizontalDiameter = Math.max(_size.x, _size.z);
      if (!Number.isFinite(horizontalDiameter) || horizontalDiameter <= 0) {
        console.warn('Sockel_V2 hat keine gültigen Modellabmessungen; Fallbacks bleiben sichtbar.');
        disposeObject(source);
        onSettled?.('fallback');
        return;
      }

      sharpenModel(source, maxAnisotropy);
      source.scale.multiplyScalar(BASE_DIAMETER / horizontalDiameter);
      source.updateMatrixWorld(true);

      _box.setFromObject(source).getCenter(_center);
      source.position.x -= _center.x;
      source.position.y += BASE_BOTTOM - _box.min.y;
      source.position.z -= _center.z;
      source.updateMatrixWorld(true);

      const fadeIn = shouldFade();
      for (const card of cards) {
        if (card.disposed) continue;
        const model = source.clone(true);
        model.name = `Sockel_V2_${card.key}`;
        card.holder.add(model);
        if (fadeIn) {
          card.pendingFallback = card.base;
          card.modelReveal = 0;
          setObjectFade(model, 0);
        } else {
          card.holder.remove(card.base);
          disposeObject(card.base);
        }
        card.base = model;

        card.holder.updateWorldMatrix(true, false);
        _matrix.copy(card.holder.matrixWorld).invert();
        const modelBox = new THREE.Box3().setFromObject(model).applyMatrix4(_matrix);
        const modelHeight = modelBox.max.y - modelBox.min.y;
        card.surfaceY = modelBox.max.y - Math.min(0.12, modelHeight * 0.08);
        card.accentRing.position.y = card.surfaceY + 0.035;
        card.rimLight.position.y = card.surfaceY + 1.5;
        card.ringJet?.setOrigin(card.surfaceY + 0.04);
        card.resumeFrame?.setOrigin(card.surfaceY);
        card.comingSoon?.setOrigin(card.surfaceY);
        setHitBody(card, modelBox);
        updateResumeWindow(card, false);
        card.notifyBoundsChange(card.key);
      }
      onSettled?.('loaded');
    },
    (error) => {
      if (cards.some((card) => !card.disposed)) {
        console.warn('Sockel_V2 konnte nicht geladen werden; Fallbacks bleiben sichtbar:', error);
      }
      onSettled?.('fallback');
    },
  );
}

export const CARD_DEFS = [
  { key: 'abschluss',  accent: LIGHT_PALETTE.amber, index: 'I',   title: 'ABSCHLUSSPROJEKT', subtitle: 'Server, UEM, Clients, Migration' },
  { key: 'projekte',   accent: LIGHT_PALETTE.violet, index: 'II',  title: 'IT-PROJEKTE',      subtitle: 'Eigenbau, Automatisierung, Experiment' },
  { key: 'lebenslauf', accent: LIGHT_PALETTE.signal, index: 'III', title: 'LEBENSLAUF',       subtitle: 'Werdegang, Fähigkeiten, Kontakt' },
];

export function createCards({ renderer, reduced = false } = {}) {
  const group = new THREE.Group();
  const time = { value: 0 };
  const maxAnisotropy = renderer?.capabilities.getMaxAnisotropy?.() || 1;
  const cards = [];
  const pickables = [];
  const documentPickables = [];
  let boundsListener = null;
  let layoutScale = 1;
  let modelRevealReleased = false;
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  for (const def of CARD_DEFS) {
    const isResume = def.key === RESUME_KEY;
    const holder = new THREE.Group();
    holder.name = `card-${def.key}`;
    // Die endgueltige Position setzt setLayout, sobald das Bildformat bekannt
    // ist. Feste Ankerobjekte in der Szene waeren nur Ballast.
    holder.position.x = (cards.length - 1) * 7.8;

    const base = makeBase(def.accent);
    // Die Projektion meldet sich erst nach dem Laden zurueck; bis dahin
    // existiert der Kartenzustand noch nicht.
    let card = null;
    // Jeder Sockel traegt denselben Partikelstrahl. Er tritt ausschliesslich
    // aus dem weissen Ring der Oberflaeche aus.
    const ringJet = makeRingJet(time, { originY: BASE_TOP + 0.04 });
    // Die beiden noch unfertigen Bereiche kuendigen sich selbst an.
    const comingSoon = isResume ? null : makeComingSoon(def.accent, maxAnisotropy);
    const resumeFrame = isResume
      ? makeResumeFrame(time, { reduced, idleOpacity: 0.5 })
      : null;
    const resumeProjection = isResume
      ? createResumeProjection({
          renderer,
          reduced,
          idleOpacity: RESUME_IDLE_OPACITY,
          onReady() { if (card) updateResumeWindow(card); },
          onError(error) {
            console.warn('Die Lebenslauf-Projektion konnte nicht aufgebaut werden:', error);
          },
        })
      : null;
    resumeFrame?.setOrigin(BASE_TOP);
    comingSoon?.setOrigin(BASE_TOP);

    const accentRing = makeAccentRing(def.accent);
    accentRing.position.y = BASE_TOP + 0.035;
    const rimLight = new THREE.PointLight(LIGHT_PALETTE.fiber, 24, 18, 2);
    rimLight.position.set(0, BASE_TOP + 1.5, 1.4);

    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(BASE_DIAMETER, BASE_TOP - BASE_BOTTOM, BASE_DIAMETER),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.position.y = (BASE_TOP + BASE_BOTTOM) * 0.5;
    hit.userData.key = def.key;
    pickables.push(hit);

    holder.add(base, accentRing, rimLight, hit);
    if (ringJet) holder.add(ringJet.group);
    if (comingSoon) holder.add(comingSoon.group);
    if (resumeFrame) holder.add(resumeFrame.group);
    if (resumeProjection) {
      holder.add(resumeProjection.mesh);
      documentPickables.push(resumeProjection.mesh);
    }
    group.add(holder);

    card = {
      key: def.key,
      holder,
      base,
      ringJet,
      comingSoon,
      resumeProjection,
      resumeFrame,
      accentRing,
      rimLight,
      hit,
      hover: 0,
      target: 0,
      // Sockelmasse, Trefferkoerper und Dokumentfenster bleiben getrennt:
      // das eine rahmt die Kamera, das andere faengt Klicks.
      baseBounds: new THREE.Box3(
        new THREE.Vector3(-BASE_DIAMETER / 2, BASE_BOTTOM, -BASE_DIAMETER / 2),
        new THREE.Vector3(BASE_DIAMETER / 2, BASE_TOP, BASE_DIAMETER / 2),
      ),
      hitBounds: new THREE.Box3(),
      documentBounds: new THREE.Box3(),
      surfaceY: BASE_TOP,
      windowWidth: 0,
      windowHeight: 3.2,
      // Seitenverhaeltnis des Fensters auf dem Schirm, von der Buehne gesetzt.
      windowAspect: 0,
      // Die physische Seitengroesse bleibt beim Oeffnen unveraendert.
      docScale: 1,
      resumeOpen: false,
      notifyBoundsChange(key) { boundsListener?.(key); },
      rotationOffset: 0,
      rotationVelocity: 0,
      rotationDragging: false,
      layoutIndex: cards.length,
      layoutY: HOME_ROW_DROP,
      displayScale: 1,
      layoutInitialized: false,
      pendingFallback: null,
      modelReveal: 1,
      disposed: false,
    };
    setHitBody(card, card.baseBounds);
    cards.push(card);
  }

  const resumeCard = cards.find((card) => card.key === RESUME_KEY) ?? null;

  loadSharedBases(
    cards,
    maxAnisotropy,
    () => modelRevealReleased,
    (status) => resolveReady(status),
  );

  return {
    group,
    pickables,
    documentPickables,
    ready,

    releaseModelReveal() {
      modelRevealReleased = true;
    },

    setPixelRatio(pr) {
      for (const card of cards) {
        card.ringJet?.setPixelRatio(pr);
      }
    },

    /**
     * Seitenverhaeltnis (Breite/Hoehe) des Dokumentfensters auf dem Schirm.
     * Die Buehne kennt die verfuegbare Flaeche, die Karten die Geometrie.
     */
    setDocumentAspect(ratio) {
      if (!resumeCard || !(ratio > 0)) return;
      resumeCard.windowAspect = ratio;
      // Das Bildschirmformat wird nur fuer Kamera und HTML-Lesefassung
      // gespeichert. Die 3D-Seite bleibt unverzerrt.
    },

    /* ---------- Uebergang zur Lesefassung ---------- */

    /** Projektion und ihr Partikelrahmen treten ab, ohne zu verschwinden. */
    setProjectionHidden(value) {
      resumeCard?.resumeProjection?.setHidden(value);
      resumeCard?.resumeFrame?.setHidden(value);
    },

    /* ---------- Dokumentfenster ---------- */

    /** Welt-Box des Dokumentfensters, leer solange die Projektion fehlt. */
    documentBounds(out = new THREE.Box3()) {
      if (!resumeCard || resumeCard.documentBounds.isEmpty()) return out.makeEmpty();
      resumeCard.holder.updateWorldMatrix(true, false);
      return out.copy(resumeCard.documentBounds).applyMatrix4(resumeCard.holder.matrixWorld);
    },

    /** Oberkante des Sockels in Weltkoordinaten. */
    surfaceHeight(key) {
      const card = cards.find((item) => item.key === key);
      if (!card) return 0;
      card.holder.updateWorldMatrix(true, false);
      return _center.set(0, card.surfaceY, 0).applyMatrix4(card.holder.matrixWorld).y;
    },

    /** Blaettern in Fensterhoehen. */
    scrollDocument(pages) {
      resumeCard?.resumeProjection?.scrollByPages(pages);
    },

    setDocumentScroll(value, immediate = false) {
      resumeCard?.resumeProjection?.setScroll(value, immediate);
    },

    /**
     * Abschnittssprung: Hash-Unterbereich auf die Seite abbilden, die den
     * Abschnitt traegt. Ein halbes Blatt waere kein Zielbild.
     */
    setDocumentSection(section, immediate = false) {
      const projection = resumeCard?.resumeProjection;
      if (!projection) return;
      const anchor = CV_ANCHORS[section] ?? 0;
      // Ein Fenster ist genau eine Seite hoch: der Sprung faengt am Kopf der
      // Seite an, die den Abschnitt traegt, statt halb dazwischen.
      const page = Math.min(CV_PAGE_COUNT - 1, Math.floor(anchor * CV_PAGE_COUNT));
      projection.scrollToFraction(page / CV_PAGE_COUNT, immediate);
    },

    get documentScroll() { return resumeCard?.resumeProjection?.scroll ?? 0; },
    get documentRotation() {
      return resumeCard?.resumeProjection?.mesh.rotation.y ?? 0;
    },

    /* ---------- Drehen ---------- */

    beginResumeRotation() {
      if (!resumeCard) return;
      resumeCard.rotationDragging = true;
      resumeCard.rotationVelocity = 0;
    },

    rotateResume(deltaX) {
      if (!resumeCard) return;
      const delta = THREE.MathUtils.clamp(
        deltaX * RESUME_ROTATION_SPEED,
        -0.18,
        0.18,
      );
      resumeCard.rotationOffset = THREE.MathUtils.euclideanModulo(
        resumeCard.rotationOffset + delta + Math.PI,
        Math.PI * 2,
      ) - Math.PI;
      resumeCard.rotationVelocity = delta;
    },

    endResumeRotation() {
      if (resumeCard) resumeCard.rotationDragging = false;
    },

    /** Genau eine Karte im Fokus, oder keine. */
    setHover(key) {
      for (const card of cards) card.target = card.key === key ? 1 : 0;
    },

    setExplored(explored) {
      const keys = explored instanceof Set ? explored : new Set(explored || []);
      // Besuchte Bereiche treten optisch zurueck: ihr Ring leuchtet matter.
      for (const card of cards) {
        card.accentRing.material.opacity = keys.has(card.key) ? 0.34 : 0.58;
      }
    },

    setHologramReveal(value, immediate = false) {
      for (const card of cards) {
        card.ringJet?.setReveal(value, immediate);
        card.comingSoon?.setReveal(value, immediate);
      }
    },

    setLayout({ spacing = 7.8, scale = 1, compact = false, stagger = 0 } = {}) {
      layoutScale = scale;

      for (const card of cards) {
        card.holder.position.x = (card.layoutIndex - 1) * spacing;

        card.layoutY = HOME_ROW_DROP
          + (card.layoutIndex === 1 ? 0 : -stagger);

        // Die Grundskalierung bleibt beim Anflug stabil.
        // Die Kamera uebernimmt das Heranfahren.
        if (!card.layoutInitialized || reduced) {
          card.displayScale = layoutScale;
          card.holder.scale.setScalar(card.displayScale);
          card.layoutInitialized = true;
        }

        card.resumeFrame?.setCompact(compact);
        card.rimLight.intensity = compact ? 15 : 24;

        if (card.ringJet) {
          card.ringJet.uniforms.uCompact.value =
            compact ? 1 : 0;

          card.ringJet.uniforms.uHeightScale.value =
            compact ? 1.14 : 1;
        }
      }
    },

    /** Welt-Bounding-Box des Sockels, fuer das Kamera-Framing. */
    worldBounds(key, out = new THREE.Box3()) {
      const card = cards.find((item) => item.key === key);
      if (!card) return out.makeEmpty();
      card.holder.updateWorldMatrix(true, false);
      return out.copy(card.baseBounds).applyMatrix4(card.holder.matrixWorld);
    },

    onBoundsChange(cb) { boundsListener = cb; },

    /** Im Fokus bleibt nur der gewaehlte Sockel im Kamerabild. */
    setOpened(key, _isolate = false) {
      for (const card of cards) {
        // Nachbarsockel verschwinden nicht schlagartig, sondern laufen
        // waehrend der Kamerafahrt aus dem Bild.
        card.holder.visible = true;
        card.resumeOpen =
          key === card.key
          && card.key === RESUME_KEY;

        card.resumeProjection?.setOpen(card.resumeOpen);
        card.resumeFrame?.setOpen(card.resumeOpen);

        if (card.key === RESUME_KEY && !card.resumeOpen) {
          card.resumeProjection?.setScroll(0);
        }

        if (key) card.target = 0;

        if (!card.resumeOpen) {
          card.rotationOffset = 0;
          card.rotationVelocity = 0;
        }
      }
    },

    update(elapsed, delta) {
      time.value = elapsed;
      const k = 1 - Math.pow(0.0012, Math.min(delta, 0.1));
      for (const card of cards) {
        if (card.pendingFallback) {
          const response = 1 - Math.pow(0.012, Math.min(delta, 0.1));
          card.modelReveal += (1 - card.modelReveal) * response;
          setObjectFade(card.base, card.modelReveal);
          setObjectFade(card.pendingFallback, 1 - card.modelReveal);
          if (card.modelReveal >= 0.995) {
            setObjectFade(card.base, 1);
            card.holder.remove(card.pendingFallback);
            disposeObject(card.pendingFallback);
            card.pendingFallback = null;
          }
        }
        card.hover += (card.target - card.hover) * k;
        if (card.ringJet) {
          card.ringJet.uniforms.uHover.value = card.hover;
          card.ringJet.update(delta);
        }
        card.comingSoon?.update(
          elapsed,
          delta,
          card.hover,
        );

        card.resumeFrame?.update(delta);
        card.resumeProjection?.update(delta);

        const phase = card.key.length;
        card.holder.position.y = card.layoutY
          + Math.sin(elapsed * 0.18 + phase) * 0.11
          + card.hover * 0.16;
        if (card.key === RESUME_KEY) {
          if (
            !card.rotationDragging
            && Math.abs(card.rotationVelocity) > 0.000001
          ) {
            card.rotationOffset = THREE.MathUtils.euclideanModulo(
              card.rotationOffset
                + card.rotationVelocity * Math.min(1.8, delta * 60)
                + Math.PI,
              Math.PI * 2,
            ) - Math.PI;
            card.rotationVelocity *= Math.pow(
              RESUME_ROTATION_DAMPING,
              Math.min(delta, 0.1),
            );
            if (Math.abs(card.rotationVelocity) < 0.000001) {
              card.rotationVelocity = 0;
            }
          }

          // Der Sockel bleibt ruhig. Nur Blatt und Partikelrahmen drehen sich
          // gemeinsam um die Mitte der Projektion.
          card.holder.rotation.y = card.resumeOpen
            ? 0
            : Math.sin(elapsed * 0.09 + phase) * 0.016;

          const documentYaw = card.resumeOpen
            ? card.rotationOffset
            : 0;

          if (card.resumeProjection) {
            card.resumeProjection.mesh.rotation.y = documentYaw;
          }
          if (card.resumeFrame) {
            card.resumeFrame.group.rotation.y = documentYaw;
          }
        } else {
          card.holder.rotation.y =
            Math.sin(elapsed * 0.09 + phase) * 0.022;
        }
        const baseScaleTarget = layoutScale;
        const scaleResponse = reduced
          ? 1
          : 1 - Math.pow(
              0.008,
              Math.min(delta, 0.1),
            );

        card.displayScale +=
          (
            baseScaleTarget
            - card.displayScale
          )
          * scaleResponse;

        if (
          Math.abs(
            baseScaleTarget
            - card.displayScale
          ) < 0.0005
        ) {
          card.displayScale =
            baseScaleTarget;
        }

        card.holder.scale.setScalar(
          card.displayScale
          * (1 + card.hover * 0.025)
        );
        card.holder.updateWorldMatrix(true, false);
      }
    },

    dispose() {
      for (const card of cards) {
        card.disposed = true;
        card.resumeProjection?.dispose();
      }
      disposeObject(group);
      group.clear();
      pickables.length = 0;
      documentPickables.length = 0;
      boundsListener = null;
    },
  };
}
