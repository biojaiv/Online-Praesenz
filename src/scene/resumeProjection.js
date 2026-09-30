import * as THREE from 'three';
import { getLanguage, onLanguageChange } from '../i18n.js';
import { lightColor } from './palette.js';

import cvProjection from '../data/cvProjection.json';
import { chooseRasterSize } from './projectionSize.js';
import { processProjection } from './projectionProcessing.js';

// The original two-page document layout, exported locally without its portrait.
// Original SVGs and all downloadable source documents remain untouched.
export const CV_SVG_URL = '/cv/CV_Projection_DE.webp';
export const CV_EN_PROJECTION_URL = '/cv/CV_Projection_EN.webp';
export const CV_PAGE_COUNT = cvProjection.de.pageCount;
export const CV_PAGE_ASPECT = cvProjection.de.pageAspect;
export const CV_ANCHORS = Object.freeze(cvProjection.de.anchors);
const CV_SOURCES = Object.freeze(Object.fromEntries(['de', 'en'].map(language => [language, {
  ...cvProjection[language],
  url: `/cv/CV_Projection_${language.toUpperCase()}.webp`,
  webTransform: cvProjection[language].webTransform ?? false,
}])));

function cvSource(language = getLanguage()) {
  const source = CV_SOURCES[language];
  if (!source) throw new Error(`No CV projection source is registered for language: ${language}`);
  return source;
}

export function getCvPageCount(language = getLanguage()) {
  return cvSource(language).pageCount;
}

export function getCvPageAspect(language = getLanguage()) {
  return cvSource(language).pageAspect;
}

export function getCvAnchor(section, language = getLanguage()) {
  return cvSource(language).anchors[section] ?? 0;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(
      new Error('Die Lebenslauf-Vorlage konnte nicht geladen werden.'),
    );
    image.src = url;
  });
}


export function createResumeProjection({
  renderer,
  compact = false,
  reduced = false,
  idleOpacity = 0,
  onReady,
  onError,
  sourceForLanguage = cvSource,
  documentKey = 'lebenslauf',
} = {}) {
  const uniforms = {
    uMap: { value: null },
    uWindow: { value: 1 },
    uOffset: { value: 0 },
    uOpacity: { value: 0 },
    uFade: { value: new THREE.Vector2(0.085, 0.055) },
    uGlow: { value: 1.18 },
    uBias: { value: -0.65 },
    uSurface: { value: lightColor('deep') },
    // Scan line travelling down the document, as on the 30-second profile: one sweep of
    // about 3.6 s every 40 s. A light distortion follows it; both stay off with reduced motion.
    uScan: { value: -0.2 },
    uScanStrength: { value: reduced ? 0 : 1 },
    uTime: { value: 0 },
  };
  const SCAN_CYCLE = 40, SCAN_SWEEP = 3.6;
  // Documents start at different points of the cycle so they never sweep in unison.
  let scanClock = documentKey === 'abschluss' ? 14 : 30;

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform float uWindow, uOffset, uOpacity, uGlow, uBias, uScan, uScanStrength, uTime;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      uniform vec2 uFade;
      uniform vec3 uSurface;
      varying vec2 vUv;

      void main() {
        float v = 1.0 - uOffset - (1.0 - vUv.y) * uWindow;
        // Light hologram distortion: rows ripple where the scan line passes, a faint
        // shimmer stays, and very rarely a thin band slips sideways for a moment.
        float depth = (1.0 - vUv.y) - uScan;
        float scan = smoothstep(-0.14, 0.0, depth) * (1.0 - smoothstep(0.0, 0.006, depth));
        float ripple = sin(vUv.y * 240.0 + uTime * 9.0) * 0.0024 * scan;
        float shimmer = sin(vUv.y * 36.0 + uTime * 1.4) * 0.00035;
        float slot = floor(uTime * 6.0);
        float band = step(0.985, hash(slot)) * step(abs(vUv.y - hash(slot + 7.0)), 0.012);
        float offsetX = (ripple + shimmer + band * (hash(slot + 3.0) - 0.5) * 0.012) * uScanStrength;
        vec4 texel = texture2D(uMap, vec2(vUv.x + offsetX, v), uBias);
        float topFade = smoothstep(0.0, uFade.x, 1.0 - vUv.y);
        float bottomFade = smoothstep(0.0, uFade.y, vUv.y);
        float fade = topFade * bottomFade;
        if (uOpacity < 0.004) discard;

        vec3 lifted = pow(clamp(texel.rgb, 0.0, 1.0), vec3(0.90));
        // Fade the ink into the dark surface at the scrolling edges, rather
        // than revealing the animated scene through the document.
        vec3 ink = clamp(lifted * uGlow, 0.0, 1.0);
        vec3 colour = mix(uSurface, ink, texel.a * fade);
        // Soft trailing glow above a crisp leading edge, moving from top to bottom.
        colour += vec3(0.50, 0.85, 1.0) * scan * 0.07 * uScanStrength;
        gl_FragColor = vec4(colour, uOpacity);
      }
    `,
  });

  const geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  // Existing hologram enhancement discovery uses this shared mesh name.
  mesh.name = 'resumeProjection';
  mesh.userData.key = documentKey;
  mesh.visible = false;
  mesh.frustumCulled = false;

  let texture = null;
  let aspect = null;
  let ready = false;
  let disposed = false;
  let open = false;
  let loadError = null;
  let loading = null;
  let sourceLanguage = getLanguage();
  let pageCount = sourceForLanguage(sourceLanguage).pageCount;
  let loadRevision = 0;
  let scrollTarget = 0;
  let scroll = 0;
  let baseFraction = 1;
  const idle = THREE.MathUtils.clamp(idleOpacity, 0, 1);
  let opacityTarget = idle;
  let fadeBase = 0.02;
  let hidden = false;

  function applyScroll(value) {
    const range = Math.max(0, 1 - uniforms.uWindow.value);
    uniforms.uOffset.value = value * range;
  }

  function applyOpacityTarget() {
    opacityTarget = hidden ? 0 : (open ? 1 : idle);
    if (ready && opacityTarget > 0) mesh.visible = true;

    if (reduced) {
      uniforms.uOpacity.value = opacityTarget;
      mesh.visible = ready && opacityTarget > 0;
    }
  }

  function applyWindow() {
    uniforms.uWindow.value = THREE.MathUtils.clamp(baseFraction, 0.015, 1);
    applyScroll(scroll);
  }

  async function load(language = getLanguage()) {
    const source = sourceForLanguage(language);
    // White-page English raster needs less shader gain than the already
    // transparency-processed German web projection.
    // Etwas mehr Zeichnung als frueher: das Blatt soll vor der dunklen
    // Maschine hell und lesbar stehen.
    uniforms.uGlow.value = language === 'en' ? 1.14 : 1.18;
    const revision = ++loadRevision;
    sourceLanguage = language;
    pageCount = source.pageCount;
    ready = false;
    loadError = null;
    mesh.visible = false;
    uniforms.uOpacity.value = 0;

    loading = (async () => {
      try {
        const image = await loadImage(source.url);
        await image.decode?.().catch(() => {});
        if (disposed || revision !== loadRevision) return false;
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) throw new Error('The projection source has no usable dimensions.');
        const size = chooseRasterSize(width, height, renderer?.capabilities?.maxTextureSize, compact);
        const canvas = await processProjection(image, size, source, documentKey);
        if (disposed || revision !== loadRevision) return false;

        const nextTexture = new THREE.Texture(canvas);
        nextTexture.colorSpace = THREE.SRGBColorSpace;
        nextTexture.wrapS = nextTexture.wrapT = THREE.ClampToEdgeWrapping;
        nextTexture.minFilter = THREE.LinearMipmapLinearFilter;
        nextTexture.magFilter = THREE.LinearFilter;
        nextTexture.generateMipmaps = true;
        nextTexture.anisotropy =
          renderer?.capabilities?.getMaxAnisotropy?.() || 1;
        nextTexture.needsUpdate = true;

        texture?.dispose();
        texture = nextTexture;
        uniforms.uMap.value = texture;
        aspect = width / height;
        pageCount = source.pageCount;
        sourceLanguage = language;
        ready = true;
        applyScroll(scroll);
        onReady?.({
          aspect,
          texture,
          pageCount,
          language: sourceLanguage,
        });
        applyOpacityTarget();
        return true;
      } catch (error) {
        if (revision === loadRevision) {
          loadError = error;
          ready = false;
          mesh.visible = false;
          if (!disposed) onError?.(error);
        }
        return false;
      }
    })();

    return loading;
  }

  // Hide the old-language texture immediately. The other-language projection
  // is never used as a fallback, so a language switch cannot expose a mixed
  // DE/EN document state even for one rendered frame.
  const unsubscribeLanguage = onLanguageChange((nextLanguage) => {
    if (disposed || nextLanguage === sourceLanguage) return;
    load(nextLanguage);
  });

  load(sourceLanguage);

  return {
    mesh,
    get ready() { return ready; },
    get aspect() { return aspect; },
    get language() { return sourceLanguage; },
    get pageCount() { return pageCount; },
    get pageAspect() {
      return aspect ? aspect * pageCount : sourceForLanguage(sourceLanguage).pageAspect;
    },
    get error() { return loadError; },
    get scroll() { return scrollTarget; },

    setWindow(windowWidth, windowHeight) {
      if (!aspect || !(windowWidth > 0)) return;
      baseFraction = THREE.MathUtils.clamp(
        (windowHeight / windowWidth) * aspect,
        0.02,
        1,
      );
      applyWindow();
    },

    setScroll(value, immediate = false) {
      scrollTarget = THREE.MathUtils.clamp(value, 0, 1);
      if (immediate || reduced) {
        scroll = scrollTarget;
        applyScroll(scroll);
      }
    },

    scrollToFraction(fraction, immediate = false) {
      const range = Math.max(0, 1 - uniforms.uWindow.value);
      this.setScroll(range > 0 ? fraction / range : 0, immediate);
    },

    scrollByPages(pages) {
      const range = Math.max(0, 1 - uniforms.uWindow.value);
      if (range <= 0) return 0;
      this.setScroll(
        scrollTarget + (pages * uniforms.uWindow.value) / range,
      );
      return scrollTarget;
    },

    get scrollRange() {
      return Math.max(0, 1 - uniforms.uWindow.value);
    },

    setOpen(value) {
      open = Boolean(value);
      applyOpacityTarget();
    },

    setHidden(value) {
      hidden = Boolean(value);
      fadeBase = hidden ? 0.25 : 0.12;
      applyOpacityTarget();
    },

    update(delta) {
      if (!ready) return;
      if (uniforms.uScanStrength.value > 0) {
        const dt = Math.min(delta, 0.1);
        scanClock = (scanClock + dt) % SCAN_CYCLE;
        uniforms.uTime.value += dt;
        // -0.2 … 1.2 during the sweep, then parked below the document until the next pass.
        uniforms.uScan.value = scanClock < SCAN_SWEEP ? -0.2 + 1.4 * scanClock / SCAN_SWEEP : 1.3;
      }

      const step = 1 - Math.pow(0.0025, Math.min(delta, 0.1));
      if (scroll !== scrollTarget) {
        scroll += (scrollTarget - scroll) * step;
        if (Math.abs(scrollTarget - scroll) < 0.0004) scroll = scrollTarget;
        applyScroll(scroll);
      }

      const fade = 1 - Math.pow(fadeBase, Math.min(delta, 0.1));
      uniforms.uOpacity.value +=
        (opacityTarget - uniforms.uOpacity.value) * fade;
      if (opacityTarget <= 0 && uniforms.uOpacity.value < 0.01) {
        mesh.visible = false;
      }
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      loadRevision += 1;
      unsubscribeLanguage();
      geometry.dispose();
      material.dispose();
      texture?.dispose();
      texture = null;
      uniforms.uMap.value = null;
    },
  };
}
