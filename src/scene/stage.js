import * as THREE from 'three';
import gsap from 'gsap';
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, VignetteEffect, NoiseEffect, SMAAEffect,
  BlendFunction, KernelSize,
} from 'postprocessing';
import { createBackground } from './background.js';
import { createCards } from './cards.js';
import { CV_PAGE_ASPECT } from './resumeProjection.js';
import { LIGHT_PALETTE } from './palette.js';

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
  cam:  new THREE.Vector3(0, 0, 18),
  look: new THREE.Vector3(0, -3.5, -8),
};

// Projektion und Lesefassung nehmen genau dieselbe Flaeche ein: ein Rechteck
// im Seitenverhaeltnis der Vorlage, hoechstens DOC_MAX_PX breit, mit Rand zur
// Buehnenkante. Beide werden aus derselben Rechnung gespeist — die eine ueber
// das Kamera-Framing, die andere ueber zwei CSS-Variablen.
const DOC_MAX_PX = 640;
const DOC_GUTTER_X = 42;
const DOC_GUTTER_Y = 42;
// Kameraabstand beim geoeffneten Lebenslauf als Vielfaches des Zielbilds.
// Mausrad ohne Zusatztaste blaettert. Linke Maustaste halten plus Mausrad
// faehrt die Kamera entlang ihrer festen Blickachse vor und zurueck.
const DOCUMENT_ZOOM_DEFAULT = 1.08;
const DOCUMENT_ZOOM_MIN = 0.001;
const DOCUMENT_ZOOM_MAX = 2.1;
const DOCUMENT_WHEEL_SENSITIVITY = 1.65;
// Abstand zur Projektion bei frontaler Sicht. Der Wert liegt nur wenig ueber
// der Nah-Clippingebene; beim Drehen kommt automatisch die nach vorn ragende
// halbe Blattbreite hinzu, damit die Kamera nie im Blatt steckt.
const DOCUMENT_MIN_CLEARANCE = 0.24;
// Filmischer Takt statt maximaler Bildrate: rund 30 Bilder je Sekunde.
// Der Abzug verhindert, dass ein 60-Hz-Bildschirm auf 20 Hz einrastet.
const FRAME_BUDGET = 1000 / 30 - 3;

export function createStage(canvas, { onDocumentScroll, onDocumentRect } = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x03060a, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.38;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03060a, 0.0055);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  camera.position.copy(HOME.cam);

  const background = createBackground();
  background.setPixelRatio(renderer.getPixelRatio());
  scene.add(background.group);

  const cards = createCards({ renderer, reduced });
  cards.setPixelRatio(renderer.getPixelRatio());
  scene.add(cards.group);

  scene.add(new THREE.AmbientLight(0x294866, 1.12));
  const keyLight = new THREE.DirectionalLight(LIGHT_PALETTE.fiber, 1.48);
  keyLight.position.set(-6, 9, 12);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(LIGHT_PALETTE.fiberBlue, 20, 40, 2);
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
    noise.blendMode.opacity.value = 0.22;

    bloom = new BloomEffect({
      intensity: 1.62,
      luminanceThreshold: 0.12,
      luminanceSmoothing: 0.28,
      kernelSize: KernelSize.LARGE,
      mipmapBlur: true,
    });

    composer.addPass(new EffectPass(
      camera,
      bloom,
      new VignetteEffect({ offset: 0.28, darkness: 0.72 }),
      noise,
      new SMAAEffect(),
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

  let hovered = null;
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
  // Linke Maustaste auf der Projektion gedrueckt: das Mausrad faehrt
  // die Kamera, statt im Lebenslauf zu blaettern.
  let zoomHold = false;
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

  const guideHost = canvas.parentElement;
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

  function setDollyGuide(visible, active = false, direction = null) {
    dollyGuide.classList.toggle('is-visible', Boolean(visible));
    dollyGuide.classList.toggle('is-active', Boolean(active));
    dollyGuide.classList.toggle('is-near', direction === 'near');
    dollyGuide.classList.toggle('is-far', direction === 'far');
    dollyGuide.classList.toggle('is-left', direction === 'left');
    dollyGuide.classList.toggle('is-right', direction === 'right');
  }

  function pulseDollyGuide(direction) {
    window.clearTimeout(dollyGuideTimer);
    setDollyGuide(opened === 'lebenslauf' && !readerOpen, true, direction);
    dollyGuideTimer = window.setTimeout(() => {
      if (!zoomHold) {
        setDollyGuide(opened === 'lebenslauf' && !readerOpen, false, null);
      }
    }, 320);
  }

  function cancelViewMove() {
    viewMoveTicket += 1;
    gsap.killTweensOf([camPos, look]);
    viewMoving = false;
  }

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
  const docRect = { width: DOC_MAX_PX, height: DOC_MAX_PX / CV_PAGE_ASPECT };

  function measureDocumentRect() {
    const availableWidth = Math.max(220, view.width - DOC_GUTTER_X * 2);
    const availableHeight = Math.max(220, view.height - DOC_GUTTER_Y * 2);
    const width = Math.min(DOC_MAX_PX, availableWidth);
    const height = Math.min(width / CV_PAGE_ASPECT, availableHeight);
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

  function updateDocumentLift() {
    const overflow = Math.max(0, documentHeight - visibleHeight * 0.9);
    scrollLiftTarget = (0.5 - cards.documentScroll) * overflow;
  }

  /** Ruhezustand: alle drei Karten im Blick. */
  function toHome(duration = 0.95) {
    opened = null;
    cards.setOpened(null);
    background.setDocumentOpen?.(false);
    cards.setDocumentScroll(0, true);
    docZoom = DOCUMENT_ZOOM_DEFAULT;
    docZoomTarget = DOCUMENT_ZOOM_DEFAULT;
    zoomHold = false;
    setDollyGuide(false);
    scrollLiftTarget = 0;
    pointer.set(0, 0);
    moveView(HOME.cam, HOME.look, duration);
    canvas.style.cursor = '';
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
    opened = key;
    cards.setOpened(key, true);
    const isDocument = key === 'lebenslauf';
    setDollyGuide(isDocument && !readerOpen);
    background.setDocumentOpen?.(isDocument);
    applyBloom();

    if (isDocument) syncDocumentAspect();
    const document3d = isDocument ? cards.documentBounds(bounds) : cards.worldBounds(key, bounds);
    if (document3d.isEmpty()) return;

    const tan = halfFovTan();
    document3d.getCenter(focusCenter);
    document3d.getSize(focusSize);

    let distance;
    if (isDocument) {
      // Das Fenster deckt auf dem Schirm genau das Rechteck ab, in dem auch
      // die Lesefassung steht: der Wechsel zwischen beiden ist kein Groessen-
      // und kein Ortssprung.
      const rect = docRect;
      const visibleHeightWorld = focusSize.y * (view.height / rect.height);
      const fitDistance = visibleHeightWorld / (2 * tan);
      distance = fitDistance * docZoom;
      visibleHeight = 2 * distance * tan;
      documentHeight = focusSize.y;
      focusCenter.y = document3d.max.y - focusSize.y * 0.5;
      // Blickpunkt etwas tiefer: die Seite sitzt hoeher im Bild, waehrend
      // unter ihr wieder ein Teil des Sockels sichtbar bleibt.
      focusCenter.y -= focusSize.y * 0.04;
      docBoundsMaxZ = document3d.max.z;
      docFitDistance = fitDistance;
      docHalfWidth = focusSize.x * 0.5;
      docZoomTarget = docZoom;
      updateDocumentLift();
    } else {
      distance = Math.max(
        (focusSize.y * 1.2) / (2 * tan),
        (focusSize.x * 1.2) / (2 * tan * view.aspect),
        view.compact ? 8.5 : 7,
      );
      visibleHeight = 2 * distance * tan;
    }

    nextCam.set(focusCenter.x, focusCenter.y, document3d.max.z + distance);
    if (isDocument) {
      documentRouteCamera.copy(nextCam);
      documentRouteLook.copy(focusCenter);
    }
    cards.setHover(null);
    hovered = null;
    pointer.set(0, 0);
    drift.set(0, 0);
    canvas.style.cursor = '';
    moveView(nextCam, focusCenter, duration);
  }

  /* ---------- Dokument blaettern ---------- */

  function scrollDocument(pages) {
    if (opened !== 'lebenslauf' || readerOpen) return false;
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
    if (opened !== 'lebenslauf' || readerOpen || !(docFitDistance > 0)) return;

    // Erst die tatsaechliche Radbewegung uebernimmt die Kamera. Ein blosses
    // Gedrueckthalten der linken Taste unterbricht die Anfahrt nicht.
    takeOverDocumentCamera();

    docZoomTarget = THREE.MathUtils.clamp(
      docZoomTarget * Math.exp(step),
      DOCUMENT_ZOOM_MIN,
      DOCUMENT_ZOOM_MAX,
    );
  }

  function beginDocumentWheelZoom() {
    if (opened !== 'lebenslauf' || readerOpen || !(docFitDistance > 0)) return;
    zoomHold = true;
    setDollyGuide(true, true, null);
    canvas.style.cursor = 'ns-resize';
  }

  function endDocumentWheelZoom() {
    zoomHold = false;
    setDollyGuide(opened === 'lebenslauf' && !readerOpen, false, null);
    canvas.style.cursor = '';
  }

  function onWheel(event) {
    if (opened !== 'lebenslauf' || readerOpen) return;
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 18
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? view.height
        : 1;
    const delta = event.deltaY * unit;
    if (!delta) return;
    event.preventDefault();
    if (zoomHold) {
      if (drag) drag.wheelUsed = true;
      canvas.style.cursor = 'ns-resize';
      zoomDocument((delta / view.height) * DOCUMENT_WHEEL_SENSITIVITY);
      pulseDollyGuide(delta < 0 ? 'near' : 'far');
    } else {
      scrollDocument(delta / view.height);
    }
  }

  function onKeydown(event) {
    if (opened !== 'lebenslauf' || readerOpen || event.defaultPrevented) return;
    const target = event.target;
    if (target instanceof HTMLElement
      && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;

    switch (event.key) {
      case 'ArrowDown': scrollDocument(0.14); break;
      case 'ArrowUp': scrollDocument(-0.14); break;
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
    const { nx, ny } = updatePointerFromEvent(event);

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
            if (opened === 'lebenslauf') {
              takeOverDocumentCamera();
              cards.beginResumeRotation();
            }
          } else if (drag.pointerType === 'touch') {
            drag.axis = 'y';
          } else {
            // Bei der Maus bleibt die senkrechte Bewegung frei, weil die
            // Kamerafahrt ausschliesslich ueber das Mausrad erfolgt.
            drag.axis = 'hold';
          }
        }
      }

      if (drag.moved && opened === 'lebenslauf') {
        if (drag.axis === 'x') {
          cards.rotateResume(dx);
          if (Math.abs(dx) > 0.01) {
            pulseDollyGuide(dx < 0 ? 'left' : 'right');
          }
        } else if (drag.axis === 'y' && drag.pointerType === 'touch') {
          scrollDocument(-dy / view.height);
        }
      }
    }

    if (!reduced && !opened) pointer.set(nx, ny);
  }

  function onPointerLeave() {
    ndc.set(-2, -2);
    pointer.set(0, 0);
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;

    updatePointerFromEvent(event);
    const onDocument = opened === 'lebenslauf' && hitsDocument();
    const canWheelZoom = event.button === 0
      && event.pointerType !== 'touch'
      && opened === 'lebenslauf'
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

    if (canWheelZoom) beginDocumentWheelZoom();

    canvas.setPointerCapture?.(event.pointerId);
  }

  function onPointerUp(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const { moved, wheelUsed, onDocument } = drag;
    drag = null;

    if (zoomHold) endDocumentWheelZoom();
    cards.endResumeRotation();

    if (moved || wheelUsed) return;
    if (hovered) listener?.('select', hovered);
    // Ein Klick neben das Dokument fuehrt zurueck, ein Klick darauf nicht.
    else if (opened && !onDocument) listener?.('select', 'home');
  }

  function onWindowBlur() {
    if (zoomHold) endDocumentWheelZoom();
    drag = null;
    cards.endResumeRotation();
  }

  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('blur', onWindowBlur);
  window.addEventListener('keydown', onKeydown);

  function hitsDocument() {
    if (ndc.x < -1.5 || !cards.documentPickables.length) return false;
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(cards.documentPickables, false).length > 0;
  }

  function pick() {
    if (ndc.x < -1.5 || opened) return null;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(cards.pickables, false);
    return hits.length ? hits[0].object.userData.key : null;
  }

  function setRoute(target) {
    const [root, section] = String(target || '').split('/');
    if (root !== 'lebenslauf') return;
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
    bloomBaseTarget = opened === 'lebenslauf'
      ? base * 0.45
      : base;
  }

  let resizeFrame = 0;
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
    // Die Lesefassung erfaehrt jede Groessenaenderung, auch wenn der
    // Lebenslauf gerade nicht im Bild steht.
    syncDocumentAspect();

    HOME.cam.z = view.compact ? 34 : 18;
    if (!opened) {
      camPos.copy(HOME.cam);
      look.copy(HOME.look);
    }

    if (view.compact) cards.setLayout({ spacing: 5.1, scale: 0.66, compact: true, stagger: 0.34 });
    else if (view.aspect < 1.15) cards.setLayout({ spacing: 6.2, scale: 0.72 });
    else cards.setLayout({ spacing: 8.6, scale: 0.9 });

    background.setCompact(view.compact);
    applyBloom();
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    background.setPixelRatio(renderer.getPixelRatio());
    cards.setPixelRatio(renderer.getPixelRatio());
    if (opened && !viewMoving) focusCard(opened, 0.65);
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
    raf = requestAnimationFrame(frame);
    if (now - lastFrameAt < FRAME_BUDGET) return;
    lastFrameAt = now;
    timer.update(now);
    const t = timer.getElapsed();
    const dt = timer.getDelta();

    background.update(t, dt);
    cards.update(t, dt);

    if (
      opened === 'lebenslauf'
      && !readerOpen
      && !viewMoving
    ) {
      // Bei frontaler Ansicht darf die Kamera bis knapp vor die Flaeche.
      // Beim Drehen vergroessert sich der Mindestabstand automatisch um die
      // nach vorne ragende halbe Blattbreite.
      const rotationClearance =
        Math.abs(Math.sin(cards.documentRotation)) * docHalfWidth;
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
      updateDocumentLift();
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

    const next = pick();
    if (next !== hovered) {
      hovered = next;
      cards.setHover(hovered);
      canvas.style.cursor = hovered ? 'pointer' : '';
      listener?.('hover', hovered);
    }

    if (opened) drift.multiplyScalar(0.8);
    else drift.lerp(pointer, 0.018);
    scrollLift += (scrollLiftTarget - scrollLift) * (1 - Math.pow(0.01, Math.min(dt, 0.1)));
    camera.position.set(
      camPos.x + drift.x * 1.7,
      camPos.y + drift.y * 1.0 + scrollLift,
      camPos.z,
    );
    camera.lookAt(look.x, look.y + scrollLift, look.z);

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  return {
    scene, camera, renderer, composer, cards, background,
    ready: cards.ready,
    releaseModelReveal: () => cards.releaseModelReveal(),

    /** cb(event, key) mit event = 'hover' | 'select' */
    on(cb) { listener = cb; },

    focusCard,
    toHome,
    setRoute,
    setExplored(explored) {
      cards.setExplored(explored instanceof Set ? explored : new Set(explored || []));
    },

    /** Flaeche des Dokuments auf dem Schirm, in CSS-Pixeln. */
    documentRect() { return { ...docRect }; },

    /** Die flache Lesefassung uebernimmt Rad und Tasten, solange sie offen ist. */
    setReaderOpen(value) {
      readerOpen = Boolean(value);
      if (zoomHold) endDocumentWheelZoom();
      setDollyGuide(opened === 'lebenslauf' && !readerOpen, false, null);
      if (readerOpen) cards.endResumeRotation();
    },

    /**
     * Der Uebergang zwischen Projektion und Lesefassung.
     *
     * Die 3D-Projektion blendet kontrolliert ab, danach erscheint die
     * Lesefassung ohne zusaetzliche Spiral- oder DNA-Geometrie.
     */
    async beginReaderTransition(open) {
      readerSequence += 1;
      const ticket = readerSequence;
      cards.setProjectionHidden(open);

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
      glitch = v;
      if (noise) noise.blendMode.opacity.value = 0.22 + v * 0.65;
      applyBloom();
    },

    /** Haken fuer die Intro-Sequenz, siehe src/ui/intro.js. */
    intro: {
      /** Vor dem ersten Bild: Kamera in die Tiefe, Runen glimmen voll. */
      begin() {
        camPos.set(HOME.cam.x, -1.3, 8.6);
        background.ambient.value = 1;
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
      finish() {
        gsap.killTweensOf([cards.group.position, cards.group.scale]);
        background.setSymbolOnly(false);
        cards.setHologramReveal(1, true);
        cards.group.visible = true;
        cards.group.position.z = 0;
        cards.group.scale.setScalar(1);
      },
      /** Kurzer Rueckstoss der Kamera, wenn der Schriftzug warpt. */
      recoil() {
        gsap.to(camPos, {
          z: HOME.cam.z + 1.5,
          duration: 0.55, ease: 'power2.out', yoyo: true, repeat: 1,
        });
      },
    },

    start() { if (!running) { running = true; timer.reset(); frame(); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    dispose() {
      this.stop();
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
      gsap.killTweensOf([camPos, look, cards.group.position, cards.group.scale]);
      window.clearTimeout(dollyGuideTimer);
      dollyGuide.remove();
      timer.dispose();
      cards.dispose();
      background.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}
