import * as THREE from 'three';

export const CV_SVG_URL = new URL(
  '../../Elemente/lebenslauf.svg',
  import.meta.url,
).href;

export const CV_PAGE_COUNT = 2;
export const CV_PAGE_ASPECT = 1241 / (3786 / CV_PAGE_COUNT);

export const CV_ANCHORS = Object.freeze({
  uebersicht: 0,
  bildungsweg: 0.185,
  faehigkeiten: 0.355,
  kontakt: 0.415,
  arbeitsleben: 0.525,
});

const DESKTOP_MAX_WIDTH = 1241;
const COMPACT_MAX_WIDTH = 820;
const MAX_PIXELS = 5_200_000;
const LINK_BOX_FALLBACK = Object.freeze({ start: 0.56, end: 0.71 });

function chooseRasterSize(width, height, maxTextureSize, compact) {
  const aspect = width / height;
  const limit = Math.max(512, maxTextureSize || 4096);
  const target = Math.min(
    compact ? COMPACT_MAX_WIDTH : DESKTOP_MAX_WIDTH,
    width,
    limit,
    Math.floor(limit * aspect),
    Math.floor(Math.sqrt(MAX_PIXELS * aspect)),
  );
  const nextWidth = Math.max(1, target);
  return {
    width: nextWidth,
    height: Math.max(1, Math.round(nextWidth / aspect)),
  };
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

function isAmberPixel(r, g, b, a) {
  return a >= 42
    && r >= 70
    && g >= 42
    && r - b > 18
    && r - g > 4
    && g - b > 2
    && r > b * 1.05;
}

function longestAmberRun(pixels, width, y, xStart, xEnd) {
  let run = 0;
  let gap = 0;
  let longest = 0;

  for (let x = xStart; x < xEnd; x += 1) {
    const index = (y * width + x) * 4;
    const amber = isAmberPixel(
      pixels[index],
      pixels[index + 1],
      pixels[index + 2],
      pixels[index + 3],
    );

    if (amber) {
      run += gap + 1;
      gap = 0;
      longest = Math.max(longest, run);
    } else if (run > 0 && gap < 3) {
      gap += 1;
    } else {
      run = 0;
      gap = 0;
    }
  }

  return longest;
}

/**
 * Erkennt die zwei langen horizontalen Rahmenlinien des Linkkastens.
 * Bei abweichender Farbwiedergabe greift ein konservativer Ersatzbereich.
 */
function detectLinkBoxCut(context, width, height) {
  const pageHeight = Math.floor(height / CV_PAGE_COUNT);
  const fallback = {
    start: Math.round(pageHeight * LINK_BOX_FALLBACK.start),
    end: Math.round(pageHeight * LINK_BOX_FALLBACK.end),
    detected: false,
  };

  try {
    const pixels = context.getImageData(
      0,
      pageHeight,
      width,
      pageHeight,
    ).data;
    const xStart = Math.floor(width * 0.055);
    const xEnd = Math.ceil(width * 0.945);
    const yStart = Math.floor(pageHeight * 0.44);
    const yEnd = Math.ceil(pageHeight * 0.82);
    const minimumRun = width * 0.42;
    const groups = [];
    let group = null;

    for (let y = yStart; y < yEnd; y += 1) {
      const score = longestAmberRun(pixels, width, y, xStart, xEnd);

      if (score >= minimumRun) {
        if (!group) {
          group = { start: y, end: y, peakY: y, peak: score };
        } else {
          group.end = y;
          if (score > group.peak) {
            group.peak = score;
            group.peakY = y;
          }
        }
      } else if (group) {
        groups.push(group);
        group = null;
      }
    }
    if (group) groups.push(group);

    let best = null;
    for (let first = 0; first < groups.length; first += 1) {
      for (let second = first + 1; second < groups.length; second += 1) {
        const top = groups[first];
        const bottom = groups[second];
        const gap = bottom.peakY - top.peakY;
        if (gap < pageHeight * 0.035 || gap > pageHeight * 0.16) continue;

        const middle = (top.peakY + bottom.peakY) * 0.5 / pageHeight;
        const score = top.peak + bottom.peak
          - Math.abs(middle - 0.635) * width;

        if (!best || score > best.score) {
          best = { top, bottom, score };
        }
      }
    }

    if (!best) return fallback;

    const start = Math.max(
      0,
      best.top.start - Math.round(pageHeight * 0.012),
    );
    const end = Math.min(
      pageHeight,
      best.bottom.end + Math.round(pageHeight * 0.018),
    );
    const cutHeight = end - start;

    if (cutHeight < pageHeight * 0.055 || cutHeight > pageHeight * 0.2) {
      return fallback;
    }

    return { start, end, detected: true };
  } catch (error) {
    console.warn(
      'Linkkasten-Erkennung fehlgeschlagen; verwende Sicherheitsausschnitt.',
      error,
    );
    return fallback;
  }
}

/**
 * Nur die WebGL-Textur wird geändert:
 * Seite 1 bleibt unverändert, auf Seite 2 wird der Linkkasten entfernt und
 * alles darunter hochgerückt. PDF und Quelldatei bleiben unangetastet.
 */
function createWebProjectionCanvas(image, size) {
  const source = document.createElement('canvas');
  source.width = size.width;
  source.height = size.height;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) {
    throw new Error('Der Canvas-2D-Kontext ist nicht verfügbar.');
  }

  sourceContext.imageSmoothingEnabled = true;
  sourceContext.imageSmoothingQuality = 'high';
  sourceContext.drawImage(image, 0, 0, size.width, size.height);

  const cut = detectLinkBoxCut(sourceContext, size.width, size.height);
  const output = document.createElement('canvas');
  output.width = size.width;
  output.height = size.height;
  const context = output.getContext('2d');
  if (!context) {
    throw new Error('Der Canvas-2D-Kontext ist nicht verfügbar.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const pageHeight = Math.floor(size.height / CV_PAGE_COUNT);
  const pageTwoTop = pageHeight;

  context.drawImage(
    source,
    0, 0, size.width, pageHeight,
    0, 0, size.width, pageHeight,
  );
  context.drawImage(
    source,
    0, pageTwoTop, size.width, cut.start,
    0, pageTwoTop, size.width, cut.start,
  );

  const lowerHeight = Math.max(0, pageHeight - cut.end);
  if (lowerHeight > 0) {
    context.drawImage(
      source,
      0, pageTwoTop + cut.end, size.width, lowerHeight,
      0, pageTwoTop + cut.start, size.width, lowerHeight,
    );
  }

  console.info(
    `Webprojektion: Linkkasten ${cut.detected ? 'erkannt' : 'per Ersatzbereich'} entfernt.`,
    { start: cut.start / pageHeight, end: cut.end / pageHeight },
  );

  return output;
}

export function createResumeProjection({
  renderer,
  compact = false,
  reduced = false,
  idleOpacity = 0,
  onReady,
  onError,
} = {}) {
  const uniforms = {
    uMap: { value: null },
    uWindow: { value: 1 },
    uOffset: { value: 0 },
    uOpacity: { value: 0 },
    uFade: { value: new THREE.Vector2(0.085, 0.055) },
    uGlow: { value: 1.5 },
    uBias: { value: -0.65 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
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
      uniform float uWindow, uOffset, uOpacity, uGlow, uBias;
      uniform vec2 uFade;
      varying vec2 vUv;

      void main() {
        float v = 1.0 - uOffset - (1.0 - vUv.y) * uWindow;
        vec4 texel = texture2D(uMap, vec2(vUv.x, v), uBias);
        float fade = smoothstep(0.0, uFade.x, 1.0 - vUv.y)
          * smoothstep(0.0, uFade.y, vUv.y);
        float alpha = texel.a * fade * uOpacity;
        if (alpha < 0.004) discard;

        vec3 lifted = pow(clamp(texel.rgb, 0.0, 1.0), vec3(0.78));
        gl_FragColor = vec4(lifted * uGlow, alpha);
      }
    `,
  });

  const geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'resumeProjection';
  mesh.visible = false;
  mesh.frustumCulled = false;

  let texture = null;
  let aspect = null;
  let ready = false;
  let disposed = false;
  let open = false;
  let loadError = null;
  let loading = null;
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

  async function load() {
    if (loading) return loading;

    loading = (async () => {
      try {
        const image = await loadImage(CV_SVG_URL);
        await image.decode?.().catch(() => {});
        if (disposed) return false;

        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) {
          throw new Error('Die Lebenslauf-Vorlage hat keine nutzbaren Abmessungen.');
        }

        const size = chooseRasterSize(
          width,
          height,
          renderer?.capabilities?.maxTextureSize,
          compact,
        );
        const source = createWebProjectionCanvas(image, size);
        if (disposed) return false;

        texture = new THREE.Texture(source);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy =
          renderer?.capabilities?.getMaxAnisotropy?.() || 1;
        texture.needsUpdate = true;
        uniforms.uMap.value = texture;

        aspect = width / height;
        ready = true;
        mesh.visible = !hidden && (open || idle > 0);
        onReady?.({ aspect, texture });
        return true;
      } catch (error) {
        loadError = error;
        if (!disposed) onError?.(error);
        return false;
      }
    })();

    return loading;
  }

  load();

  return {
    mesh,
    get ready() { return ready; },
    get aspect() { return aspect; },
    get pageAspect() { return aspect ? aspect * CV_PAGE_COUNT : null; },
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
      geometry.dispose();
      material.dispose();
      texture?.dispose();
      texture = null;
      uniforms.uMap.value = null;
    },
  };
}
