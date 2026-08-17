import * as THREE from 'three';

/**
 * Die Lebenslauf-Projektion.
 *
 * Der Sockel wirft ein Dokumentfenster in den Raum: eine feste, aufrechte
 * Flaeche direkt ueber der Sockeloberkante. Das Dokument selbst ist deutlich
 * hoeher als dieses Fenster — es laeuft hindurch. Dadurch bleiben beim
 * Heranfahren immer beides im Bild: ein Stueck Lebenslauf und ein Stueck
 * Sockel. Was weiter unten im Dokument liegt, holt der Besucher durch
 * Scrollen nach oben.
 *
 * Bewusst nur eine Bildquelle: das Dokument wird genau einmal geladen und
 * genau einmal in eine Textur gelegt. Der Ausschnitt entsteht im Shader
 * (uOffset/uWindow), nicht durch neue Geometrie oder neue Texturen.
 */

export const CV_SVG_URL = new URL(
  '../../Elemente/lebenslauf.svg',
  import.meta.url,
).href;

/**
 * Seitenzahl der Vorlage. Das Dokumentfenster ist genau eine Seite hoch:
 * ungeoeffnet zeigt es die erste Seite als Vorschau, geoeffnet dieselbe Seite
 * gross, und ein voller Bildlauf blaettert auf die zweite Seite.
 */
export const CV_PAGE_COUNT = 2;

/**
 * Seitenverhaeltnis einer einzelnen Seite (Breite/Hoehe) aus den Abmessungen
 * von lebenslauf.svg: 1241 x 3786 px auf zwei Seiten. Der Wert wird gebraucht,
 * bevor die Vorlage geladen ist — Projektion und Lesefassung sollen von der
 * ersten Sekunde an dieselbe Flaeche einnehmen.
 */
export const CV_PAGE_ASPECT = 1241 / (3786 / CV_PAGE_COUNT);

/**
 * Ankerpunkte der Abschnitte als Anteil der Dokumenthoehe, von oben gemessen.
 * Sie folgen dem Seitenaufbau von lebenslauf.svg (zwei Seiten, 3786 px):
 * Kopf und Fokus, Bildungsweg, Faehigkeiten mit Interessen und persoenlichen
 * Angaben, danach Seite zwei mit dem Arbeitsleben.
 */
export const CV_ANCHORS = Object.freeze({
  uebersicht:   0,
  bildungsweg:  0.185,
  faehigkeiten: 0.355,
  kontakt:      0.415,
  arbeitsleben: 0.525,
});

const DESKTOP_MAX_WIDTH = 1241;   // native Breite der Vorlage, kein Nachschaerfen
const COMPACT_MAX_WIDTH = 820;
const MAX_PIXELS = 5_200_000;

/**
 * Nur fuer die Webprojektion:
 * Der Link-Hinweiskasten auf Seite zwei wird ausgelassen.
 *
 * Werte innerhalb der zweiten Seite:
 * 0 = Seitenkopf
 * 1 = Seitenfuss
 */
const WEB_PAGE2_CUT =
  new THREE.Vector2(
    0.755,
    0.89,
  );

/** Rasterziel: nativ, solange Hardware und Speicherbudget es zulassen. */
function chooseRasterSize(width, height, maxTextureSize, compact) {
  const aspect = width / height;
  const limit = Math.max(512, maxTextureSize || 4096);
  const target = Math.min(
    compact ? COMPACT_MAX_WIDTH : DESKTOP_MAX_WIDTH,
    width,
    limit,
    Math.floor(limit * aspect),               // Hoehe darf das Limit nicht reissen
    Math.floor(Math.sqrt(MAX_PIXELS * aspect)),
  );
  const nextWidth = Math.max(1, target);
  return { width: nextWidth, height: Math.max(1, Math.round(nextWidth / aspect)) };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Die Lebenslauf-Vorlage konnte nicht geladen werden.'));
    image.src = url;
  });
}

/** Nur wenn verkleinert werden muss, entsteht ueberhaupt ein Canvas. */
function rasterize(image, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Der Canvas-2D-Kontext ist nicht verfügbar.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, size.width, size.height);
  return canvas;
}

export function createResumeProjection({
  renderer,
  compact = false,
  reduced = false,
  // Ruhehelligkeit: das Dokument steht auch ungeoeffnet ueber dem Sockel,
  // nur zurueckgenommen — eine Vorschau, die zum Herantreten einlaedt.
  idleOpacity = 0,
  onReady,
  onError,
} = {}) {
  const uniforms = {
    uMap:     { value: null },
    uWindow:  { value: 1 },        // sichtbarer Anteil der Dokumenthoehe
    uOffset:  { value: 0 },        // oberer Rand des Fensters, 0..1-uWindow
    uOpacity: { value: 0 },
    uFade:    { value: new THREE.Vector2(0.085, 0.055) },  // oben, unten
    uGlow:     { value: 1.5 },
    uPage2Cut: { value: WEB_PAGE2_CUT.clone() },
    // Negative Detailstufe: die Textur wird eine halbe Mipmap-Stufe schaerfer
    // abgetastet, damit die Schrift vor dem dunklen Raum nicht verwaescht.
    uBias:    { value: -0.65 },
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

      uniform float
        uWindow,
        uOffset,
        uOpacity,
        uGlow,
        uBias;

      uniform vec2
        uFade,
        uPage2Cut;

      varying vec2 vUv;

      void main() {
        float v =
          1.0
          - uOffset
          - (1.0 - vUv.y)
            * uWindow;

        float sourceV = v;
        float webMask = 1.0;

        // Seite zwei liegt in der unteren Haelfte der Gesamttextur.
        //
        // Der Linkkasten bleibt Bestandteil von SVG/PDF.
        // Fuer die Webprojektion wird der entsprechende Streifen
        // uebersprungen.
        //
        // Der nachfolgende Inhalt rueckt dadurch unmittelbar hoch.
        if (v < 0.5) {
          float pageY =
            (0.5 - v)
            * 2.0;

          if (
            pageY
            >= uPage2Cut.x
          ) {
            float sourceY =
              pageY
              + (
                uPage2Cut.y
                - uPage2Cut.x
              );

            if (sourceY > 1.0) {
              webMask = 0.0;
            }

            sourceV =
              0.5
              - clamp(
                  sourceY,
                  0.0,
                  1.0
                )
                * 0.5;
          }
        }

        vec4 texel =
          texture2D(
            uMap,
            vec2(
              vUv.x,
              sourceV
            ),
            uBias
          );

        float fade =
          smoothstep(
            0.0,
            uFade.x,
            1.0 - vUv.y
          )
          *
          smoothstep(
            0.0,
            uFade.y,
            vUv.y
          );

        float alpha =
          texel.a
          * fade
          * uOpacity
          * webMask;

        if (alpha < 0.004) {
          discard;
        }

        vec3 lifted =
          pow(
            clamp(
              texel.rgb,
              0.0,
              1.0
            ),
            vec3(0.78)
          );

        gl_FragColor =
          vec4(
            lifted * uGlow,
            alpha
          );
      }
    `,
  });

  const geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'resumeProjection';
  mesh.visible = false;
  mesh.frustumCulled = false;

  let texture = null;
  let aspect = null;          // Breite/Hoehe des gesamten Dokuments
  let ready = false;
  let disposed = false;
  let open = false;
  let loadError = null;
  let loading = null;

  // Scrollzustand: Ziel und gedaempfter Istwert, damit das Blatt nicht ruckt.
  let scrollTarget = 0;
  let scroll = 0;
  // Fensterhoehe als Anteil der Dokumenthoehe, aus der Geometrie abgeleitet:
  // genau eine Seite.
  let baseFraction = 1;
  const idle = THREE.MathUtils.clamp(idleOpacity, 0, 1);
  let opacityTarget = idle;
  // Beim Wechsel zur Lesefassung tritt das Blatt bewusst langsamer ab, als
  // es sonst auf- und abblendet: der Uebergang soll gesehen werden.
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
        const source = size.width === width && size.height === height
          ? image
          : rasterize(image, size);
        if (disposed) return false;

        texture = new THREE.Texture(source);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = renderer?.capabilities?.getMaxAnisotropy?.() || 1;
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
    /** Breite geteilt durch Hoehe einer einzelnen Seite. */
    get pageAspect() { return aspect ? aspect * CV_PAGE_COUNT : null; },
    get error() { return loadError; },
    get scroll() { return scrollTarget; },

    /**
     * Legt den sichtbaren Ausschnitt fest.
     * @param windowHeight Fensterhoehe in Welteinheiten
     * @param windowWidth  Fensterbreite in Welteinheiten
     */
    setWindow(windowWidth, windowHeight) {
      if (!aspect) return;
      // Anteil der Dokumenthoehe, der bei gleicher Breite ins Fenster passt.
      baseFraction = THREE.MathUtils.clamp(
        (windowHeight / windowWidth) * aspect,
        0.02,
        1,
      );
      applyWindow();
    },

    /** 0 = Dokumentkopf, 1 = Dokumentende. */
    setScroll(value, immediate = false) {
      scrollTarget = THREE.MathUtils.clamp(value, 0, 1);
      if (immediate || reduced) {
        scroll = scrollTarget;
        applyScroll(scroll);
      }
    },

    /** Oberkante des Ausschnitts auf einen Anteil der Dokumenthoehe legen. */
    scrollToFraction(fraction, immediate = false) {
      const range = Math.max(0, 1 - uniforms.uWindow.value);
      this.setScroll(range > 0 ? fraction / range : 0, immediate);
    },

    /** Blaettern in Fensterhoehen: 1 = ein voller Ausschnitt weiter. */
    scrollByPages(pages) {
      const range = Math.max(0, 1 - uniforms.uWindow.value);
      if (range <= 0) return 0;
      this.setScroll(scrollTarget + (pages * uniforms.uWindow.value) / range);
      return scrollTarget;
    },

    /** Anteil der Dokumenthoehe, der gerade nicht ins Fenster passt. */
    get scrollRange() { return Math.max(0, 1 - uniforms.uWindow.value); },

    setOpen(value) {
      open = Boolean(value);
      applyOpacityTarget();
    },

    /**
     * Die Lesefassung steht an derselben Stelle: solange sie zu sehen ist,
     * blendet das Blatt vollstaendig ab, ohne seinen Zustand zu verlieren.
     */
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
      uniforms.uOpacity.value += (opacityTarget - uniforms.uOpacity.value) * fade;
      if (opacityTarget <= 0 && uniforms.uOpacity.value < 0.01) mesh.visible = false;
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
