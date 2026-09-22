import * as THREE from 'three';
import { getLanguage, onLanguageChange, t } from '../i18n.js';
import { LIGHT_PALETTE } from './palette.js';

const CARD_KEYS = Object.freeze(['abschluss', 'projekte', 'lebenslauf']);
const CARD_COPY = Object.freeze({
  abschluss: 'card.finalProject.title',
  projekte: 'card.projects.title',
  lebenslauf: 'card.cv.title',
});
const CARD_ACCENTS = Object.freeze({
  abschluss: LIGHT_PALETTE.fiberBlue,
  projekte: LIGHT_PALETTE.fiberBlue,
  lebenslauf: LIGHT_PALETTE.fiberBlue,
});

function hash(index, salt = 0) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

function makeEnergyReservoir(accent, seed, reduced) {
  const count = reduced ? 420 : 920;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const sizes = new Float32Array(count);
  const lanes = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    seeds[index * 4] = hash(index, seed + 1.1);
    seeds[index * 4 + 1] = hash(index, seed + 3.7);
    seeds[index * 4 + 2] = hash(index, seed + 7.9);
    seeds[index * 4 + 3] = hash(index, seed + 13.3);
    sizes[index] = 0.45 + Math.pow(hash(index, seed + 19.1), 2) * 1.9;
    lanes[index] = hash(index, seed + 27.7);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aLane', new THREE.BufferAttribute(lanes, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -6, 0), 6);

  const uniforms = {
    uTime: { value: 0 },
    uSurfaceY: { value: -5.25 },
    uBottomY: { value: -6.95 },
    uRadius: { value: 3.0 },
    uFrontZ: { value: 3.0 },
    uIntensity: { value: 0.42 },
    uPixelRatio: { value: 1 },
    uAccent: { value: new THREE.Color(accent) },
    uSeed: { value: seed },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      attribute vec4 aSeed;
      attribute float aSize, aLane;
      uniform float uTime, uSurfaceY, uBottomY, uRadius, uFrontZ;
      uniform float uIntensity, uPixelRatio, uSeed;
      varying float vLife, vLane, vHeat;

      void main() {
        float time = uTime * (0.52 + aSeed.w * 0.44) + uSeed * 17.0;
        float angle = aSeed.x * 6.2831853
          + sin(time * 0.73 + aSeed.z * 19.0) * 1.15
          + time * mix(-0.48, 0.52, aSeed.y);
        float radial = uRadius
          * (0.12 + sqrt(aSeed.y) * 0.82)
          * (0.72 + sin(time * 1.31 + aSeed.x * 31.0) * 0.18);

        float vertical = 0.5 + 0.5 * sin(
          time * (1.2 + aSeed.z * 1.7)
          + aSeed.x * 43.0
        );
        float y = mix(uBottomY + 0.08, uSurfaceY - 0.07, vertical);
        float churn = sin(time * 2.4 + aSeed.y * 57.0)
          + cos(time * 1.7 - aSeed.z * 41.0) * 0.62;

        vec3 p;
        p.x = cos(angle) * radial + churn * 0.08;
        p.z = sin(angle) * radial * 0.72
          + sin(time * 2.1 + aSeed.w * 73.0) * 0.12;
        p.y = y + churn * 0.035;

        // A subset repeatedly rushes towards the recessed front inscription.
        float gate = pow(max(0.0, sin(time * 0.84 + aLane * 12.0)), 9.0)
          * smoothstep(0.48, 0.88, aLane);
        p.x = mix(p.x, (aSeed.x - 0.5) * uRadius * 1.25, gate * 0.68);
        p.y = mix(p.y, mix(uBottomY, uSurfaceY, 0.48 + aSeed.z * 0.20), gate * 0.58);
        p.z = mix(p.z, uFrontZ - 0.12, gate * 0.82);

        float edgeFade = 1.0 - smoothstep(uRadius * 0.72, uRadius, length(p.xz));
        float capFade = smoothstep(uBottomY, uBottomY + 0.12, p.y)
          * (1.0 - smoothstep(uSurfaceY - 0.16, uSurfaceY, p.y));
        vLife = edgeFade * capFade;
        vLane = aLane;
        vHeat = gate;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize
          * (0.68 + gate * 1.7)
          * uPixelRatio
          * (30.0 / max(8.0, -mv.z))
          * (0.42 + uIntensity * 0.86);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uAccent;
      uniform float uIntensity;
      varying float vLife, vLane, vHeat;

      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float distanceToCentre = length(point);
        if (distanceToCentre > 0.5) discard;
        float core = smoothstep(0.5, 0.02, distanceToCentre);
        // COLOURED_PEDESTAL_ENERGY_V6_2_2
        vec3 cold = vec3(0.06, 0.70, 0.98);
        vec3 energised = mix(vec3(0.03, 0.80, 0.98), uAccent, 0.64);
        vec3 colour = mix(cold, uAccent, smoothstep(0.16, 0.88, vLane));
        colour = mix(colour, energised, vHeat * 0.58);
        float alpha = core * vLife
          * (0.018 + vHeat * 0.10)
          * uIntensity;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(colour * (0.82 + vHeat * 1.6), alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'pedestal-internal-energy';
  points.renderOrder = 7;
  points.frustumCulled = false;

  return { points, geometry, material, uniforms };
}

function splitLabel(label) {
  const words = String(label || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [words[0] || ''];
  const total = words.join('').length;
  let best = 1;
  let bestDelta = Infinity;
  for (let index = 1; index < words.length; index += 1) {
    const left = words.slice(0, index).join(' ').length;
    const delta = Math.abs(total * 0.5 - left);
    if (delta < bestDelta) {
      best = index;
      bestDelta = delta;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

function makeInscription(accent) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const geometry = new THREE.PlaneGeometry(4.8, 1.12);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'pedestal-recess-inscription';
  mesh.renderOrder = 8;

  // Neutral texture lets the material supply the current state colour.
  const colour = new THREE.Color(0xffffff);
  const brightColour = colour.clone();
  let currentLabel = '';

  function draw(label) {
    currentLabel = label;
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const css = colour.getStyle();
    const brightCss = brightColour.getStyle();
    const lines = splitLabel(label);
    const fontSize = lines.length > 1 ? 62 : 76;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 ${fontSize}px "Barlow Condensed", "Arial Narrow", sans-serif`;

    // A dim outer imprint reads as a machined recess while the sharp core
    // looks as if particles behind the metal are energising the letters.
    context.lineWidth = 9;
    context.strokeStyle = 'rgba(0, 0, 0, 0.92)';
    context.shadowColor = 'rgba(0, 0, 0, 0.95)';
    context.shadowBlur = 7;
    lines.forEach((line, index) => {
      const y = lines.length > 1 ? 100 + index * 68 : 128;
      context.strokeText(line, 512, y, 870);
    });

    context.lineWidth = 2.2;
    context.strokeStyle = css;
    context.fillStyle = brightCss;
    context.shadowColor = css;
    context.shadowBlur = 34;
    lines.forEach((line, index) => {
      const y = lines.length > 1 ? 100 + index * 68 : 128;
      context.strokeText(line, 512, y, 870);
      context.fillText(line, 512, y, 870);
    });

    context.shadowBlur = 0;
    context.globalAlpha = 0.42;
    context.fillStyle = css;
    context.fillRect(68, 34, 104, 2);
    context.fillRect(852, 34, 104, 2);
    context.fillRect(68, 220, 104, 2);
    context.fillRect(852, 220, 104, 2);
    context.globalAlpha = 1;
    texture.needsUpdate = true;
  }

  return {
    mesh,
    material,
    geometry,
    texture,
    draw,
    redraw() { draw(currentLabel); },
    dispose() {
      texture.dispose();
      material.dispose();
      geometry.dispose();
    },
  };
}

function findAnchor(holder, key) {
  const accentRing = holder.children.find((child) => child.isLine) || null;
  const hit = holder.children.find(
    (child) => child.isMesh && child.userData?.key === key,
  ) || null;

  let surfaceY = accentRing ? accentRing.position.y - 0.035 : -5.25;
  let bottomY = surfaceY - 1.72;
  let frontZ = 3.15;
  let radius = 3.05;

  if (hit?.geometry) {
    hit.geometry.computeBoundingBox();
    const bounds = hit.geometry.boundingBox;
    if (bounds) {
      bottomY = bounds.min.y + hit.position.y;
      frontZ = bounds.max.z + hit.position.z;
      radius = Math.max(2.4, Math.min(3.55, (bounds.max.x - bounds.min.x) * 0.46));
    }
  }

  if (!Number.isFinite(surfaceY)) surfaceY = -5.25;
  return { surfaceY, bottomY, frontZ, radius };
}

export function createPedestalEnergyField({ cards, renderer, reduced = false } = {}) {
  const root = cards?.group;
  if (!root) {
    return {
      update() {}, setRoute() {}, setReaderOpen() {}, pulseAll() {},
      setPixelRatio() {}, setLocale() {}, refreshAnchors() {}, dispose() {},
    };
  }

  const states = [];
  let activeRoot = 'home';
  let readerOpen = false;
  let globalPulseUntil = 0;
  let disposed = false;
  let language = getLanguage();

  CARD_KEYS.forEach((key, index) => {
    const holder = root.getObjectByName(`card-${key}`);
    if (!holder) return;
    const accent = CARD_ACCENTS[key];
    const reservoir = makeEnergyReservoir(accent, index + 1.37, reduced);
    const inscription = makeInscription(accent);
    const assembly = new THREE.Group();
    assembly.name = `pedestal-energy-${key}`;
    assembly.userData.kind = 'pedestal-energy-field';
    assembly.add(reservoir.points); // Titles live on the front; no recessed text overlay.
    holder.add(assembly);

    states.push({
      key,
      holder,
      assembly,
      reservoir,
      inscription,
      intensity: 0.36,
      target: 0.36,
      localPulse: 0,
    });
  });

  function redrawLabels() {
    language = getLanguage();
    for (const state of states) {
      state.inscription.draw(t(CARD_COPY[state.key]));
    }
  }

  function refreshAnchors() {
    if (disposed) return;
    for (const state of states) {
      const anchor = findAnchor(state.holder, state.key);
      const { uniforms } = state.reservoir;
      uniforms.uSurfaceY.value = anchor.surfaceY;
      uniforms.uBottomY.value = anchor.bottomY;
      uniforms.uRadius.value = anchor.radius;
      uniforms.uFrontZ.value = anchor.frontZ;
      const panelY = anchor.bottomY + (anchor.surfaceY - anchor.bottomY) * 0.47;
      state.inscription.mesh.position.set(0, panelY, anchor.frontZ + 0.035);
      state.inscription.mesh.scale.setScalar(Math.min(1, anchor.radius / 3.05));
    }
  }

  redrawLabels();
  refreshAnchors();
  cards.ready?.then(() => {
    refreshAnchors();
    window.setTimeout(refreshAnchors, 180);
  }).catch(() => {});

  const unsubscribeLanguage = onLanguageChange(() => {
    redrawLabels();
  });

  return {
    setRoute(route) {
      activeRoot = String(route || 'home').split('/')[0] || 'home';
      for (const state of states) {
        state.target = activeRoot === 'home'
          ? 0.40
          : state.key === activeRoot
            ? 0.96
            : 0.24;
        if (state.key === activeRoot) state.localPulse = 1;
      }
    },

    setReaderOpen(value) {
      readerOpen = Boolean(value);
    },

    pulseAll(duration = 1800) {
      globalPulseUntil = performance.now() + Math.max(300, duration);
      for (const state of states) state.localPulse = 1;
    },

    setPixelRatio(value) {
      const ratio = Math.max(0.5, Math.min(2, Number(value) || 1));
      for (const state of states) state.reservoir.uniforms.uPixelRatio.value = ratio;
    },

    setLocale() {
      redrawLabels();
    },

    refreshAnchors,

    update(elapsed, delta) {
      if (disposed) return;
      const dt = Math.min(0.1, Math.max(0, delta || 0));
      const response = reduced ? 1 : 1 - Math.pow(0.008, dt);
      const globalPulse = performance.now() < globalPulseUntil
        ? 0.5 + 0.5 * Math.sin(elapsed * 8.2)
        : 0;

      for (const state of states) {
        state.localPulse *= Math.pow(0.075, dt);
        const active = state.key === activeRoot;
        state.reservoir.uniforms.uAccent.value.lerp(new THREE.Color(active ? LIGHT_PALETTE.amber : LIGHT_PALETTE.fiberBlue), response);
        state.inscription.material.color.set(active ? LIGHT_PALETTE.amber : LIGHT_PALETTE.fiberBlue);
        const readerFactor = readerOpen && state.key === 'lebenslauf' ? 0.42 : 1;
        const pulseBoost = Math.max(globalPulse * 0.55, state.localPulse * 0.48);
        const target = Math.min(1.35, (state.target + pulseBoost) * readerFactor);
        state.intensity += (target - state.intensity) * response;
        state.reservoir.uniforms.uTime.value = reduced ? 0 : elapsed;
        state.reservoir.uniforms.uIntensity.value = state.intensity;
        state.inscription.material.opacity = Math.max(
          0.12,
          state.intensity * (0.44 + pulseBoost * 0.28),
        );
        state.inscription.mesh.scale.y = 1 + pulseBoost * 0.018;
      }
    },

    dispose() {
      disposed = true;
      unsubscribeLanguage();
      for (const state of states) {
        state.holder.remove(state.assembly);
        state.reservoir.geometry.dispose();
        state.reservoir.material.dispose();
        state.inscription.dispose();
        state.assembly.clear();
      }
      states.length = 0;
    },
  };
}
