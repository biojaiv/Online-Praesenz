import * as THREE from 'three';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LIGHT_PALETTE, lightColor } from './palette.js';
import { createResumeProjection, getCvAnchor } from './resumeProjection.js'; // DYNAMIC_CV_LANGUAGE_GEOMETRY_V3
import { ihkProjectionSource, getIhkAnchor } from './ihkProjectionSource.js';
import { t, getLanguage, onLanguageChange } from '../i18n.js';
import { createExamplePreview } from './examplePreview.js';
import { deviceQuality } from './renderBudget.js';

/**
 * Die drei interaktiven Bereichssockel.
 *
 * Drei Blender-Quellen liefern die beschrifteten DE/EN-Sockel und die oberen
 * Abschluesse. Jede Quelle enthaelt ein eigenes Modell fuer jeden Bereich.
 * Bis zum Laden hält ein leichter prozeduraler Fallback die Navigation bereit.
 *
 * Der Lebenslauf-Sockel traegt zusaetzlich das Dokumentfenster: eine Flaeche
 * direkt ueber der Sockeloberkante, durch die der Lebenslauf laeuft.
 */

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const BASE_Y = -6.15;
// Keep the full Blender foundations above the footer, with clearance for
// the mirrored upper caps and the gentle hover movement.
const HOME_ROW_DROP = -0.8;
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
// Zusaetzliche Klickhoehe ueber der Sockeloberkante: die Projekt- und
// Lebenslaufbereiche nehmen ihr Dokument mit, private Projekte den Teaser.
const HIT_HEADROOM = { abschluss: JET_HEIGHT, projekte: 5.6, lebenslauf: JET_HEIGHT };
// Grenzen des Dokumentfensters in Welteinheiten. Das Fenster ist genau eine
// Seite hoch; die Breite folgt daraus und bleibt hoechstens so breit wie der
// Sockel.
const DOC_MAX_WIDTH = 7.35;
// Der Strahl endet an dieser Dokumentkante; seine maximale Hoehe folgt
// dem verbleibenden Abstand zur Duese, auch im kompakten Layout.
const DOC_LIFT = JET_HEIGHT - 0.13;
// Das Blatt schwebt nahezu zentrisch ueber dem Sockel — direkt ueber dem
// Partikelstrahl, nicht weit davor. Ein kleiner Z-Versatz haelt den
// vorderen Sockelrand aus dem Blick auf den Seitenfuss.
const DOC_FRONT = 0.4;
const RESUME_KEY = 'lebenslauf';
const isDocumentKey = (key) => key === RESUME_KEY || key === 'abschluss';
// Ruhehelligkeit der Lebenslauf-Vorschau, solange der Sockel nicht offen ist.
// SACRED_CARD_LAYOUT_V4_2
// The landing-page projection should be readable light, not a luminous plate.
const RESUME_IDLE_OPACITY = 1;
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

// Golden-ratio/Fibonacci layout. The middle pedestal is the symmetry axis;
// the two side pedestals share the same radius and vertical level, forming a
// shallow, deliberately constructed triad instead of three arbitrary offsets.
const LAYOUT_PHI = (1 + Math.sqrt(5)) / 2;
const LAYOUT_SIDE_FACTOR = Math.sqrt(5) / 2;
const LAYOUT_CENTER_RISE_DIVISOR = 55;
const LAYOUT_OUTER_DROP_DIVISOR = 34;

const MODEL_URLS = {
  de: new URL('../../Elemente/Sockel/Sockel_de_web.glb', import.meta.url).href,
  en: new URL('../../Elemente/Sockel/Sockel_eng_web.glb', import.meta.url).href,
  top: new URL('../../Elemente/Sockel/Sockel_oben_web.glb', import.meta.url).href,
};

const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

function makeBase(accent = LIGHT_PALETTE.fiberBlue) {
  const g = new THREE.Group();

  // Platzhalter, bis die Blender-Sockel geladen wurden.
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
  const count = 1200;
  const positions = new Float32Array(count * 3);
  const angles = new Float32Array(count);
  const seeds = new Float32Array(count);
  const speeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

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

  const uniforms = {
    uTime: time,
    uMotion: { value: reducedMotion() ? 0 : 1 },
    uOriginY: { value: originY },
    uRadius: { value: radius },
    uHeight: { value: height },
    uHeightScale: { value: 1 },
    uEndY: { value: originY + DOC_LIFT - 0.04 },
    uDocumentYaw: { value: 0 },
    uViewport: { value: new THREE.Vector2(1, 1) },
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
      attribute float aAngle, aSeed, aSpeed, aSize, aPhase;
      uniform float uTime, uOriginY, uRadius, uHeight, uHeightScale, uSpread, uEndY, uDocumentYaw;
      uniform float uReveal, uPixelRatio, uHover, uMotion;
      uniform vec2 uViewport;
      varying float vT, vSeed, vSpark, vHue;
      varying vec3 vDocumentEdge;
      void main() {
        float clock = uTime * uMotion;
        float t = fract(aPhase + clock * aSpeed * 1.1);
        vT = t;
        vSeed = aSeed;
        vHue = fract(aSeed + clock * 0.035);

        // Duesenprofil: harter Schub am Austritt, danach bremst das Abgas ab.
        float rise = 1.0 - pow(1.0 - t, 2.1);

        // Sprudeln: drei ueberlagerte Wirbel unterschiedlicher Frequenz.
        float churn = sin(clock * 3.1 + aSeed * 61.0 + t * 23.0)
                    + sin(clock * 1.9 - aSeed * 37.0 + t * 13.0) * 0.55
                    + sin(clock * 5.3 + aSeed * 97.0 + t * 41.0) * 0.3;

        // Der Strahl tritt eng am weissen Ring aus und faechert nach oben
        // kegelfoermig auf, wie eine sich entspannende Abgasfahne.
        float swirl = aAngle + t * (1.2 + (aSeed - 0.5) * 1.4) + sin(clock * 1.4 + aSeed * 7.0) * .08;
        float r = uRadius * (1.0 - 0.05 * t)
                + (aSeed - 0.5) * 0.055
                + churn * 0.018 * (0.25 + t * 1.6)
                + t * t * uSpread;

        vec3 p;
        p.x = cos(swirl) * r;
        p.z = sin(swirl) * r;
        float availableHeight = max(0.0, uEndY - uOriginY - 0.015);
        p.y = uOriginY + clamp(rise * min(uHeight * uHeightScale, availableHeight)
          + churn * 0.025, 0.0, availableHeight);

        // Clip the whole sprite at the projected document edge. A height
        // limit alone lets foreground particles overlap it in perspective.
        vec3 edgeDirection = vec3(cos(uDocumentYaw), 0.0, -sin(uDocumentYaw));
        vec3 edgeCentre = vec3(0.0, uEndY, ${DOC_FRONT.toFixed(2)});
        vec4 a = projectionMatrix * modelViewMatrix * vec4(edgeCentre - edgeDirection, 1.0);
        vec4 b = projectionMatrix * modelViewMatrix * vec4(edgeCentre + edgeDirection, 1.0);
        vec4 source = projectionMatrix * modelViewMatrix * vec4(0.0, uOriginY, 0.0, 1.0);
        vec2 edgeA = (a.xy / a.w * 0.5 + 0.5) * uViewport;
        vec2 edgeB = (b.xy / b.w * 0.5 + 0.5) * uViewport;
        vec2 sourcePixel = (source.xy / source.w * 0.5 + 0.5) * uViewport;
        vec2 direction = edgeB - edgeA;
        vec2 normal = vec2(-direction.y, direction.x) / max(length(direction), 0.001);
        normal *= dot(sourcePixel - edgeA, normal) < 0.0 ? -1.0 : 1.0;
        vDocumentEdge = vec3(normal, -dot(normal, edgeA));

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
      uniform float uHover, uCompact, uReveal, uPixelRatio;
      varying float vT, vSeed, vSpark, vHue;
      varying vec3 vDocumentEdge;
      void main() {
        float edgeDistance = dot(vDocumentEdge.xy, gl_FragCoord.xy) + vDocumentEdge.z;
        if (edgeDistance <= 0.5) discard;
        // Senkrecht gestauchte Punktform: aus dem runden Sprite wird ein
        // Bewegungsstrich, wie bei einem sehr schnellen Abgasstrahl.
        vec2 point = gl_PointCoord - 0.5;
        point.y *= mix(0.46, 0.15, vT);
        float d = length(point);
        if (d > 0.5) discard;
        float core = 1.0 - smoothstep(0.0, 0.5, d);

        vec3 blue = vec3(.12, .48, 1.0);
        vec3 amber = vec3(1.0, .40, .06);
        vec3 teal = vec3(.04, 1.0, .65);
        vec3 violet = vec3(.72, .22, 1.0);
        float band = vHue * 4.0;
        float blend = smoothstep(.65, 1.0, fract(band));
        vec3 color = band < 1.0 ? mix(blue, teal, blend)
          : band < 2.0 ? mix(teal, amber, blend)
          : band < 3.0 ? mix(amber, violet, blend) : mix(violet, blue, blend);

        float alpha = core * vSpark * (0.60 + uHover * 0.18)
          * uReveal * mix(1.0, 0.64, uCompact)
          * smoothstep(0.5, max(1.5, 2.5 * uPixelRatio), edgeDistance);
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
    setOrigin(y) {
      uniforms.uOriginY.value = y;
      uniforms.uEndY.value = y + DOC_LIFT - 0.04;
    },
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
  const count = 410;
  const offsets = new Float32Array(count);
  const speeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    // Gleichmaessige Verteilung auf dem Umfang, damit keine Kante duenn bleibt.
    offsets[index] = (index / count + (Math.sin(index * 12.9898) * 0.5 + 0.5) * 0.3) % 1;
    speeds[index] = 0.45 + ((Math.sin(index * 7.13) * 0.5 + 0.5)) * 0.75;
    sizes[index] = 0.5 + ((Math.sin(index * 3.77) * 0.5 + 0.5)) * 1.4;
    seeds[index] = (Math.sin(index * 5.123) * 43758.5453) % 1;
    seeds[index] = seeds[index] - Math.floor(seeds[index]);
    // Eigener Hash fuer den Farbton, damit Farbe und Tempo nicht korrelieren
    // und derselbe Regenbogen entsteht wie in den Duesenstrahlen.
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
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
      attribute float aOffset, aSpeed, aSize, aSeed;
      uniform float uTime, uReduced, uHalfWidth, uHalfHeight;
      varying float vSeed, vSpark;
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
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uOpacity, uTime;
      varying float vSeed, vSpark;
      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float core = smoothstep(0.5, 0.04, length(point));
        vec3 color = vec3(0.47, 0.75, 1.0);
        float alpha = core * uOpacity * (0.30 + 0.34 * vSpark);
        if (alpha < 0.008) discard;
        gl_FragColor = vec4(color, alpha);
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
    setOrigin(y) {
      originY = y;
      group.position.y = originY + DOC_LIFT + uniforms.uHalfHeight.value;
    },
    setWindow(width, height) {
      // Der dynamische Partikelrahmen folgt exakt den vier physikalischen
      // Dokumentkanten. Dadurch kann kein Dokumentinhalt unterhalb der
      // unteren bunten Kante erscheinen. Da DOC_LIFT bereits knapp innerhalb
      // der oberen Jetzone liegt, sitzt diese Unterkante zugleich unmittelbar
      // am Uebergang zwischen Duesenstrahl und Hologramm.
      uniforms.uHalfWidth.value = width * 0.5;
      uniforms.uHalfHeight.value = height * 0.5;
      group.position.set(
        0,
        originY + DOC_LIFT + height * 0.5,
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
 * Beschriftung eines Sockels im Startbild: Ordnungszahl, Titel und eine
 * Zeile Stichworte. Sie steht vorn an der Sockelkante, hell und ruhig, damit
 * man ohne Umweg ueber das Menue erkennt, was hinter jedem Sockel liegt.
 * Sobald ein Bereich geoeffnet ist, tritt sie ab.
 */
function makeCardLabel(def, maxAnisotropy = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const accent = new THREE.Color(def.accent);

  function draw() {
    if (!context) return;
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Live titles are separate from the model's ornamental engraving.
    context.letterSpacing = '0.08em';
    context.font = '500 64px "Barlow Condensed", sans-serif';
    context.fillStyle = '#ffffff';
    context.shadowBlur = 0;
    context.fillText(t(`card.${def.key}.title`).toUpperCase(), width * 0.5, height * 0.32, width * 0.94);
    context.font = '400 30px "Barlow Condensed", sans-serif';
    context.fillText(t(`card.${def.key}.subtitle`), width * 0.5, height * 0.60, width * 0.94);

    texture.needsUpdate = true;
  }

  draw();
  document.fonts?.ready.then(draw).catch(() => {});
  const stopLanguage = onLanguageChange(draw);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.5), material);
  mesh.name = 'card-label';
  mesh.userData.key = def.key;
  mesh.renderOrder = 3;
  // Leicht zum Betrachter geneigt, vorn an der Sockelkante.
  mesh.rotation.x = -0.14;
  mesh.material.depthTest = false;

  const group = new THREE.Group();
  group.userData.kind = 'card-label';
  group.add(mesh);

  let reveal = 1;
  let revealTarget = 1;
  let openTarget = 1;
  let hoverStart = null;
  const blue = lightColor('fiberBlue'), amber = lightColor('amber');
  return {
    group,
    setOrigin(y) { group.position.set(0, y + 0.5, BASE_DIAMETER * 0.5 + .65); },
    setReveal(value, immediate = false) {
      revealTarget = value;
      if (immediate) reveal = value;
    },
    /** Der aktive Titel bleibt sichtbar; benachbarte Titel treten zurück. */
    setOpened(anyOpen, active) { openTarget = !anyOpen || active ? 1 : 0; },
    update(elapsed, delta, hover, active) {
      if (hover > .05) hoverStart ??= elapsed;
      else hoverStart = null;
      const pulse = reducedMotion() ? .7 : (1 - Math.cos(Math.max(0, elapsed - (hoverStart ?? elapsed)) * Math.PI / 2.4)) * .5;
      const amount = active ? 1 : hover * pulse;
      material.color.copy(blue).lerp(amber, amount);
      mesh.userData.orange = amount;
      const target = revealTarget * openTarget;
      reveal += (target - reveal) * (1 - Math.pow(0.01, Math.min(delta, 0.1)));
      material.opacity = (0.88 + hover * 0.12) * reveal;
      group.visible = material.opacity > 0.01;
    },
    dispose() {
      stopLanguage();
      texture.dispose();
      material.dispose();
      mesh.geometry.dispose();
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
  const headroom = isDocumentKey(card.key)
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

function applyDocumentSection(card, immediate = false) {
  const projection = card?.resumeProjection;
  if (!projection?.ready) {
    if (card) card.pendingDocumentSection = true;
    return;
  }
  const count = Math.max(1, projection.pageCount);
  const anchor = card.key === 'abschluss' ? getIhkAnchor(card.documentSection) : getCvAnchor(card.documentSection);
  projection.scrollToFraction(card.key === 'abschluss' ? Math.min(count - 1, Math.floor(anchor * count)) / count : anchor, immediate);
  card.pendingDocumentSection = false;
}

/**
 * Setzt das Dokumentfenster ueber die Sockeloberkante. Die Breite bleibt
 * hoechstens so breit wie der Sockel; die Hoehe reicht bis zu einer ganzen
 * Seite und folgt sonst dem Bildschirmfenster, das die Buehne vorgibt.
 */
function updateCeiling(card, rebuild = false) {
  if (rebuild && card.ceiling) card.holder.remove(card.ceiling);
  if (!card.ceiling || rebuild) {
    card.ceiling = new THREE.Group();
    card.ceiling.name = 'pedestal-ceiling';
    card.ceiling.userData.decorative = true;
    // The upper source has no inscription and faces the projection below.
    card.ceiling.add((card.upperBase ?? card.base).clone(true));
    card.ceiling.add(card.accentRing.clone());
    // One central light illuminates both mirrored bodies; avoid doubling lights.
    // Shared particle buffers and uniforms keep both jets in phase.
    card.ceiling.add(card.ringJet.group.clone(true));
    card.ceiling.scale.y = -1;
    card.holder.add(card.ceiling);
  }
  card.ceiling.position.y = 2 * card.surfaceY + 2 * DOC_LIFT + card.windowHeight;
  card.rimLight.position.y = card.surfaceY + DOC_LIFT + card.windowHeight * .5;
}

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
  updateCeiling(card);

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

/** Preserve Blender's metal, gold and section colours; pulse emission only. */
function prepareModelMaterials(source, ringPulse) {
  const materials = new Set();
  source.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = false;
    object.receiveShadow = false;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      if (material.name === 'VL / Violett') {
        material.color.copy(lightColor('green'));
        material.emissive.copy(lightColor('green')).multiplyScalar(.75);
        material.name = 'VL / Gruen';
      }
      material.onBeforeCompile = shader => {
        shader.uniforms.uRingPulse = ringPulse;
        shader.fragmentShader = `uniform float uRingPulse;\n${shader.fragmentShader}`;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n totalEmissiveRadiance *= uRingPulse;',
        );
      };
      material.customProgramCacheKey = () => 'blender-pedestal-emission-v1';
      material.needsUpdate = true;
    }
  });
}

function loadLeanGLB(url, onLoad, onError) {
  const draco = new DRACOLoader().setWorkerLimit(deviceQuality() === 2 ? 2 : 1);
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

function loadSharedBases(cards, shouldFade, onSettled, ringPulse) {
  const cache = new Map();
  let disposed = false;
  let revision = 0;

  function load(variant) {
    if (!cache.has(variant)) {
      const promise = new Promise((resolve, reject) => loadLeanGLB(MODEL_URLS[variant], resolve, reject))
        .then(gltf => {
          const scene = gltf.scene;
          if (disposed) { disposeObject(scene); return null; }
          try {
            prepareModelMaterials(scene, ringPulse);
            const models = new Map();
            for (const card of cards) {
              const source = scene.getObjectByName(`pedestal-${card.key}`);
              if (!source) throw new Error(`Missing pedestal: ${variant}/${card.key}`);
              const model = new THREE.Group();
              model.userData = { kind: 'blender-pedestal', variant, section: card.key };
              // Source positions belong to Blender's studio arrangement. The
              // existing responsive layout owns the browser arrangement.
              const geometry = source.clone(true);
              geometry.position.set(0, 0, 0);
              model.add(geometry);
              const bounds = new THREE.Box3().setFromObject(model);
              const size = bounds.getSize(new THREE.Vector3());
              const diameter = Math.max(size.x, size.z);
              if (!Number.isFinite(diameter) || diameter <= 0) throw new Error('Invalid pedestal bounds');
              geometry.scale.multiplyScalar(BASE_DIAMETER / diameter);
              bounds.setFromObject(model);
              const centre = bounds.getCenter(new THREE.Vector3());
              geometry.position.set(-centre.x, BASE_TOP - bounds.max.y, -centre.z);
              model.updateMatrixWorld(true);
              models.set(card.key, model);
            }
            return { scene, models };
          } catch (error) { disposeObject(scene); throw error; }
        });
      cache.set(variant, promise);
      promise.catch(() => { if (cache.get(variant) === promise) cache.delete(variant); });
    }
    return cache.get(variant);
  }

  function installLower(asset, variant) {
    for (const card of cards) {
      const model = asset.models.get(card.key).clone(true);
      model.name = `pedestal-base-${card.key}`;
      model.rotation.y = card.base.rotation.y;
      // Only the initial procedural placeholders own disposable resources.
      // Loaded variants remain cached for instant subsequent language changes.
      if (card.pendingFallback) {
        card.holder.remove(card.pendingFallback);
        disposeObject(card.pendingFallback);
        card.pendingFallback = null;
      }
      const previous = card.base;
      const fallback = previous.userData.kind !== 'blender-pedestal';
      if (fallback && shouldFade()) {
        card.pendingFallback = previous;
        card.modelReveal = 0;
        setObjectFade(model, 0);
      } else {
        card.holder.remove(previous);
        if (fallback) disposeObject(previous);
        setObjectFade(model, 1);
      }
      card.holder.add(model);
      card.base = model;
      card.holder.userData.pedestalLanguage = variant;
      // Bounds are measured in holder coordinates, independent of its current
      // responsive scale, hover animation and rotation.
      const modelBox = new THREE.Box3().setFromObject(asset.models.get(card.key));
      card.surfaceY = BASE_TOP;
      card.accentRing.position.y = card.surfaceY + 0.035;
      card.ringJet?.setOrigin(card.surfaceY + 0.04);
      card.resumeFrame?.setOrigin(card.surfaceY);
      card.examplePreview?.setOrigin(card.surfaceY);
      card.label?.setOrigin(card.surfaceY);
      setHitBody(card, modelBox);
      updateResumeWindow(card, false);
      updateCeiling(card, true);
      card.notifyBoundsChange(card.key);
    }
  }

  async function selectLanguage(language) {
    const request = ++revision;
    try {
      const asset = await load(language);
      if (disposed || request !== revision || !asset) return 'disposed';
      installLower(asset, language);
      return 'loaded';
    } catch (error) {
      if (!disposed) console.warn('Blender-Sockel konnten nicht geladen werden; bisherige Sockel bleiben sichtbar:', error);
      return 'fallback';
    }
  }
  const stopLanguage = onLanguageChange(language => { selectLanguage(language); });
  const topReady = load('top').then(asset => {
    if (disposed || !asset) return 'disposed';
    for (const card of cards) {
      card.upperBase = asset.models.get(card.key);
      card.upperBase.name = `pedestal-upper-${card.key}`;
      card.upperBase.rotation.y = card.base.rotation.y;
      updateCeiling(card, true);
    }
    return 'loaded';
  }).catch(error => {
    if (!disposed) console.warn('Obere Blender-Sockel konnten nicht geladen werden; Ersatz bleibt sichtbar:', error);
    return 'fallback';
  });
  Promise.all([selectLanguage(getLanguage()), topReady]).then(statuses => {
    onSettled(disposed ? 'disposed' : statuses.every(status => status === 'loaded') ? 'loaded' : 'fallback');
  });
  return {
    dispose() {
      disposed = true;
      revision++;
      stopLanguage();
      for (const promise of cache.values()) promise.then(asset => { if (asset) disposeObject(asset.scene); }).catch(() => {});
      cache.clear();
    },
  };
}

export const CARD_DEFS = [
  { key: 'abschluss',  accent: LIGHT_PALETTE.fiberBlue, index: 'I',   title: 'ABSCHLUSSPROJEKT', subtitle: 'Server, UEM, Clients, Migration' },
  { key: 'projekte',   accent: LIGHT_PALETTE.fiberBlue, index: 'II',  title: 'IT-PROJEKTE',      subtitle: 'Eigenbau, Automatisierung, Experiment' },
  { key: 'lebenslauf', accent: LIGHT_PALETTE.fiberBlue, index: 'III', title: 'LEBENSLAUF',       subtitle: 'Werdegang, Fähigkeiten, Kontakt' },
];

export function createCards({ renderer, reduced = false } = {}) {
  const group = new THREE.Group();
  const time = { value: 0 };
  // One shared uniform drives the lower models and the separate upper caps
  // in phase, using the existing animation loop.
  const ringPulse = { value: 1 };
  const maxAnisotropy = renderer?.capabilities.getMaxAnisotropy?.() || 1;
  const cards = [];
  const pickables = [];
  const documentPickables = [];
  let boundsListener = null;
  let layoutScale = 1;
  let mobileSelection = null;
  let openedKey = null;
  let modelRevealReleased = false;
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  for (const def of CARD_DEFS) {
    const isResume = isDocumentKey(def.key);
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
    // The middle pedestal carries the interactive website preview.
    const examplePreview = def.key === 'projekte' ? createExamplePreview() : null;
    const label = makeCardLabel(def, maxAnisotropy);
    label.setOrigin(BASE_TOP);
    const resumeFrame = makeResumeFrame(time, { reduced, idleOpacity: 0.60 });
    const resumeProjection = isResume
      ? createResumeProjection({
          renderer,
          reduced,
          idleOpacity: RESUME_IDLE_OPACITY,
          documentKey: def.key,
          ...(def.key === 'abschluss' ? { sourceForLanguage: ihkProjectionSource } : {}),
          onReady() {
            if (!card) return;
            updateResumeWindow(card, false);
            if (card.pendingDocumentSection) applyDocumentSection(card, true);
            card.notifyBoundsChange(card.key);
          },
          onError(error) {
            console.warn(`Die Projektion ${def.key} konnte nicht aufgebaut werden:`, error);
          },
        })
      : null;
    resumeFrame?.setOrigin(BASE_TOP);
    if (!isResume) resumeFrame.setWindow(DOC_MAX_WIDTH * RESUME_WORLD_SCALE, DOC_MAX_WIDTH * RESUME_WORLD_SCALE / (1258 / 1920));
    examplePreview?.setOrigin(BASE_TOP);

    const accentRing = makeAccentRing(def.accent);
    accentRing.position.y = BASE_TOP + 0.035;
    const rimLight = new THREE.PointLight(
      LIGHT_PALETTE.fiber,
      isResume ? 16 : 30,
      18,
      2,
    );
    rimLight.userData.baseIntensity = rimLight.intensity;
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
    if (examplePreview) { holder.add(examplePreview.group); pickables.push(examplePreview.mesh); }
    holder.add(label.group);
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
      examplePreview,
      label,
      resumeProjection,
      resumeFrame,
      accentRing,
      rimLight,
      hit,
      hover: 0,
      target: 0,
      menuPulseStart: -Infinity,
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
      windowHeight: DOC_MAX_WIDTH * RESUME_WORLD_SCALE / (1258 / 1920),
      // Seitenverhaeltnis des Fensters auf dem Schirm, von der Buehne gesetzt.
      windowAspect: 0,
      // Die physische Seitengroesse bleibt beim Oeffnen unveraendert.
      docScale: 1,
      resumeOpen: false,
      active: false,
      documentSection: 'uebersicht',
      pendingDocumentSection: false,
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
    updateCeiling(card);
    cards.push(card);
  }

  let temporaryActive = null;
  let projectHologramHidden = false;
  let lastElapsed = 0;
  let resumeCard = cards.find((card) => card.key === RESUME_KEY) ?? null;

  const baseModels = loadSharedBases(
    cards,
    () => modelRevealReleased,
    (status) => resolveReady(status),
    ringPulse,
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
        if (card.ringJet) renderer.getDrawingBufferSize(card.ringJet.uniforms.uViewport.value);
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
    setProjectionHidden(value, key = resumeCard?.key) {
      const card = cards.find((item) => item.key === key);
      card?.resumeProjection?.setHidden(value);
      card?.resumeFrame?.setHidden(value);
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
      if (!resumeCard) return;
      resumeCard.documentSection = section;
      applyDocumentSection(resumeCard, immediate);
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

    pulseMenuHover(key) {
      for (const card of cards) card.menuPulseStart = card.key === key ? lastElapsed : -Infinity;
    },

    setProjectHologramHidden(value) {
      projectHologramHidden = Boolean(value);
      const card = cards.find(item => item.key === 'projekte');
      if (!card) return;
      if (card.ringJet) card.ringJet.group.visible = !projectHologramHidden;
      if (card.resumeFrame) card.resumeFrame.group.visible = !projectHologramHidden;
      if (projectHologramHidden) {
        if (card.examplePreview) card.examplePreview.group.visible = false;
        if (card.label) card.label.group.visible = false;
      }
    },

    setExplored(explored) {
      const keys = explored instanceof Set ? explored : new Set(explored || []);
      // Besuchte Bereiche treten optisch zurueck: ihr Ring leuchtet matter.
      for (const card of cards) {
        card.accentRing.userData.idleOpacity = keys.has(card.key) ? 0.34 : 0.58;
      }
    },

    setHologramReveal(value, immediate = false) {
      for (const card of cards) {
        card.ringJet?.setReveal(value, immediate);
        card.examplePreview?.setReveal(value, immediate);
        card.label?.setReveal(value, immediate);
      }
    },

    setMobileSelection(index) {
      mobileSelection = index;
      for (const card of cards) card.holder.visible = index === null
        || (openedKey ? card.key === openedKey : card.layoutIndex === index);
    },

    setLayout({ spacing = 7.8, scale = 1, compact = false, stagger = 0 } = {}) {
      layoutScale = scale;
      const sideRadius = spacing * LAYOUT_SIDE_FACTOR;
      const centerRise = spacing / LAYOUT_CENTER_RISE_DIVISOR;
      const outerDrop = spacing / LAYOUT_OUTER_DROP_DIVISOR + stagger;

      for (const card of cards) {
        const axis = card.layoutIndex - 1;
        card.holder.position.x = axis * sideRadius;

        // Mirror symmetry plus Fibonacci-derived shallow arc: centre is the
        // apex, both outer pedestals sit at the exact same level.
        card.layoutY = HOME_ROW_DROP
          + (card.layoutIndex === 1 ? centerRise : -outerDrop);

        // Die Grundskalierung bleibt beim Anflug stabil.
        // Die Kamera uebernimmt das Heranfahren.
        if (!card.layoutInitialized || reduced) {
          card.displayScale = layoutScale;
          card.holder.scale.setScalar(card.displayScale);
          card.layoutInitialized = true;
        }

        card.resumeFrame?.setCompact(compact);
        card.rimLight.userData.baseIntensity = isDocumentKey(card.key)
          ? (compact ? 10 : 16)
          : (compact ? 18 : 30);
        card.rimLight.intensity = card.rimLight.userData.baseIntensity;

        if (card.ringJet) {
          card.ringJet.uniforms.uCompact.value =
            compact ? 1 : 0;

          card.ringJet.uniforms.uHeightScale.value =
            compact ? 1.14 : 1;
        }
      }
    },

    /** Welt-Bounding-Box des Sockels, fuer das Kamera-Framing. */
    projectBounds(out = new THREE.Box3()) {
      const mesh = group.getObjectByName('example-preview');
      mesh.updateWorldMatrix(true, false);
      return out.setFromObject(mesh);
    },
    faceLabels(camera) {
      for (const card of cards) {
        card.holder.updateWorldMatrix(true, false);
        _center.set(0, card.surfaceY + .5, 0).applyMatrix4(card.holder.matrixWorld);
        _size.copy(camera.position).sub(_center); _size.y = 0; _size.normalize();
        const scale = card.holder.scale.x;
        _center.addScaledVector(_size, (BASE_DIAMETER * .5 + .1) * scale);
        card.label.group.position.copy(card.holder.worldToLocal(_center));
        const localCamera = card.holder.worldToLocal(_size.copy(camera.position));
        const dx = localCamera.x - card.label.group.position.x, dz = localCamera.z - card.label.group.position.z;
        card.label.group.rotation.y = Math.atan2(dx, dz);
      }
    },
    showProjectPreview(show) {
      cards.find(c => c.key === 'projekte')?.examplePreview?.setReveal(show ? 1 : 0, true);
    },
    worldBounds(key, out = new THREE.Box3()) {
      const card = cards.find((item) => item.key === key);
      if (!card) return out.makeEmpty();
      card.holder.updateWorldMatrix(true, false);
      return out.copy(card.baseBounds).applyMatrix4(card.holder.matrixWorld);
    },

    onBoundsChange(cb) { boundsListener = cb; },

    /** Im Fokus bleibt nur der gewaehlte Sockel im Kamerabild. */
    setTemporaryActive(key) {
      temporaryActive = key;
      for (const card of cards) {
        card.active = (temporaryActive || openedKey) === card.key;
        card.label?.setOpened(Boolean(temporaryActive || openedKey), card.active);
      }
    },

    setOpened(key, _isolate = false) {
      openedKey = key;
      if (isDocumentKey(key)) resumeCard = cards.find((card) => card.key === key);
      for (const card of cards) {
        // Nachbarsockel verschwinden nicht schlagartig, sondern laufen
        // waehrend der Kamerafahrt aus dem Bild.
        card.holder.visible = mobileSelection === null || (key ? card.key === key : card.layoutIndex === mobileSelection);
        card.active = (temporaryActive || key) === card.key;
        if (key === 'projekte' && card.key === key) {
          // Settle before focusCard measures the bounds for the camera flight.
          card.holder.position.y = card.layoutY;
          card.holder.rotation.y = 0;
        }
        card.resumeOpen =
          key === card.key
          && isDocumentKey(card.key);

        card.resumeProjection?.setOpen(card.resumeOpen);
        card.resumeFrame?.setOpen(card.resumeOpen);
        card.label?.setOpened(Boolean(key), card.active);

        if (isDocumentKey(card.key) && !card.resumeOpen) {
          card.pendingDocumentSection = false;
          card.documentSection = 'uebersicht';
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
      lastElapsed = elapsed;
      time.value = elapsed;
      ringPulse.value = reduced ? 1.6 : 1.6 + 0.85 * Math.sin(elapsed * Math.PI * 2 / 6.3);
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
        const cueAge = elapsed - card.menuPulseStart - .32;
        const menuFlash = reduced || cueAge < 0 || cueAge >= .8 ? 0
          : Math.pow(Math.max(0, Math.sin(cueAge * Math.PI * 5)), 4) * (1 - cueAge / .8);
        card.holder.userData.menuFlash = menuFlash;
        card.rimLight.intensity = card.rimLight.userData.baseIntensity * (1 + menuFlash * .28);
        if (!reduced) {
          card.base.rotation.y = elapsed * .055;
          const topBase = card.ceiling?.children[0];
          if (topBase) topBase.rotation.y = elapsed * .055;
        }
        card.accentRing.material.color.lerp(new THREE.Color(card.active || card.hover > .1
          ? LIGHT_PALETTE.amber : LIGHT_PALETTE.fiberBlue).multiplyScalar(1.5 + menuFlash * .8), k);
        // The upper clone shares this material and therefore the same pulse.
        card.accentRing.material.opacity = Math.min(1,
          (card.accentRing.userData.idleOpacity ?? 0.58) * ringPulse.value);
        const fallbackRing = card.base.children.find(child => child.isLine);
        if (fallbackRing) fallbackRing.material.opacity = Math.min(1, 0.42 * ringPulse.value);
        if (card.ringJet) {
          card.ringJet.uniforms.uHover.value = card.hover;
          card.ringJet.update(delta);
        }
        card.examplePreview?.update(
          elapsed,
          delta,
          card.hover,
        );
        card.label?.update(elapsed, delta, card.hover, card.active);
        if (projectHologramHidden && card.key === 'projekte') {
          if (card.examplePreview) card.examplePreview.group.visible = false;
          if (card.label) card.label.group.visible = false;
        }
        card.holder.userData.active = card.active;
        card.holder.userData.hover = card.hover;

        card.resumeFrame?.update(delta);
        card.resumeProjection?.update(delta);

        // Mirrored side elements also breathe in phase; the centre uses
        // the complementary golden-ratio phase instead of a key-length accident.
        const phase = card.layoutIndex === 1 ? Math.PI / LAYOUT_PHI : 0;
        // The HTML controls share this plane: hold it still while browsing.
        // The pedestal bodies retain their independent slow rotation.
        card.holder.position.y = card.layoutY + (card.key === 'projekte' && openedKey === card.key
          ? 0
          : Math.sin(elapsed * 0.18 + phase) * 0.11 + card.hover * 0.16);
        if (isDocumentKey(card.key)) {
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
          card.ringJet.uniforms.uDocumentYaw.value = documentYaw;
        } else {
          card.holder.rotation.y =
            openedKey === card.key ? 0 : Math.sin(elapsed * 0.09 + phase) * 0.022;
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
      baseModels.dispose();
      for (const card of cards) {
        card.disposed = true;
        card.resumeProjection?.dispose();
        card.examplePreview?.dispose();
        card.label?.dispose();
      }
      disposeObject(group);
      group.clear();
      pickables.length = 0;
      documentPickables.length = 0;
      boundsListener = null;
    },
  };
}
