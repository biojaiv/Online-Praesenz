import * as THREE from 'three';
import gsap from 'gsap';
import { traceExecution } from '../state/runtimeTrace.js';
import { onLanguageChange, t as translate } from '../i18n.js';
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, VignetteEffect, NoiseEffect, SMAAEffect,
  BlendFunction, KernelSize,
} from 'postprocessing';
import { createBackground } from './background.js';
import { createCards } from './cards.js';
import { getCvPageAspect } from './resumeProjection.js';
import { ihkProjectionSource } from './ihkProjectionSource.js';
import { createIhkHologramFilm } from '../ui/ihkHologramFilm.js';
import { LIGHT_PALETTE } from './palette.js';
import { createExampleFlight } from './exampleFlight.js';
import { createRenderBudget } from './renderBudget.js';

const isDocumentKey = (key) => key === 'lebenslauf' || key === 'abschluss';
const isZoomableKey = key => isDocumentKey(key) || key === 'projekte';

/**
 * Die Buehne.
 *
 * Das gesamte Bild bleibt durchgehend scharf. Tiefe entsteht allein ueber
 * Licht, Nebel, Bloom und die Staffelung der Ebenen — wie in einer ruhigen
 * Filmeinstellung mit grosser Schaerfentiefe.
 *
 * Die Kamera hat genau einen Antrieb: gsap-Tweens auf `camPos` und `look`.
 * Frueher lag daneben noch eine handgerechnete Interpolation; beide schrieben
 * dieselben Vektoren, und wer zuletzt lief, gewann — Intro-Dolly und
 * Heimfahrt konnten sich gegenseitig ueberfahren.
 */

const HOME = {
  cam:  new THREE.Vector3(0, 0, 21.5),
  look: new THREE.Vector3(0, 0, -8),
};

// Projektion und Lesefassung nehmen genau dieselbe Flaeche ein: ein Rechteck
// im Seitenverhaeltnis der Vorlage, hoechstens DOC_MAX_PX breit, mit Rand zur
// Buehnenkante. Beide werden aus derselben Rechnung gespeist — die eine ueber
// das Kamera-Framing, die andere ueber zwei CSS-Variablen.
const DOC_MAX_PX = 640;
const DOC_GUTTER_X = 42;
const DOC_GUTTER_Y = 42;
// Kameraabstand beim geoeffneten Lebenslauf als Vielfaches des Zielbilds.
// The wheel zooms all three holograms. Hold the left button (or Shift)
// while wheeling to scroll a document; Ctrl/Meta keeps pinch zoom available.
const DOCUMENT_ZOOM_DEFAULT = 1.08;
const DOCUMENT_ZOOM_MIN = 0.12;
const DOCUMENT_ZOOM_MAX = 3.2;
const DOCUMENT_WHEEL_SENSITIVITY = 1.25;
// Abstand zur Projektion bei frontaler Sicht. Der Wert liegt nur wenig ueber
// der Nah-Clippingebene; beim Drehen kommt automatisch die nach vorn ragende
// halbe Blattbreite hinzu, damit die Kamera nie im Blatt steckt.
const DOCUMENT_MIN_CLEARANCE = 0.24;
// Filmischer Takt statt maximaler Bildrate: rund 30 Bilder je Sekunde.
// Der Abzug verhindert, dass ein 60-Hz-Bildschirm auf 20 Hz einrastet.
const FRAME_BUDGET = 1000 / 30 - 3;

// ORBIT_V6: Im Ruhezustand laesst sich die Buehne anfassen und drehen. Die
// Kamera kreist dann um die Mitte der Sockelreihe; die Maschine im
// Hintergrund umschliesst diesen Punkt und zeigt sich von neuen Seiten.
const ORBIT_PIVOT = new THREE.Vector3(0, -5, 0);
const ORBIT_YAW_SPEED = 0.0046;    // Bogenmass je Bildpunkt
const ORBIT_PITCH_SPEED = 0.0028;
const ORBIT_PITCH_MIN = -0.16;
const ORBIT_PITCH_MAX = 0.64;
const ORBIT_DAMPING = 0.05;        // Restgeschwindigkeit nach einer Sekunde
const ORBIT_STEP_CLAMP = 0.16;

function wrapAngle(value) {
  return THREE.MathUtils.euclideanModulo(value + Math.PI, Math.PI * 2) - Math.PI;
}

export function createStage(canvas, { onDocumentScroll, onDocumentRect } = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderBudget = createRenderBudget();

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: renderBudget.profile.name === 'full' ? 'high-performance' : 'low-power',
    stencil: false,
  });
  // STARTUP_DPR_RAMP_V5_1_1: first usable frame at DPR 1.
  let currentPixelRatio = Math.min(renderBudget.ratio(innerWidth, innerHeight), 1);
  let qualitySettled = false;
  renderer.setPixelRatio(currentPixelRatio);
  // FOREGROUND_BACKGROUND_SEPARATION_V5_5_2
  renderer.setClearColor(0x020407, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.38;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020407, 0.0068);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1800);
  camera.position.copy(HOME.cam);

  const background = createBackground({ camera, renderer });
  background.setPixelRatio(renderer.getPixelRatio());
  scene.add(background.group);

  const cards = createCards({ renderer, reduced });
  cards.setPixelRatio(renderer.getPixelRatio());
  scene.add(cards.group);

  scene.add(new THREE.AmbientLight(0x22384d, 0.88));
  const keyLight = new THREE.DirectionalLight(LIGHT_PALETTE.fiber, 1.72);
  keyLight.position.set(-6, 9, 12);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(LIGHT_PALETTE.fiberBlue, 24, 44, 2);
  rimLight.position.set(0, -4.5, 5);
  scene.add(rimLight);

  /* ---------- Nachbearbeitung ---------- */

  // Aeltere Intel-Treiber und Firefox stellen nicht immer renderbare
  // Half-Float-Targets bereit. Dann auf 8 Bit zurueckfallen; scheitert
  // auch die Effektkette, bleibt die Szene mit direktem Rendering sichtbar.
  const gl = renderer.getContext();
  const supportsHalfFloat = renderer.capabilities.isWebGL2
    ? !!gl.getExtension('EXT_color_buffer_float')
    : !!gl.getExtension('EXT_color_buffer_half_float');

  let composer = null;
  let noise = null;
  let bloom = null;
  let bloomBaseTarget = 1.62;

  try {
    composer = new EffectComposer(renderer, {
      frameBufferType: supportsHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
      multisampling: 0,
    });
    composer.addPass(new RenderPass(scene, camera));

    noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
    // LOCAL_SIGNAL_NOISE_ONLY_V6_2_2: kein permanentes Vollbildrauschen.
    noise.blendMode.opacity.value = 0;

    bloom = new BloomEffect({
      intensity: 1.62,
      luminanceThreshold: 0.12,
      luminanceSmoothing: 0.28,
      kernelSize: KernelSize.LARGE,
      mipmapBlur: true,
      levels: renderBudget.profile.bloomLevels,
    });

    composer.addPass(new EffectPass(
      camera,
      bloom,
      new VignetteEffect({ offset: 0.28, darkness: 0.72 }),
      noise,
      ...(renderBudget.profile.name === 'full' ? [new SMAAEffect()] : []),
    ));
  } catch (err) {
    console.warn('Nachbearbeitung nicht verfügbar, verwende direktes Rendering:', err);
    composer?.dispose();
    composer = null;
    noise = null;
    bloom = null;
  }

  /* ---------- Zustand ---------- */

  const look = HOME.look.clone();
  const camPos = HOME.cam.clone();
  const ndc = new THREE.Vector2(-2, -2);
  const pointer = new THREE.Vector2();
  const drift = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const bounds = new THREE.Box3();
  const focusCenter = new THREE.Vector3();
  const focusSize = new THREE.Vector3();
  const nextCam = new THREE.Vector3();
  const documentRouteCamera = new THREE.Vector3();
  const documentRouteLook = new THREE.Vector3();

  // Bildmasse einmal je Groessenaenderung messen. Ein
  // getBoundingClientRect() je Zeigerbewegung erzwingt sonst Layout.
  const view = { width: 1, height: 1, left: 0, top: 0, aspect: 1, compact: false };

  let mobileSelection = 0;
  let introActive = false;
  let hovered = null;
  let menuHover = null;
  let opened = null;
  let listener = null;
  let drag = null;
  let readerOpen = false;
  // Laufende Nummer des Uebergangs: schnelles Hin und Her soll keine zwei
  // Sequenzen gleichzeitig fahren lassen.
  let readerSequence = 0;
  let glitch = 0;
  let scrollLift = 0;
  let scrollLiftTarget = 0;
  let visibleHeight = 1;
  let documentHeight = 1;
  // Linke Maustaste auf der Projektion gedrueckt: Ziehen und Touchpad-Wischen
  // bewegen das Dokument; der Zustand verhindert einen Klick beim Loslassen.
  let documentPointerHeld = false;
  let docZoom = DOCUMENT_ZOOM_DEFAULT;
  let docZoomTarget = DOCUMENT_ZOOM_DEFAULT;
  let dollyGuideTimer = 0;
  // Beim Lebenslauf-Framing gespeichert: Z der Dokumentvorderkante und
  // Grundabstand bei docZoom=1. zoomDocument nutzt beide, um nur camPos.z
  // zu verstellen, ohne focusCard erneut aufzurufen.
  let docBoundsMaxZ = 0;
  let docFitDistance = 1;
  let docHalfWidth = 1;
  let viewMoving = false;
  let viewMoveTicket = 0;
  let qualityUpgradeTimer = 0;
  // Orbit im Ruhezustand: Drehwinkel um die Sockelmitte samt Auslauf.
  const orbit = { yaw: 0, pitch: 0, yawVelocity: 0, pitchVelocity: 0, dragging: false };
  const orbitQuaternion = new THREE.Quaternion();
  const orbitEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const lookTarget = new THREE.Vector3();
  // RESPONSIVE_CV_ZOOM_V5_4
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches
    || navigator.maxTouchPoints > 0;
  const touchPoints = new Map();
  let pinchGesture = null;

  const hologramFilm = createIhkHologramFilm(canvas);
  const guideHost = document.getElementById('foot-tools') || canvas.parentElement;
  const dollyGuide = document.createElement('div');
  dollyGuide.className = 'camera-dolly-guide';
  dollyGuide.setAttribute('aria-hidden', 'true');
  dollyGuide.innerHTML = `
    <svg viewBox="0 0 76 146" focusable="false" aria-hidden="true">
      <path class="camera-dolly-guide__rail" d="M38 15V131" />
      <path class="camera-dolly-guide__arrow camera-dolly-guide__arrow--near"
        d="M30 27L38 16L46 27" />
      <path class="camera-dolly-guide__arrow camera-dolly-guide__arrow--far"
        d="M30 119L38 130L46 119" />

      <rect class="camera-dolly-guide__mouse"
        x="23" y="40" width="30" height="62" rx="15" />
      <path class="camera-dolly-guide__left-button"
        d="M24 57A14 14 0 0 1 38 41V62H24Z" />
      <rect class="camera-dolly-guide__wheel"
        x="35" y="48" width="6" height="15" rx="3" />
      <path class="camera-dolly-guide__wheel-mark camera-dolly-guide__wheel-mark--upper"
        d="M38 50V54" />
      <path class="camera-dolly-guide__wheel-mark camera-dolly-guide__wheel-mark--lower"
        d="M38 57V61" />

      <path class="camera-dolly-guide__turn-direction camera-dolly-guide__turn-direction--left"
        d="M36 111C29 111 23 108 18 103M18 103L19 110M18 103L25 104" />
      <path class="camera-dolly-guide__turn-direction camera-dolly-guide__turn-direction--right"
        d="M40 111C47 111 53 108 58 103M58 103L57 110M58 103L51 104" />

      <circle class="camera-dolly-guide__node camera-dolly-guide__node--near"
        cx="38" cy="32" r="2" />
      <circle class="camera-dolly-guide__node camera-dolly-guide__node--far"
        cx="38" cy="114" r="2" />
    </svg>`;
  guideHost?.append(dollyGuide);

  const keyboardZoomHint = document.createElement('div');
  keyboardZoomHint.className = 'cv-keyboard-zoom-hint';
  keyboardZoomHint.setAttribute('aria-hidden', 'true');
  keyboardZoomHint.innerHTML = '<kbd>↑</kbd><span>Zoom</span><kbd>↓</kbd>';

  const mobileZoom = document.createElement('div');
  mobileZoom.className = 'cv-mobile-zoom';
  mobileZoom.setAttribute('aria-label', 'Projection zoom controls');
  mobileZoom.innerHTML = `
    <button class="cv-mobile-zoom__button" type="button" data-cv-zoom="in" aria-label="Zoom in">+</button>
    <button class="cv-mobile-zoom__button" type="button" data-cv-zoom="out" aria-label="Zoom out">−</button>
    <span class="cv-mobile-zoom__label">Pinch / + −</span>`;
  guideHost?.append(keyboardZoomHint, mobileZoom);

  function syncDocumentInputHints() {
    const active = isZoomableKey(opened) && !readerOpen;
    canvas.title = active ? translate('scene.zoomHelp') : '';
    dollyGuide.title = translate('scene.zoomHelp');
    if (!active) {
      pinchGesture = null;
      touchPoints.clear();
    }
    keyboardZoomHint.classList.toggle('is-visible', active && !coarsePointer);
    mobileZoom.classList.toggle('is-visible', active && coarsePointer);
    canvas.style.touchAction = active && coarsePointer ? 'none' : '';
  }

  function onMobileZoomClick(event) {
    const control = event.target instanceof Element
      ? event.target.closest('[data-cv-zoom]')
      : null;
    if (!(control instanceof HTMLButtonElement)) return;
    event.preventDefault();
    const zoomIn = control.dataset.cvZoom === 'in';
    zoomDocument(zoomIn ? -0.18 : 0.18);
    pulseDollyGuide(zoomIn ? 'near' : 'far');
  }
  mobileZoom.addEventListener('click', onMobileZoomClick);

  function setDollyGuide(visible, active = false, direction = null, source = null) {
    dollyGuide.classList.toggle('is-visible', Boolean(visible));
    dollyGuide.classList.toggle('is-active', Boolean(active));
    dollyGuide.classList.toggle('is-keyboard', active && source === 'keyboard');
    dollyGuide.classList.toggle('is-near', direction === 'near');
    dollyGuide.classList.toggle('is-far', direction === 'far');
    dollyGuide.classList.toggle('is-left', direction === 'left');
    dollyGuide.classList.toggle('is-right', direction === 'right');
    keyboardZoomHint.classList.toggle('is-near', active && source === 'keyboard' && direction === 'near');
    keyboardZoomHint.classList.toggle('is-far', active && source === 'keyboard' && direction === 'far');
  }

  function pulseDollyGuide(direction, source = 'pointer') {
    window.clearTimeout(dollyGuideTimer);
    setDollyGuide(isZoomableKey(opened) && !readerOpen, true, direction, source);
    const finishPulse = () => {
      if (document.documentElement.classList.contains('is-site-inspecting')) {
        dollyGuideTimer = window.setTimeout(finishPulse, 150);
        return;
      }
      if (!documentPointerHeld) {
        setDollyGuide(isZoomableKey(opened) && !readerOpen, false, null);
      }
    };
    dollyGuideTimer = window.setTimeout(finishPulse, 320);
  }

  function cancelViewMove() {
    viewMoveTicket += 1;
    gsap.killTweensOf([camPos, look]);
    viewMoving = false;
  }

  /** Zeigerform: Sockel = Hand, freie Buehne im Ruhezustand = greifbar. */
  function syncCursor() {
    if (orbit.dragging) canvas.style.cursor = 'grabbing';
    else if (hovered) canvas.style.cursor = 'pointer';
    else if (!opened && ndc.x > -1.5) canvas.style.cursor = 'grab';
    else canvas.style.cursor = '';
  }

  function orbitBy(dx, dy) {
    const yawDelta = THREE.MathUtils.clamp(-dx * ORBIT_YAW_SPEED, -ORBIT_STEP_CLAMP, ORBIT_STEP_CLAMP);
    const pitchDelta = THREE.MathUtils.clamp(dy * ORBIT_PITCH_SPEED, -ORBIT_STEP_CLAMP, ORBIT_STEP_CLAMP);
    orbit.yaw += yawDelta;
    orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + pitchDelta, ORBIT_PITCH_MIN, ORBIT_PITCH_MAX);
    orbit.yawVelocity = yawDelta;
    orbit.pitchVelocity = pitchDelta;
  }

  function endOrbit() {
    if (!orbit.dragging) return;
    orbit.dragging = false;
    if (reduced) {
      orbit.yawVelocity = 0;
      orbit.pitchVelocity = 0;
    }
    syncCursor();
  }

  /** Auslauf nach dem Loslassen bzw. Rueckkehr zur Nullstellung im Fokus. */
  function updateOrbit(dt) {
    if (orbit.dragging) return;
    if (opened) {
      // Beim Heranfahren an einen Sockel kehrt die Kamera auf kuerzestem Weg
      // in die Ausgangslage zurueck, damit das Zielbild stimmt.
      const response = 1 - Math.pow(0.0008, dt);
      orbit.yaw += (0 - orbit.yaw) * response;
      orbit.pitch += (0 - orbit.pitch) * response;
      if (Math.abs(orbit.yaw) < 0.0004) orbit.yaw = 0;
      if (Math.abs(orbit.pitch) < 0.0004) orbit.pitch = 0;
      orbit.yawVelocity = 0;
      orbit.pitchVelocity = 0;
      return;
    }
    if (Math.abs(orbit.yawVelocity) < 0.000001 && Math.abs(orbit.pitchVelocity) < 0.000001) {
      orbit.yawVelocity = 0;
      orbit.pitchVelocity = 0;
      return;
    }
    const step = Math.min(1.8, dt * 60);
    orbit.yaw += orbit.yawVelocity * step;
    orbit.pitch = THREE.MathUtils.clamp(
      orbit.pitch + orbit.pitchVelocity * step,
      ORBIT_PITCH_MIN,
      ORBIT_PITCH_MAX,
    );
    const damping = Math.pow(ORBIT_DAMPING, dt);
    orbit.yawVelocity *= damping;
    orbit.pitchVelocity *= damping;
  }

  let examplePreviewUpdate = null, projectPreviewHover = false;
  const examplePreviewPoint = new THREE.Vector3();
  const exampleFlight = createExampleFlight({
    camera, cards, scene,
    capture() {
      const saved = { camPos: camPos.clone(), look: look.clone(), orbit: { ...orbit },
        drift: drift.clone(), pointer: pointer.clone(), scrollLift, scrollLiftTarget };
      gsap.killTweensOf([camPos, look]);
      viewMoveTicket += 1;
      viewMoving = false;
      onWindowBlur();
      return saved;
    },
    restore(saved) {
      camPos.copy(saved.camPos); look.copy(saved.look);
      Object.assign(orbit, saved.orbit, { dragging: false, yawVelocity: 0, pitchVelocity: 0 });
      drift.copy(saved.drift); pointer.copy(saved.pointer);
      scrollLift = saved.scrollLift; scrollLiftTarget = saved.scrollLiftTarget;
    },
  });

  const mobileKeys = ['abschluss', 'projekte', 'lebenslauf'];
  const mobileDots = document.createElement('nav');
  mobileDots.className = 'mobile-pedestals';
  mobileDots.setAttribute('aria-label', translate('footer.selectSection'));
  mobileDots.innerHTML = mobileKeys.map((key, index) => `<button type="button" data-pedestal="${index}" aria-pressed="${index === mobileSelection}"></button>`).join('');
  canvas.parentElement.append(mobileDots);
  function syncMobileHome() {
    if (view.mobile) {
      const holder = cards.group.getObjectByName(`card-${mobileKeys[mobileSelection]}`);
      const homeDistance = 16.3 * Math.max(1, 520 / Math.max(view.height, 1));
      HOME.cam.set(holder?.position.x || 0, -.5, homeDistance);
      HOME.look.set(holder?.position.x || 0, -1, 0);
    } else {
      HOME.cam.set(0, 0, view.compact ? 34 : 21.5);
      HOME.look.set(0, 0, -8);
    }
    cards.setMobileSelection(view.mobile ? mobileSelection : null);
    mobileDots.hidden = !view.mobile || Boolean(opened) || introActive || exampleFlight.active;
    mobileDots.setAttribute('aria-label', translate('footer.selectSection'));
    mobileDots.querySelectorAll('button').forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === mobileSelection));
      button.textContent = translate(`card.${mobileKeys[index]}.title`);
    });
  }
  function selectMobile(index) {
    if (!view.mobile || opened || exampleFlight.active || introActive) return;
    mobileSelection = (index + mobileKeys.length) % mobileKeys.length;
    syncMobileHome();
    pointer.set(0, 0); drift.set(0, 0);
    orbit.yaw = 0; orbit.pitch = 0; orbit.yawVelocity = 0; orbit.pitchVelocity = 0;
    moveView(HOME.cam, HOME.look, .8);
  }
  function onMobileSelect(event) {
    const button = event.target.closest('[data-pedestal]');
    if (!button) return;
    const index = Number(button.dataset.pedestal);
    if (index === mobileSelection) listener?.('select', mobileKeys[index]);
    else selectMobile(index);
  }
  mobileDots.addEventListener('click', onMobileSelect);
  const unsubscribeMobileLanguage = onLanguageChange(syncMobileHome);

  /* ---------- Kamera ---------- */

  function moveView(target, aim, duration) {
    const ticket = ++viewMoveTicket;
    gsap.killTweensOf([camPos, look]);

    if (duration <= 0 || reduced) {
      camPos.copy(target);
      look.copy(aim);
      viewMoving = false;
      return;
    }

    viewMoving = true;
    const options = {
      duration,
      ease: 'sine.inOut',
      overwrite: 'auto',
    };

    gsap.to(camPos, {
      x: target.x,
      y: target.y,
      z: target.z,
      ...options,
      onComplete() {
        if (ticket === viewMoveTicket) viewMoving = false;
      },
    });

    gsap.to(look, {
      x: aim.x,
      y: aim.y,
      z: aim.z,
      ...options,
    });
  }

  const halfFovTan = () => Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));

  /**
   * Die Flaeche des Dokuments auf dem Schirm, in CSS-Pixeln.
   *
   * Zuerst die Breite: so breit wie eine gut lesbare Spalte, hoechstens so
   * breit wie die Buehne. Die Hoehe folgt der Seite — passt eine ganze Seite
   * nicht in die Buehne, wird das Fenster niedriger und das Dokument laeuft
   * hindurch. Projektion und Lesefassung teilen genau dieses Rechteck.
   */
  const docRect = { width: DOC_MAX_PX, height: DOC_MAX_PX / getCvPageAspect() };

  function measureDocumentRect() {
    const availableWidth = Math.max(220, view.width - DOC_GUTTER_X * 2);
    const availableHeight = Math.max(220, view.height - DOC_GUTTER_Y * 2);
    const width = Math.min(DOC_MAX_PX, availableWidth);
    const pageAspect = opened === 'abschluss' ? ihkProjectionSource().pageAspect : getCvPageAspect();
    const height = Math.min(width / pageAspect, availableHeight);
    if (Math.abs(width - docRect.width) < 0.5 && Math.abs(height - docRect.height) < 0.5) {
      return docRect;
    }
    docRect.width = width;
    docRect.height = height;
    onDocumentRect?.({ width, height });
    return docRect;
  }

  /** Dokumentfenster im Raum auf dasselbe Seitenverhaeltnis bringen. */
  function syncDocumentAspect() {
    const rect = measureDocumentRect();
    cards.setDocumentAspect(rect.width / rect.height);
    return rect;
  }

  // Language changes can change the physical page aspect (the English web
  // projection has three native pages). Keep the HTML reader rectangle and
  // the 3D projection tied to the same language-specific page geometry.
  const unsubscribeDocumentLanguage = onLanguageChange(() => {
    syncDocumentAspect();
    syncDocumentInputHints();
  });

  function updateDocumentLift() {
    const overflow = Math.max(0, documentHeight - visibleHeight * 0.9);
    scrollLiftTarget = (0.5 - cards.documentScroll) * overflow;
  }

  /** Ruhezustand: alle drei Karten im Blick. */
  function toHome(duration = 0.95) {
    if (exampleFlight.active) return;
    traceExecution({
      source: 'src/scene/stage.js',
      code: `toHome(${Number(duration).toFixed(2)})`,
    });
    opened = null;
    syncMobileHome();
    cards.setOpened(null);
    background.setDocumentOpen?.(false);
    cards.setDocumentScroll(0, true);
    docZoom = DOCUMENT_ZOOM_DEFAULT;
    docZoomTarget = DOCUMENT_ZOOM_DEFAULT;
    documentPointerHeld = false;
    setDollyGuide(false);
    syncDocumentInputHints();
    scrollLiftTarget = 0;
    pointer.set(0, 0);
    moveView(HOME.cam, HOME.look, duration);
    syncCursor();
    applyBloom();
  }

  /**
   * Heranfahren an einen Bereich.
   *
   * Beim Lebenslauf rahmt die Kamera das Dokumentfenster und laesst darunter
   * bewusst ein Stueck Sockel stehen. Bei den uebrigen Bereichen genuegt der
   * Sockel selbst als Motiv.
   */
  function focusCard(key, duration = 1.8) {
    if (exampleFlight.active) return;
    traceExecution({
      source: 'src/scene/stage.js',
      code: `focusCard(${JSON.stringify(key)}, ${Number(duration).toFixed(2)})`,
    });
    opened = key;
    if (view.mobile && mobileKeys.includes(key)) mobileSelection = mobileKeys.indexOf(key);
    mobileDots.hidden = true;
    cards.setOpened(key, true);
    // Ein laufender Orbit endet; der Rueckweg nimmt die kuerzere Richtung.
    orbit.dragging = false;
    orbit.yaw = wrapAngle(orbit.yaw);
    orbit.yawVelocity = 0;
    orbit.pitchVelocity = 0;
    const isDocument = isDocumentKey(key);
    setDollyGuide(isZoomableKey(key) && !readerOpen);
    syncDocumentInputHints();
    background.setDocumentOpen?.(false);
    applyBloom();

    if (isDocument || key === 'projekte') syncDocumentAspect();
    const document3d = isDocument ? cards.documentBounds(bounds) : key === 'projekte' ? cards.projectBounds(bounds) : cards.worldBounds(key, bounds);
    if (document3d.isEmpty()) return;

    const tan = halfFovTan();
    document3d.getCenter(focusCenter);
    document3d.getSize(focusSize);

    let distance;
    if (isDocument) {
      // Reserve space below the document for the pedestal title and subtitle.
      // The page geometry is unchanged; only the initial camera fit widens.
      const rect = docRect;
      const visibleHeightWorld = focusSize.y * 1.18 * (view.height / rect.height);
      const fitDistance = visibleHeightWorld / (2 * tan);
      distance = fitDistance * docZoom;
      visibleHeight = 2 * distance * tan;
      documentHeight = focusSize.y;
      focusCenter.y = document3d.max.y - focusSize.y * 0.5;
      // Blickpunkt etwas tiefer: die Seite sitzt hoeher im Bild, waehrend
      // unter ihr wieder ein Teil des Sockels sichtbar bleibt.
      focusCenter.y -= focusSize.y * 0.13;
      docBoundsMaxZ = document3d.max.z;
      docFitDistance = fitDistance;
      docHalfWidth = focusSize.x * 0.5;
      docZoomTarget = docZoom;
      updateDocumentLift();
    } else if (key === 'projekte') {
      // Use the same viewport height and headroom as the adjacent documents.
      docFitDistance = Math.max(focusSize.y * 1.18 * (view.height / docRect.height) / (2 * tan), focusSize.x * 1.16 / (2 * tan * view.aspect));
      docBoundsMaxZ = document3d.max.z;
      docHalfWidth = focusSize.x * .5;
      docZoomTarget = docZoom;
      scrollLiftTarget = 0;
      distance = docFitDistance * docZoom;
      visibleHeight = 2 * distance * tan;
      focusCenter.y -= focusSize.y * 0.13;
    } else {
      distance = Math.max(
        (focusSize.y * 1.2) / (2 * tan),
        (focusSize.x * 1.2) / (2 * tan * view.aspect),
        view.compact ? 8.5 : 7,
      );
      visibleHeight = 2 * distance * tan;
    }

    nextCam.set(focusCenter.x, focusCenter.y, document3d.max.z + distance);
    if (isZoomableKey(key)) {
      documentRouteCamera.copy(nextCam);
      documentRouteLook.copy(focusCenter);
    }
    cards.setHover(null);
    hovered = null;
    pointer.set(0, 0);
    drift.set(0, 0);
    syncCursor();
    moveView(nextCam, focusCenter, duration);
  }

  /* ---------- Dokument blaettern ---------- */

  function scrollDocument(pages) {
    if (!isDocumentKey(opened) || readerOpen) return false;
    cards.scrollDocument(pages);
    updateDocumentLift();
    onDocumentScroll?.(cards.documentScroll);
    return true;
  }

  /**
   * Zoomstufe multiplikativ: gleiche Radbewegung, gleicher Sprung. Statt
   * focusCard erneut aufzurufen (was Hover, Pointer und Look-At
   * zuruecksetzt), wird nur camPos.z per gsap verstoellt. Look-At und
   * Y-Position bleiben stabil — der Ausschnitt wandert nicht.
   */
  function takeOverDocumentCamera() {
    if (!viewMoving || !(docFitDistance > 0)) return;
    cancelViewMove();
    const currentDistance = Math.max(
      DOCUMENT_MIN_CLEARANCE,
      camPos.z - docBoundsMaxZ,
    );
    docZoom = currentDistance / docFitDistance;
    docZoomTarget = THREE.MathUtils.clamp(
      docZoom,
      DOCUMENT_ZOOM_MIN,
      DOCUMENT_ZOOM_MAX,
    );
  }

  function zoomDocument(step) {
    if (!isZoomableKey(opened) || readerOpen || !(docFitDistance > 0)) return;

    // Erst die tatsaechliche Radbewegung uebernimmt die Kamera. Ein blosses
    // Gedrueckthalten der linken Taste unterbricht die Anfahrt nicht.
    takeOverDocumentCamera();

    docZoomTarget = THREE.MathUtils.clamp(
      docZoomTarget * Math.exp(step),
      DOCUMENT_ZOOM_MIN,
      DOCUMENT_ZOOM_MAX,
    );
  }

  function beginDocumentPointerHold() {
    if (!isZoomableKey(opened) || readerOpen || !(docFitDistance > 0)) return;
    documentPointerHeld = true;
    setDollyGuide(true, true, null, 'pointer');
    canvas.style.cursor = 'ns-resize';
  }

  function endDocumentPointerHold() {
    documentPointerHeld = false;
    setDollyGuide(isZoomableKey(opened) && !readerOpen, false, null);
    canvas.style.cursor = '';
  }

  function onWheel(event) {
    if (exampleFlight.active) return;
    if (!isZoomableKey(opened) || readerOpen) return;
    // Keyboard controls follow the document after interacting with its canvas.
    canvas.focus({ preventScroll: true });
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 18
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? view.height
        : 1;
    const delta = event.deltaY * unit;
    if (!delta) return;
    event.preventDefault();
    if (drag) drag.wheelUsed = true;
    const scrolling = isDocumentKey(opened)
      && (documentPointerHeld || (event.buttons & 1) !== 0 || event.shiftKey)
      && !event.ctrlKey && !event.metaKey;
    if (!scrolling) {
      zoomDocument((delta / view.height) * DOCUMENT_WHEEL_SENSITIVITY);
      pulseDollyGuide(delta < 0 ? 'near' : 'far');
    } else {
      scrollDocument(delta / view.height);
    }
  }

  function onKeydown(event) {
    if (exampleFlight.active) return;
    if (!opened && event.target === canvas && ['Enter', ' '].includes(event.key)) {
      event.preventDefault(); listener?.('select', hovered || (view.mobile ? mobileKeys[mobileSelection] : 'projekte')); return;
    }
    if (view.mobile && !opened && ['ArrowLeft', 'ArrowRight'].includes(event.key) && (event.target === canvas || mobileDots.contains(event.target))) {
      event.preventDefault(); selectMobile(mobileSelection + (event.key === 'ArrowRight' ? 1 : -1)); return;
    }
    if (!isZoomableKey(opened) || readerOpen || event.defaultPrevented) return;
    const target = event.target;
    if (target instanceof HTMLElement
      && (target.closest('.ihk-hologram-film') || target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'VIDEO'].includes(target.tagName))) return;

    if (opened === 'projekte' && !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    switch (event.key) {
      case 'ArrowDown':
        zoomDocument(0.14);
        pulseDollyGuide('far', 'keyboard');
        break;
      case 'ArrowUp':
        zoomDocument(-0.14);
        pulseDollyGuide('near', 'keyboard');
        break;
      case 'PageDown': case ' ': scrollDocument(0.82); break;
      case 'PageUp': scrollDocument(-0.82); break;
      case 'Home': cards.setDocumentScroll(0); break;
      case 'End': cards.setDocumentScroll(1); break;
      default: return;
    }
    updateDocumentLift();
    event.preventDefault();
  }

  /* ---------- Zeiger ---------- */

  function updatePointerFromEvent(event) {
    const nx = ((event.clientX - view.left) / view.width) * 2 - 1;
    const ny = -(((event.clientY - view.top) / view.height) * 2 - 1);
    ndc.set(nx, ny);
    return { nx, ny };
  }

  function onPointerMove(event) {
    if (exampleFlight.active) return;
    const { nx, ny } = updatePointerFromEvent(event);

    if (event.pointerType === 'touch' && touchPoints.has(event.pointerId)) {
      touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (
      event.pointerType === 'touch'
      && pinchGesture
      && touchPoints.size >= 2
      && isZoomableKey(opened)
      && !readerOpen
    ) {
      event.preventDefault();
      const points = Array.from(touchPoints.values()).slice(0, 2);
      const distance = Math.max(
        1,
        Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
      );
      const previousTarget = docZoomTarget;
      docZoomTarget = THREE.MathUtils.clamp(
        pinchGesture.startZoom * pinchGesture.startDistance / distance,
        DOCUMENT_ZOOM_MIN,
        DOCUMENT_ZOOM_MAX,
      );
      if (Math.abs(previousTarget - docZoomTarget) > 0.002) {
        pulseDollyGuide(docZoomTarget < previousTarget ? 'near' : 'far');
      }
      pinchGesture.lastDistance = distance;
      return;
    }

    if (drag && drag.id === event.pointerId && view.mobile && !opened && event.pointerType === 'touch') {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) drag.moved = true;
      event.preventDefault(); return;
    }
    if (drag && drag.id === event.pointerId) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;

      if (!drag.moved) {
        const travel = Math.hypot(
          event.clientX - drag.startX,
          event.clientY - drag.startY,
        );

        if (travel > 6) {
          drag.moved = true;
          if (
            Math.abs(event.clientX - drag.startX)
            >= Math.abs(event.clientY - drag.startY)
          ) {
            drag.axis = 'x';
            if (isDocumentKey(opened)) {
              takeOverDocumentCamera();
              cards.beginResumeRotation();
            }
          } else {
            drag.axis = 'y';
          }
        }
      }

      if (drag.moved && isDocumentKey(opened)) {
        if (drag.axis === 'x') {
          cards.rotateResume(dx);
          if (Math.abs(dx) > 0.01) {
            pulseDollyGuide(dx < 0 ? 'left' : 'right');
          }
        } else if (drag.axis === 'y') {
          event.preventDefault();
          scrollDocument(-dy / view.height);
        }
      } else if (drag.moved && !opened) {
        // Ruhezustand: Ziehen dreht die Kamera um die Sockelreihe.
        if (!orbit.dragging) {
          orbit.dragging = true;
          syncCursor();
        }
        if (event.pointerType === 'touch') event.preventDefault();
        orbitBy(dx, dy);
      }
    }

    if (!reduced && !opened) pointer.set(nx, ny);
    background.setPointerNdc?.(nx, ny, !opened);
    if (!drag) syncCursor();
  }

  function onPointerLeave() {
    ndc.set(-2, -2);
    pointer.set(0, 0);
    background.setPointerNdc?.(0, 0, false);
    if (!orbit.dragging) syncCursor();
  }

  function onPointerDown(event) {
    if (exampleFlight.active) return;
    if (event.button !== 0 && event.pointerType !== 'touch') return;

    updatePointerFromEvent(event);

    if (
      event.pointerType === 'touch'
      && isZoomableKey(opened)
      && !readerOpen
    ) {
      touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPoints.size >= 2) {
        event.preventDefault();
        const points = Array.from(touchPoints.values()).slice(0, 2);
        const distance = Math.max(
          1,
          Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
        );
        takeOverDocumentCamera();
        pinchGesture = {
          startDistance: distance,
          lastDistance: distance,
          startZoom: docZoomTarget,
        };
        drag = null;
        cards.endResumeRotation();
        canvas.setPointerCapture?.(event.pointerId);
        return;
      }
    }

    const onDocument = isZoomableKey(opened) && hitsDocument();
    const canHoldDocument = event.button === 0
      && event.pointerType !== 'touch'
      && isZoomableKey(opened)
      && !readerOpen;

    drag = {
      id: event.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      wheelUsed: false,
      axis: null,
      onDocument,
    };

    if (canHoldDocument) beginDocumentPointerHold();
    canvas.setPointerCapture?.(event.pointerId);
  }

  function onPointerUp(event) {
    if (exampleFlight.active) return;
    if (event.pointerType === 'touch') {
      touchPoints.delete(event.pointerId);
      if (pinchGesture) {
        if (touchPoints.size < 2) pinchGesture = null;
        drag = null;
        cards.endResumeRotation();
        setDollyGuide(isZoomableKey(opened) && !readerOpen, false, null);
        return;
      }
    }

    if (!drag || drag.id !== event.pointerId) return;
    if (view.mobile && !opened && event.pointerType === 'touch' && drag.moved) {
      const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
      drag = null;
      if (event.type !== 'pointercancel' && Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) selectMobile(mobileSelection + (dx < 0 ? 1 : -1));
      return;
    }
    const { moved, wheelUsed, onDocument } = drag;
    drag = null;

    if (documentPointerHeld) endDocumentPointerHold();
    cards.endResumeRotation();
    endOrbit();

    if (moved || wheelUsed) return;
    // Resolve the actual click, even if it arrives before the next hover frame.
    updatePointerFromEvent(event);
    const selected = pick();
    if (selected) listener?.('select', selected);
    else if (opened && !onDocument) listener?.('select', 'home');
  }

  function onWindowBlur() {
    if (documentPointerHeld) endDocumentPointerHold();
    drag = null;
    pinchGesture = null;
    touchPoints.clear();
    cards.endResumeRotation();
    endOrbit();
  }

  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('blur', onWindowBlur);
  window.addEventListener('keydown', onKeydown);

  function hitsDocument() {
    if (ndc.x < -1.5) return false;
    const meshes = opened === 'projekte' ? ['example-preview', 'example-preview-systemintegration'].map(name => cards.group.getObjectByName(name)) : cards.documentPickables;
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(meshes.filter(mesh => mesh?.userData.key === opened && mesh.visible && mesh.parent.visible), false).length > 0;
  }

  function pick() {
    if (ndc.x < -1.5 || opened) return null;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([...cards.pickables, ...cards.group.getObjectsByProperty('name', 'card-label'), ...cards.documentPickables.filter((mesh) => mesh.visible)].filter(mesh => mesh.parent?.visible && mesh.parent?.parent?.visible !== false), false);
    return hits.length ? (hits[0].object.userData.key || hits[0].object.parent.parent.userData.key) : null;
  }

  function setRoute(target) {
    const [root, section] = String(target || '').split('/');
    if (!isDocumentKey(root)) return;
    cards.setDocumentSection(section || 'uebersicht');
    updateDocumentLift();
  }

  // Wenn das Modell nachtraeglich eintrifft oder sich das Fenster aendert,
  // wird das Zielbild einmalig nachgezogen.
  cards.onBoundsChange((key) => {
    // Eine nachtraegliche Modellmeldung darf eine bereits laufende
    // Kamerafahrt nicht abbrechen und neu starten.
    if (opened === key && !viewMoving) focusCard(key, 0.8);
  });

  /* ---------- Groesse ---------- */

  function applyBloom() {
    if (!bloom) return;
    const base = view.compact ? 1.22 : 1.62;
    // Opening a pedestal changes the camera, never the scene lighting.
    bloomBaseTarget = base;
  }

  let resizeFrame = 0;
  let inspectionFrozen = false;
  let inspectionResized = false;
  let projectionIdle = false;
  function resize() {
    resizeFrame = 0;
    const rect = canvas.getBoundingClientRect();
    view.left = rect.left;
    view.top = rect.top;
    view.width = Math.max(1, rect.width);
    view.height = Math.max(1, rect.height);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    view.aspect = w / h;
    camera.aspect = view.aspect;
    camera.updateProjectionMatrix();
    view.compact = view.aspect < 0.72;
    const wasMobile = view.mobile;
    view.mobile = matchMedia('(max-width: 600px)').matches;
    if (view.mobile && !wasMobile) {
      orbit.yaw = 0; orbit.pitch = 0; orbit.yawVelocity = 0; orbit.pitchVelocity = 0;
      orbit.dragging = false; pointer.set(0, 0); drift.set(0, 0);
    }
    syncDocumentInputHints();
    // Die Lesefassung erfaehrt jede Groessenaenderung, auch wenn der
    // Lebenslauf gerade nicht im Bild steht.
    syncDocumentAspect();

    if (view.compact) cards.setLayout({ spacing: 5.1, scale: 0.66, compact: true, stagger: 0.34 });
    else if (view.aspect < 1.15) cards.setLayout({ spacing: 6.2, scale: 0.72 });
    else cards.setLayout({ spacing: 8.6, scale: 0.9 });

    syncMobileHome();
    if (!opened && !exampleFlight.active && !introActive) { camPos.copy(HOME.cam); look.copy(HOME.look); }
    background.setCompact(view.compact);
    applyBloom();
    currentPixelRatio = Math.min(renderBudget.ratio(w, h), qualitySettled ? Infinity : 1);
    if (Math.abs(renderer.getPixelRatio() - currentPixelRatio) > .001) renderer.setPixelRatio(currentPixelRatio);
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    background.setPixelRatio(renderer.getPixelRatio());
    cards.setPixelRatio(renderer.getPixelRatio());
    if (inspectionFrozen || projectionIdle) {
      inspectionResized ||= inspectionFrozen;
      if (!document.hidden) {
        if (composer) composer.render(0);
        else renderer.render(scene, camera);
      }
    } else if (opened && !viewMoving && !exampleFlight.active) focusCard(opened, 0.65);
  }

  function settleQuality() {
    if (qualityUpgradeTimer || qualitySettled) return;
    qualityUpgradeTimer = window.setTimeout(() => {
      qualityUpgradeTimer = 0;
      qualitySettled = true;
      resize();
    }, 1100);
  }

  // ResizeObserver feuert waehrend CSS-Uebergaengen mehrfach je Bild.
  // Ein rAF-Sammelpunkt haelt Kamera und Composer davon unbeeindruckt.
  const ro = new ResizeObserver(() => {
    if (!resizeFrame) resizeFrame = requestAnimationFrame(resize);
  });
  ro.observe(canvas);
  resize();
  window.addEventListener('scroll', () => {
    const rect = canvas.getBoundingClientRect();
    view.left = rect.left;
    view.top = rect.top;
  }, { passive: true });

  /* ---------- Schleife ---------- */

  const timer = new THREE.Timer();
  timer.connect(document);      // verhindert Zeitspruenge nach Tabwechsel
  let raf = 0;
  let running = false;
  let lastFrameAt = 0;

  function frame(now = performance.now()) {
    raf = 0;
    if (!running || projectionIdle || inspectionFrozen || document.hidden) return;
    raf = requestAnimationFrame(frame);
    // Hold the last space frame behind a settled HTML project; the return flight resumes it.
    if (now - lastFrameAt < FRAME_BUDGET) return;
    if (qualitySettled && lastFrameAt && renderBudget.sample(now - lastFrameAt)) {
      if (bloom) bloom.mipmapBlurPass.levels = renderBudget.profile.bloomLevels;
      currentPixelRatio = renderBudget.ratio(view.width, view.height);
      renderer.setPixelRatio(currentPixelRatio);
      renderer.setSize(Math.floor(view.width), Math.floor(view.height), false);
      composer?.setSize(Math.floor(view.width), Math.floor(view.height));
      cards.setPixelRatio(currentPixelRatio); background.setPixelRatio(currentPixelRatio);
    }
    lastFrameAt = now;
    timer.update(now);
    const t = timer.getElapsed();
    const dt = timer.getDelta();

    background.update(t, dt);
    cards.update(t, dt);

    if (
      !exampleFlight.active
      && isZoomableKey(opened)
      && !readerOpen
      && !viewMoving
    ) {
      // Bei frontaler Ansicht darf die Kamera bis knapp vor die Flaeche.
      // Beim Drehen vergroessert sich der Mindestabstand automatisch um die
      // nach vorne ragende halbe Blattbreite.
      const rotationClearance =
        (isDocumentKey(opened) ? Math.abs(Math.sin(cards.documentRotation)) : 0) * docHalfWidth;
      const minimumDistance =
        Math.max(DOCUMENT_MIN_CLEARANCE, camera.near * 2.4)
        + rotationClearance;
      const requestedDistance = docFitDistance * docZoomTarget;
      const targetDistance = Math.max(requestedDistance, minimumDistance);
      const effectiveZoomTarget = targetDistance / docFitDistance;

      const dollyResponse = 1 - Math.pow(0.0035, Math.min(dt, 0.1));
      docZoom += (effectiveZoomTarget - docZoom) * dollyResponse;
      if (Math.abs(effectiveZoomTarget - docZoom) < 0.0004) {
        docZoom = effectiveZoomTarget;
      }

      const distance = docFitDistance * docZoom;
      const targetZ = docBoundsMaxZ + distance;
      camPos.x += (documentRouteCamera.x - camPos.x) * dollyResponse;
      camPos.y += (documentRouteCamera.y - camPos.y) * dollyResponse;
      camPos.z += (targetZ - camPos.z) * dollyResponse;
      look.lerp(documentRouteLook, dollyResponse);
      visibleHeight = 2 * distance * halfFovTan();
      if (isDocumentKey(opened)) updateDocumentLift();
    }

    if (bloom) {
      const bloomTarget = bloomBaseTarget + glitch * 2.0;
      const bloomResponse = 1 - Math.pow(
        0.045,
        Math.min(dt, 0.1),
      );
      bloom.intensity +=
        (bloomTarget - bloom.intensity) * bloomResponse;
    }

    mobileDots.hidden = !view.mobile || Boolean(opened) || introActive || exampleFlight.active;
    const next = orbit.dragging || exampleFlight.active ? null : pick();
    if (next !== hovered) {
      hovered = next;
      syncCursor();
      listener?.('hover', hovered);
    }
    cards.setHover(menuHover || (projectPreviewHover && opened === 'projekte' ? 'projekte' : hovered));

    if (!exampleFlight.active) {
      if (opened) drift.multiplyScalar(0.8);
      else drift.lerp(pointer, 0.018);
      scrollLift += (scrollLiftTarget - scrollLift) * (1 - Math.pow(0.01, Math.min(dt, 0.1)));
      camera.position.set(
        camPos.x + drift.x * 1.35,
        camPos.y + drift.y * 0.82 + scrollLift,
        camPos.z,
      );
      lookTarget.set(look.x, look.y + scrollLift, look.z);

      // Orbit: Kamera und Blickpunkt gemeinsam um die Sockelmitte drehen.
      if (!view.mobile) updateOrbit(Math.min(dt, 0.1));
      if (orbit.yaw !== 0 || orbit.pitch !== 0) {
        orbitEuler.set(-orbit.pitch, orbit.yaw, 0);
        orbitQuaternion.setFromEuler(orbitEuler);
        // Seitlich und von oben weicht die Kamera etwas zurueck, damit die ganze
        // Sockelreihe im Bild bleibt.
        const dolly = 1
          + 0.55 * Math.abs(Math.sin(orbit.yaw))
          + 0.30 * Math.max(0, orbit.pitch);
        camera.position.sub(ORBIT_PIVOT)
          .applyQuaternion(orbitQuaternion)
          .multiplyScalar(dolly)
          .add(ORBIT_PIVOT);
        lookTarget.sub(ORBIT_PIVOT).applyQuaternion(orbitQuaternion).add(ORBIT_PIVOT);
      }
      camera.lookAt(lookTarget);
    } else exampleFlight.update();

    cards.faceLabels(camera);
    if (composer) composer.render();
    else renderer.render(scene, camera);
    hologramFilm.update(cards.documentPickables.find(mesh => mesh.userData.key === 'abschluss'),
      camera, view.width, view.height, opened === 'abschluss' && !readerOpen && !exampleFlight.active);
    if (examplePreviewUpdate && opened === 'projekte' && !exampleFlight.active) {
      const wings = ['example-preview', 'example-preview-systemintegration'].map(name => {
        const mesh = cards.group.getObjectByName(name);
        const { width, height } = mesh.geometry.parameters;
        const corners = [[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y]) => {
          mesh.localToWorld(examplePreviewPoint.set(x*width/2,y*height/2,0)).project(camera);
          return { x:(examplePreviewPoint.x+1)*view.width/2, y:(1-examplePreviewPoint.y)*view.height/2 };
        });
        return { section:mesh.userData.section, corners };
      });
      examplePreviewUpdate({ wings, zoom: 1 / docZoom });
    }
  }

  return {
    scene, camera, renderer, composer, cards, background,
    ready: cards.ready,
    releaseModelReveal: () => cards.releaseModelReveal(),
    settleQuality,

    /** cb(event, key) mit event = 'hover' | 'select' */
    on(cb) { listener = cb; },
    setMenuHover(key) {
      if (menuHover === key) return;
      menuHover = key;
      cards.setHover(menuHover || (projectPreviewHover && opened === 'projekte' ? 'projekte' : hovered));
      cards.pulseMenuHover(key);
    },

    focusCard,
    toHome,
    exampleFlight,
    get renderQuality() { return renderBudget.profile.name; },
    get isRenderingPaused() { return projectionIdle || inspectionFrozen || !running || document.hidden; },
    setProjectionIdle(value) {
      projectionIdle = Boolean(value);
      cancelAnimationFrame(raf); raf = 0;
      timer.setTimescale(projectionIdle || inspectionFrozen ? 0 : 1); timer.reset();
      lastFrameAt = 0; renderBudget.reset();
      if (running && !projectionIdle && !inspectionFrozen && !document.hidden) frame();
      canvas.dispatchEvent(new Event('renderpausechange'));
    },
    setInspectionFrozen(value) {
      inspectionFrozen = Boolean(value);
      cancelAnimationFrame(raf); raf = 0;
      timer.setTimescale(inspectionFrozen || projectionIdle ? 0 : 1);
      if (inspectionFrozen) {
        // A resize may have cleared the drawing buffer just before the hover.
        // Redraw the current state once, without advancing any animation.
        if (composer) composer.render(0);
        else renderer.render(scene, camera);
      } else {
        timer.reset();
        if (inspectionResized) { inspectionResized = false; resize(); }
        lastFrameAt = 0; renderBudget.reset();
        if (running && !projectionIdle && !document.hidden) frame();
      }
      canvas.dispatchEvent(new Event('renderpausechange'));
    },
    get isMoving() { return viewMoving; },
    setExamplePreviewUpdate(callback) { examplePreviewUpdate = callback; },
    setProjectPreviewHover(value) { projectPreviewHover = Boolean(value); },
    zoomProjectPreview(step) {
      if (opened !== 'projekte' || exampleFlight.active || inspectionFrozen) return;
      zoomDocument(step); pulseDollyGuide(step < 0 ? 'near' : 'far');
    },
    setRoute,

    /** Blickwinkel im Ruhezustand direkt setzen (Bogenmass). */
    setOrbit(yaw = 0, pitch = 0) {
      orbit.yaw = Number(yaw) || 0;
      orbit.pitch = THREE.MathUtils.clamp(Number(pitch) || 0, ORBIT_PITCH_MIN, ORBIT_PITCH_MAX);
      orbit.yawVelocity = 0;
      orbit.pitchVelocity = 0;
    },
    setExplored(explored) {
      cards.setExplored(explored instanceof Set ? explored : new Set(explored || []));
    },

    /** Flaeche des Dokuments auf dem Schirm, in CSS-Pixeln. */
    documentRect() { return { ...docRect }; },

    /** Die flache Lesefassung uebernimmt Rad und Tasten, solange sie offen ist. */
    setReaderOpen(value) {
      readerOpen = Boolean(value);
      hologramFilm.setHidden(readerOpen);
      if (documentPointerHeld) endDocumentPointerHold();
      setDollyGuide(isZoomableKey(opened) && !readerOpen, false, null);
      syncDocumentInputHints();
      if (readerOpen) cards.endResumeRotation();
    },

    /**
     * Der Uebergang zwischen Projektion und Lesefassung.
     *
     * Die 3D-Projektion blendet kontrolliert ab, danach erscheint die
     * Lesefassung ohne zusaetzliche Spiral- oder DNA-Geometrie.
     */
    async beginReaderTransition(open, key = opened) {
      readerSequence += 1;
      const ticket = readerSequence;
      hologramFilm.setHidden(open);
      cards.setProjectionHidden(open, key);

      if (!open || reduced) return;

      await new Promise((resolve) => {
        window.setTimeout(resolve, 220);
      });
      if (ticket !== readerSequence) return;
    },

    /**
     * Stoerungsgrad 0..1: reisst Filmkorn und Bloom hoch, damit der
     * Intro-Glitch den ganzen Raum erfasst und nicht nur die Schrift.
     */
    setGlitch(v) {
      const amount = THREE.MathUtils.clamp(Number(v) || 0, 0, 1);
      glitch = amount;
      // Der NoiseEffect gehört dem absichtlichen Signalbruch. Im normalen
      // Betrieb ist der Pass vollständig transparent und flimmert nicht.
      if (noise) {
        noise.blendMode.opacity.value = amount > 0.001
          ? 0.06 + amount * 0.67
          : 0;
      }
      applyBloom();
    },

    /** Haken fuer die Intro-Sequenz, siehe src/ui/intro.js. */
    intro: {
      /** Vor dem ersten Bild: Kamera in die Tiefe, Runen glimmen voll. */
      begin() {
        introActive = true;
        camPos.set(HOME.cam.x, -1.3, 8.6);
        background.ambient.value = 1;
        background.setEffectsEnabled?.(false);
        background.setSymbolOnly(true);
        cards.setHologramReveal(0, true);
        cards.group.visible = false;
        cards.group.position.z = 0;
        cards.group.scale.setScalar(1);
      },
      /** Die Rueckfahrt auf die Ruheposition — der Raum oeffnet sich. */
      play(duration = 2.4) {
        gsap.to(camPos, {
          x: HOME.cam.x, y: HOME.cam.y, z: HOME.cam.z,
          duration, ease: 'power2.inOut', overwrite: 'auto',
        });
      },
      /** Erst nach Name und Bewusstseinsfeld kommt die Portfolio-Buehne zurueck. */
      revealWorld(duration = 1.6) {
        background.setSymbolOnly(false);
        cards.group.visible = true;
        cards.setHologramReveal(1);
        gsap.killTweensOf([cards.group.position, cards.group.scale]);
        cards.group.position.z = -18;
        cards.group.scale.setScalar(0.9);
        gsap.to(cards.group.position, { z: 0, duration, ease: 'power2.out' });
        gsap.to(cards.group.scale, { x: 1, y: 1, z: 1, duration, ease: 'power2.out' });
      },
      /** Skip und normaler Abschluss hinterlassen die Buehne im Ruhezustand. */
      finish({ preserveReveal = false } = {}) {
        introActive = false;
        syncMobileHome();
        // The delayed arrival may continue after the unchanged six-second title
        // sequence. Only skipping snaps it to the final pose.
        const revealing = preserveReveal && gsap.isTweening(cards.group.position);
        if (!revealing) gsap.killTweensOf([cards.group.position, cards.group.scale]);
        background.setSymbolOnly(false);
        background.setEffectsEnabled?.(true);
        cards.setHologramReveal(1, !revealing);
        cards.group.visible = true;
        if (!revealing) {
          cards.group.position.z = 0;
          cards.group.scale.setScalar(1);
        }
      },
      /** Kurzer Rueckstoss der Kamera, wenn der Schriftzug warpt. */
      recoil() {
        gsap.to(camPos, {
          z: HOME.cam.z + 1.5,
          duration: 0.55, ease: 'power2.out', yoyo: true, repeat: 1,
        });
      },
    },

    start() { if (!running) { running = true; timer.reset(); lastFrameAt = 0; renderBudget.reset(); frame(); canvas.dispatchEvent(new Event('renderpausechange')); } },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; canvas.dispatchEvent(new Event('renderpausechange')); },
    dispose() {
      this.stop();
      exampleFlight.dispose();
      unsubscribeMobileLanguage();
      mobileDots.removeEventListener('click', onMobileSelect);
      mobileDots.remove();
      examplePreviewUpdate = null;
      ro.disconnect();
      cancelAnimationFrame(resizeFrame);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('keydown', onKeydown);
      unsubscribeDocumentLanguage();
      gsap.killTweensOf([camPos, look, cards.group.position, cards.group.scale]);
      window.clearTimeout(dollyGuideTimer);
      window.clearTimeout(qualityUpgradeTimer);
      mobileZoom.removeEventListener('click', onMobileZoomClick);
      mobileZoom.remove();
      hologramFilm.dispose();
      keyboardZoomHint.remove();
      canvas.style.touchAction = '';
      dollyGuide.remove();
      timer.dispose();
      cards.dispose();
      background.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}
