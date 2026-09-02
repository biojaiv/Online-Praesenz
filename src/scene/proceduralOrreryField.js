import * as THREE from 'three';
import { lightColor } from './palette.js';

const SOURCE_URL = new URL(
  '../../Elemente/Orrery/orrery-source.png',
  import.meta.url,
).href;

const TWO_PI = Math.PI * 2;
const SOURCE_CENTER = new THREE.Vector2(0.505, 0.515);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const TEMP_START = new THREE.Vector3();
const TEMP_END = new THREE.Vector3();
const TEMP_MID = new THREE.Vector3();
const TEMP_DIR = new THREE.Vector3();
const TEMP_SCALE = new THREE.Vector3();
const TEMP_QUAT = new THREE.Quaternion();
const TEMP_MATRIX = new THREE.Matrix4();

const PALETTE = Object.freeze({
  blue: lightColor('fiberBlue'),
  cyan: lightColor('fiber'),
  violet: lightColor('violet'),
  amber: lightColor('amber'),
  red: lightColor('signal'),
});

// The image remains the detailed visual source. These masks only split the
// same texture into spatially separated rings and sectors; no derivative image
// or mask file is generated.
const DETAIL_LAYERS = Object.freeze([
  {
    name: 'core', inner: 0.00, outer: 0.195,
    sector: 0, sectorWidth: TWO_PI, z: -31.0,
    size: 47, speed: 0.0038, phase: 1.4,
    tintA: 'amber', tintB: 'cyan', baseAlpha: 0.030,
  },
  {
    name: 'inner-ring', inner: 0.155, outer: 0.335,
    sector: 0, sectorWidth: TWO_PI, z: -31.7,
    size: 48, speed: -0.0027, phase: 5.1,
    tintA: 'blue', tintB: 'amber', baseAlpha: 0.026,
  },
  {
    name: 'mid-ring', inner: 0.295, outer: 0.510,
    sector: 0, sectorWidth: TWO_PI, z: -32.5,
    size: 49, speed: 0.0019, phase: 9.8,
    tintA: 'violet', tintB: 'cyan', baseAlpha: 0.024,
  },
  {
    name: 'outer-ring', inner: 0.465, outer: 0.805,
    sector: 0, sectorWidth: TWO_PI, z: -33.4,
    size: 50.5, speed: -0.00105, phase: 14.2,
    tintA: 'amber', tintB: 'blue', baseAlpha: 0.020,
  },
]);

const FRAGMENT_LAYERS = Object.freeze([
  {
    name: 'upper-left-world', x: -20.7, y: 8.4, z: -43.0,
    size: 31, scale: 0.62, rotation: -0.26,
    inner: 0.16, outer: 0.83, sector: 2.45, sectorWidth: 1.38,
    speed: 0.00082, phase: 3.7, tintA: 'blue', tintB: 'violet',
  },
  {
    name: 'upper-right-world', x: 21.8, y: 7.0, z: -48.0,
    size: 32, scale: 0.66, rotation: 0.31,
    inner: 0.16, outer: 0.84, sector: -0.52, sectorWidth: 1.34,
    speed: -0.00074, phase: 8.3, tintA: 'amber', tintB: 'violet',
  },
  {
    name: 'lower-left-world', x: -19.4, y: -10.0, z: -55.0,
    size: 30, scale: 0.54, rotation: 0.37,
    inner: 0.22, outer: 0.86, sector: -2.34, sectorWidth: 1.46,
    speed: 0.00061, phase: 13.1, tintA: 'violet', tintB: 'blue',
  },
  {
    name: 'lower-right-world', x: 19.9, y: -10.4, z: -51.5,
    size: 30, scale: 0.57, rotation: -0.34,
    inner: 0.20, outer: 0.85, sector: 0.86, sectorWidth: 1.42,
    speed: -0.00058, phase: 17.6, tintA: 'red', tintB: 'amber',
  },
]);

const RING_RADII = Object.freeze([4.8, 6.4, 8.3, 10.7, 13.5, 16.4, 19.6]);
const RING_SPEEDS = Object.freeze([0.031, -0.023, 0.017, -0.012, 0.0082, -0.0054, 0.0034]);
const EVENT_CYCLE = 21.0;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smooth01(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function setCylinderBetween(instanced, index, start, end, radius = 1) {
  TEMP_MID.copy(start).add(end).multiplyScalar(0.5);
  TEMP_DIR.copy(end).sub(start);
  const length = Math.max(0.001, TEMP_DIR.length());
  TEMP_DIR.normalize();
  TEMP_QUAT.setFromUnitVectors(Y_AXIS, TEMP_DIR);
  TEMP_SCALE.set(radius, length, radius);
  TEMP_MATRIX.compose(TEMP_MID, TEMP_QUAT, TEMP_SCALE);
  instanced.setMatrixAt(index, TEMP_MATRIX);
}

function makeTransparentTexture() {
  const data = new Uint8Array([0, 0, 0, 0]);
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

function configureTexture(texture, renderer) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = Math.min(
    4,
    renderer?.capabilities?.getMaxAnisotropy?.() || 4,
  );
  texture.needsUpdate = true;
}

function tint(name) {
  return PALETTE[name]?.clone?.() || PALETTE.blue.clone();
}

function makeImprintMaterial(texture, spec, mode = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
      uTime: { value: 0 },
      uVisibility: { value: 0 },
      uLayerReveal: { value: 0 },
      uCompact: { value: 0 },
      uFocus: { value: 0 },
      uManualBurst: { value: 0 },
      uPointer: { value: new THREE.Vector2(-2, -2) },
      uPointerActive: { value: 0 },
      uSourceCenter: { value: SOURCE_CENTER.clone() },
      uInner: { value: spec.inner ?? 0 },
      uOuter: { value: spec.outer ?? 0.82 },
      uSector: { value: spec.sector ?? 0 },
      uSectorWidth: { value: spec.sectorWidth ?? TWO_PI },
      uPhase: { value: spec.phase ?? 0 },
      uBaseAlpha: { value: spec.baseAlpha ?? 0.018 },
      uTintA: { value: tint(spec.tintA || 'blue') },
      uTintB: { value: tint(spec.tintB || 'amber') },
      uMode: { value: mode },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      uniform float uTime, uPhase, uMode;
      varying vec2 vUv;
      varying float vDepthPulse;

      void main() {
        vUv = uv;
        vec3 p = position;
        float wave = sin(uTime * 0.045 + uPhase + position.x * 0.035 + position.y * 0.028);
        p.z += wave * mix(0.018, 0.055, step(0.5, uMode));
        vDepthPulse = 0.5 + 0.5 * wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec2 uTexel, uPointer, uSourceCenter;
      uniform vec3 uTintA, uTintB;
      uniform float uTime, uVisibility, uLayerReveal, uCompact, uFocus;
      uniform float uManualBurst, uPointerActive, uInner, uOuter;
      uniform float uSector, uSectorWidth, uPhase, uBaseAlpha, uMode;
      varying vec2 vUv;
      varying float vDepthPulse;

      float luma(vec3 colour) {
        return dot(colour, vec3(0.2126, 0.7152, 0.0722));
      }

      float circularDistance(float a, float b) {
        return abs(atan(sin(a - b), cos(a - b)));
      }

      float eventEnvelope(float time, float phase) {
        float cycle = mod(time + phase, ${EVENT_CYCLE.toFixed(1)});
        float rise = smoothstep(1.55, 2.85, cycle);
        float fall = 1.0 - smoothstep(7.25, 10.4, cycle);
        return rise * fall;
      }

      void main() {
        vec4 source = texture2D(uMap, vUv);
        float centre = luma(source.rgb);
        float left = luma(texture2D(uMap, clamp(vUv - vec2(uTexel.x, 0.0), 0.0, 1.0)).rgb);
        float right = luma(texture2D(uMap, clamp(vUv + vec2(uTexel.x, 0.0), 0.0, 1.0)).rgb);
        float down = luma(texture2D(uMap, clamp(vUv - vec2(0.0, uTexel.y), 0.0, 1.0)).rgb);
        float up = luma(texture2D(uMap, clamp(vUv + vec2(0.0, uTexel.y), 0.0, 1.0)).rgb);
        float edge = abs(right - left) + abs(up - down);
        float chroma = max(source.r, max(source.g, source.b))
          - min(source.r, min(source.g, source.b));

        // Smooth near-white image background is discarded. Dark mechanics,
        // coloured metal and bright hairline edges survive entirely on the GPU.
        float darkStructure = smoothstep(0.035, 0.64, 0.925 - centre);
        float edgeStructure = smoothstep(0.012, 0.115, edge);
        float colourStructure = smoothstep(0.018, 0.155, chroma);
        float warmMetal = smoothstep(0.018, 0.15, source.r - source.b)
          * smoothstep(0.38, 0.90, centre);
        float structure = clamp(max(
          darkStructure * 0.88,
          max(edgeStructure, max(colourStructure * 0.78, warmMetal * 0.90))
        ), 0.0, 1.0);
        if (centre > 0.80 && chroma < 0.052 && edge < 0.022) structure *= 0.035;

        vec2 p = vUv - uSourceCenter;
        float radius = length(p);
        float angle = atan(p.y, p.x);
        float radialMask = smoothstep(uInner - 0.022, uInner + 0.014, radius)
          * (1.0 - smoothstep(uOuter - 0.020, uOuter + 0.018, radius));
        float sectorMask = uSectorWidth > 6.0
          ? 1.0
          : 1.0 - smoothstep(
              uSectorWidth * 0.47,
              uSectorWidth * 0.57,
              circularDistance(angle, uSector)
            );
        float mask = structure * radialMask * sectorMask;
        if (mask < 0.002) discard;

        float event = eventEnvelope(uTime, uPhase);
        float direction = mod(uPhase, 2.0) < 1.0 ? 1.0 : -1.0;
        float head = direction * uTime * (0.080 + mod(uPhase, 4.0) * 0.004) + uPhase * 0.43;
        float angularHead = 1.0 - smoothstep(0.11, 0.58, circularDistance(angle, head));
        float radialHeadPosition = mix(
          max(uInner, 0.035),
          uOuter,
          0.5 + 0.5 * sin(uTime * 0.061 + uPhase)
        );
        float radialHead = 1.0 - smoothstep(0.032, 0.17, abs(radius - radialHeadPosition));

        vec2 roamingLight = uSourceCenter + vec2(
          cos(uTime * 0.053 + uPhase) * 0.29,
          sin(uTime * 0.041 + uPhase * 1.31) * 0.25
        );
        float roamingSpot = exp(-dot(vUv - roamingLight, vUv - roamingLight) * 72.0);
        float pointerReveal = uPointerActive
          * exp(-dot(vUv - (uPointer * 0.5 + 0.5), vUv - (uPointer * 0.5 + 0.5)) * 108.0)
          * 0.28;

        float localReveal = event * max(angularHead, max(radialHead * 0.58, roamingSpot * 0.46));
        localReveal = clamp(localReveal + pointerReveal + uManualBurst * 0.62, 0.0, 1.0);

        float colourMix = clamp(radius * 1.18 + 0.5 * sin(angle * 2.0 + uPhase), 0.0, 1.0);
        vec3 eventColour = mix(uTintA, uTintB, colourMix);
        float microSpark = pow(max(0.0, sin(
          angle * 53.0 + radius * 119.0 - uTime * 1.7 + uPhase
        )), 18.0) * localReveal;

        vec3 metal = source.rgb * (0.010 + structure * uBaseAlpha);
        metal += source.rgb * localReveal * (0.31 + edge * 0.8);
        metal += eventColour * structure * localReveal * (0.08 + edge * 1.65);
        metal += mix(uTintA, vec3(1.0, 0.96, 0.86), 0.46)
          * microSpark * 0.55;
        metal *= 0.82 + vDepthPulse * 0.18;

        vec2 frame = abs(vUv - 0.5) * 2.0;
        float vignette = smoothstep(1.07, 0.64, max(frame.x, frame.y));
        float focusBoost = mix(1.0, 1.16, uFocus);
        float alpha = mask
          * vignette
          * (uBaseAlpha + localReveal * 0.86 + microSpark * 0.18)
          * uVisibility
          * uLayerReveal
          * focusBoost
          * mix(1.0, 0.60, uCompact);
        if (alpha < 0.0025) discard;
        gl_FragColor = vec4(metal, alpha);
      }
    `,
  });
}

function makeGlowMaterial(colour) {
  return new THREE.MeshBasicMaterial({
    color: colour.clone(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function makeMetalMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x05080d,
    metalness: 0.96,
    roughness: 0.29,
    emissive: 0x07101a,
    emissiveIntensity: 0.19,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
}

function createMechanicalSkeleton() {
  const group = new THREE.Group();
  group.name = 'orrery-mechanical-world';
  group.position.set(0, 1.0, -30.1);
  group.rotation.set(-0.034, 0.018, 0);

  const metal = makeMetalMaterial();
  const geometries = [];
  const materials = [metal];
  const ringStates = [];

  RING_RADII.forEach((radius, index) => {
    const holder = new THREE.Group();
    holder.rotation.x = (index % 2 ? 1 : -1) * (0.018 + index * 0.0045);
    holder.rotation.y = (index % 3 - 1) * 0.028;
    holder.rotation.z = index * 0.21;

    const geometry = new THREE.TorusGeometry(
      radius,
      0.052 + index * 0.012,
      6,
      128,
    );
    geometries.push(geometry);
    const base = new THREE.Mesh(geometry, metal);
    const colour = [PALETTE.amber, PALETTE.blue, PALETTE.violet, PALETTE.cyan][index % 4];
    const glowMaterial = makeGlowMaterial(colour);
    materials.push(glowMaterial);
    const glow = new THREE.Mesh(geometry, glowMaterial);
    glow.scale.setScalar(1.009);
    holder.add(base, glow);
    group.add(holder);
    ringStates.push({
      holder,
      glowMaterial,
      speed: RING_SPEEDS[index],
      phase: index * 2.71,
      baseX: holder.rotation.x,
      baseY: holder.rotation.y,
    });
  });

  // Teeth, nodes and braces are instanced. The perceived complexity rises
  // strongly while draw-call cost remains small.
  const toothGeometry = new THREE.BoxGeometry(0.13, 0.46, 0.11);
  geometries.push(toothGeometry);
  const toothCount = 168;
  const teeth = new THREE.InstancedMesh(toothGeometry, metal, toothCount);
  for (let index = 0; index < toothCount; index += 1) {
    const ringIndex = index % 4;
    const radius = RING_RADII[ringIndex + 1];
    const sequenceIndex = Math.floor(index / 4);
    const angle = (sequenceIndex / Math.ceil(toothCount / 4)) * TWO_PI
      + ringIndex * 0.17;
    TEMP_MID.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (ringIndex - 1.5) * 0.08);
    TEMP_QUAT.setFromEuler(new THREE.Euler(0, 0, angle));
    TEMP_SCALE.set(0.72 + ringIndex * 0.08, 0.84, 1);
    TEMP_MATRIX.compose(TEMP_MID, TEMP_QUAT, TEMP_SCALE);
    teeth.setMatrixAt(index, TEMP_MATRIX);
  }
  teeth.instanceMatrix.needsUpdate = true;
  teeth.computeBoundingSphere();
  group.add(teeth);

  const nodeGeometry = new THREE.IcosahedronGeometry(0.20, 1);
  geometries.push(nodeGeometry);
  const nodes = new THREE.InstancedMesh(nodeGeometry, metal, 72);
  for (let index = 0; index < 72; index += 1) {
    const ringIndex = index % RING_RADII.length;
    const radius = RING_RADII[ringIndex] + ((index % 3) - 1) * 0.35;
    const angle = (index / 72) * TWO_PI * 6.0 + ringIndex * 0.31;
    TEMP_MID.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      ((index % 7) - 3) * 0.18,
    );
    TEMP_QUAT.setFromEuler(new THREE.Euler(angle * 0.18, angle * 0.42, angle));
    TEMP_SCALE.setScalar(0.62 + (index % 5) * 0.14);
    TEMP_MATRIX.compose(TEMP_MID, TEMP_QUAT, TEMP_SCALE);
    nodes.setMatrixAt(index, TEMP_MATRIX);
  }
  nodes.instanceMatrix.needsUpdate = true;
  nodes.computeBoundingSphere();
  group.add(nodes);

  const strutGeometry = new THREE.CylinderGeometry(0.026, 0.026, 1, 5, 1, true);
  geometries.push(strutGeometry);
  const strutCount = 44;
  const struts = new THREE.InstancedMesh(strutGeometry, metal, strutCount);
  for (let index = 0; index < strutCount; index += 1) {
    const angle = (index / strutCount) * TWO_PI;
    const inner = 1.9 + (index % 5) * 0.62;
    const outer = 12.8 + (index % 7) * 0.98;
    TEMP_START.set(
      Math.cos(angle) * inner,
      Math.sin(angle) * inner,
      ((index % 3) - 1) * 0.12,
    );
    TEMP_END.set(
      Math.cos(angle) * outer,
      Math.sin(angle) * outer,
      ((index % 7) - 3) * 0.24,
    );
    setCylinderBetween(struts, index, TEMP_START, TEMP_END, index % 2 ? 0.72 : 1.0);
  }
  struts.instanceMatrix.needsUpdate = true;
  struts.computeBoundingSphere();
  group.add(struts);

  const hubGeometry = new THREE.IcosahedronGeometry(0.54, 2);
  geometries.push(hubGeometry);
  const hub = new THREE.Mesh(hubGeometry, metal);
  const hubGlowMaterial = makeGlowMaterial(PALETTE.amber);
  materials.push(hubGlowMaterial);
  const hubGlow = new THREE.Mesh(hubGeometry, hubGlowMaterial);
  hubGlow.scale.setScalar(1.13);
  group.add(hub, hubGlow);

  const satelliteStates = [];
  const satelliteRingGeometry = new THREE.TorusGeometry(0.96, 0.045, 5, 64);
  geometries.push(satelliteRingGeometry);
  const satelliteCoreGeometry = new THREE.IcosahedronGeometry(0.28, 1);
  geometries.push(satelliteCoreGeometry);
  const satellitePositions = [
    [-15.8, 8.4, -0.8, 1.28], [16.1, 7.6, -1.5, 1.05],
    [-17.1, -7.5, -2.1, 0.88], [16.7, -8.2, -1.6, 0.94],
    [-8.4, 12.0, -2.8, 0.78], [9.3, 12.5, -3.1, 0.72],
    [-4.2, -14.3, -2.5, 0.66], [5.0, -14.8, -3.2, 0.70],
  ];
  satellitePositions.forEach((entry, index) => {
    const holder = new THREE.Group();
    holder.position.set(entry[0], entry[1], entry[2]);
    holder.scale.setScalar(entry[3]);
    holder.rotation.set(0.12 * (index % 2 ? 1 : -1), 0.08, index * 0.41);
    const base = new THREE.Mesh(satelliteRingGeometry, metal);
    const colour = [PALETTE.blue, PALETTE.violet, PALETTE.amber, PALETTE.red][index % 4];
    const glowMaterial = makeGlowMaterial(colour);
    materials.push(glowMaterial);
    const glow = new THREE.Mesh(satelliteRingGeometry, glowMaterial);
    glow.scale.setScalar(1.028);
    const core = new THREE.Mesh(satelliteCoreGeometry, metal);
    const coreGlow = new THREE.Mesh(satelliteCoreGeometry, glowMaterial);
    coreGlow.scale.setScalar(1.16);
    holder.add(base, glow, core, coreGlow);
    group.add(holder);
    satelliteStates.push({ holder, glowMaterial, phase: index * 3.17 });
  });

  return {
    group,
    update(elapsed, visibility, compact, focus, activity, manualBurst) {
      const compactFactor = compact ? 0.56 : 1;
      const focusFactor = 1 + focus * 0.20;
      metal.opacity = (0.30 + focus * 0.055) * visibility * compactFactor;
      metal.emissiveIntensity = 0.15 + focus * 0.055;

      for (const state of ringStates) {
        state.holder.rotation.z = elapsed * state.speed * activity + state.phase * 0.071;
        state.holder.rotation.x = state.baseX
          + Math.cos(elapsed * 0.009 + state.phase) * 0.008;
        state.holder.rotation.y = state.baseY
          + Math.sin(elapsed * 0.011 + state.phase) * 0.012;
        const cycle = (elapsed + state.phase) % EVENT_CYCLE;
        const event = smooth01((cycle - 1.6) / 1.4)
          * (1 - smooth01((cycle - 7.0) / 3.2));
        state.glowMaterial.opacity = Math.max(event, manualBurst * 0.85)
          * 0.43 * visibility * compactFactor * focusFactor;
      }

      for (const state of satelliteStates) {
        state.holder.rotation.z = elapsed * (0.010 + state.phase * 0.00025) * activity;
        state.holder.rotation.y = Math.sin(elapsed * 0.057 + state.phase) * 0.19;
        const cycle = (elapsed + state.phase + 3.8) % EVENT_CYCLE;
        const event = smooth01((cycle - 1.5) / 1.2)
          * (1 - smooth01((cycle - 5.8) / 2.8));
        state.glowMaterial.opacity = Math.max(event, manualBurst * 0.62)
          * 0.49 * visibility * compactFactor * focusFactor;
      }

      const hubCycle = (elapsed + 1.1) % EVENT_CYCLE;
      const hubEvent = smooth01((hubCycle - 1.4) / 1.1)
        * (1 - smooth01((hubCycle - 6.2) / 3.0));
      hubGlowMaterial.opacity = Math.max(hubEvent, manualBurst)
        * 0.76 * visibility * focusFactor;

      group.rotation.z = Math.sin(elapsed * 0.015) * 0.017;
      group.rotation.y = Math.sin(elapsed * 0.010) * 0.027;
      group.rotation.x = -0.034 + Math.cos(elapsed * 0.008) * 0.010;
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      for (const material of new Set(materials)) material.dispose();
    },
  };
}

function createEnergyDust() {
  const count = 1180;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const seeds = new Float32Array(count * 4);
  const sizes = new Float32Array(count);
  const hues = new Float32Array(count);

  const hash = (value) => {
    const result = Math.sin(value) * 43758.5453123;
    return result - Math.floor(result);
  };

  for (let index = 0; index < count; index += 1) {
    seeds[index * 4] = hash(index * 1.17 + 0.3);
    seeds[index * 4 + 1] = hash(index * 2.41 + 4.7);
    seeds[index * 4 + 2] = hash(index * 4.13 + 9.4);
    seeds[index * 4 + 3] = hash(index * 7.79 + 15.2);
    sizes[index] = 0.42 + Math.pow(hash(index * 9.31 + 22.8), 2) * 1.9;
    hues[index] = hash(index * 13.17 + 31.6);
  }

  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aHue', new THREE.BufferAttribute(hues, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -36), 42);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uVisibility: { value: 0 },
      uCompact: { value: 0 },
      uPixelRatio: { value: 1 },
      uFocus: { value: 0 },
      uActivity: { value: 1 },
      uManualBurst: { value: 0 },
      uBlue: { value: PALETTE.blue.clone() },
      uViolet: { value: PALETTE.violet.clone() },
      uAmber: { value: PALETTE.amber.clone() },
      uRed: { value: PALETTE.red.clone() },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      attribute vec4 aSeed;
      attribute float aSize, aHue;
      uniform float uTime, uVisibility, uCompact, uPixelRatio;
      uniform float uFocus, uActivity, uManualBurst;
      varying float vLife, vHue, vHeat;

      void main() {
        float time = uTime * (0.035 + aSeed.w * 0.055) * uActivity;
        float ring = floor(aSeed.x * 7.0);
        float radius = mix(4.0, 24.0, sqrt(aSeed.y)) + ring * 0.26;
        float angle = aSeed.x * 6.2831853 + time * mix(-1.0, 1.0, aSeed.z);
        float wobble = sin(uTime * 0.19 + aSeed.y * 43.0) * (0.15 + aSeed.w * 0.72);
        vec3 p;
        p.x = cos(angle) * radius + wobble;
        p.y = sin(angle) * radius * mix(0.72, 1.03, aSeed.w) + cos(time * 2.0 + aSeed.x * 19.0) * 0.42;
        p.z = -33.0 - aSeed.z * 17.0 + sin(time * 1.7 + aSeed.w * 31.0) * 1.8;

        float event = pow(max(0.0, sin(uTime * 0.33 + aSeed.x * 49.0)), 16.0);
        vHeat = max(event, uManualBurst * smoothstep(0.35, 0.92, aSeed.w));
        vLife = (0.20 + vHeat * 0.80) * uVisibility * mix(1.0, 0.50, uCompact);
        vHue = aHue;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize
          * (0.56 + vHeat * 1.45 + uFocus * 0.16)
          * uPixelRatio
          * (31.0 / max(8.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uBlue, uViolet, uAmber, uRed;
      varying float vLife, vHue, vHeat;

      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float distanceToCentre = length(p);
        if (distanceToCentre > 0.5) discard;
        float core = smoothstep(0.5, 0.02, distanceToCentre);
        vec3 cool = mix(uBlue, uViolet, smoothstep(0.10, 0.58, vHue));
        vec3 warm = mix(uAmber, uRed, smoothstep(0.82, 0.99, vHue));
        vec3 colour = mix(cool, warm, smoothstep(0.58, 0.88, vHue));
        colour = mix(colour, vec3(1.0, 0.95, 0.84), vHeat * 0.42);
        float alpha = core * vLife * (0.050 + vHeat * 0.19);
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(colour * (0.72 + vHeat * 1.5), alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'orrery-energy-dust';
  points.frustumCulled = false;
  points.renderOrder = -7;
  return { points, geometry, material };
}

function createAtmosphericGlows() {
  const group = new THREE.Group();
  group.name = 'orrery-atmospheric-glows';
  const geometry = new THREE.PlaneGeometry(1, 1);
  const states = [];
  const specs = [
    { x: 0, y: 1.5, z: -34.8, w: 25, h: 25, colour: PALETTE.amber, phase: 0.8, strength: 0.72 },
    { x: -14.0, y: 4.0, z: -39.0, w: 18, h: 16, colour: PALETTE.blue, phase: 6.1, strength: 0.42 },
    { x: 13.8, y: -2.0, z: -42.0, w: 17, h: 17, colour: PALETTE.violet, phase: 11.9, strength: 0.44 },
    { x: 18.4, y: -8.0, z: -49.0, w: 10, h: 10, colour: PALETTE.red, phase: 17.1, strength: 0.26 },
  ];

  for (const spec of specs) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uVisibility: { value: 0 },
        uCompact: { value: 0 },
        uFocus: { value: 0 },
        uManualBurst: { value: 0 },
        uPhase: { value: spec.phase },
        uStrength: { value: spec.strength },
        uColour: { value: spec.colour.clone() },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uColour;
        uniform float uTime, uVisibility, uCompact, uFocus;
        uniform float uManualBurst, uPhase, uStrength;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float radius = length(p);
          float cycle = mod(uTime + uPhase, ${EVENT_CYCLE.toFixed(1)});
          float event = smoothstep(1.6, 2.9, cycle)
            * (1.0 - smoothstep(6.2, 9.2, cycle));
          event = max(event, uManualBurst);
          float halo = exp(-radius * radius * 3.2);
          float core = exp(-radius * radius * 14.0);
          float filaments = pow(max(0.0, sin(
            atan(p.y, p.x) * 11.0 + radius * 22.0 - uTime * 0.24 + uPhase
          )), 12.0) * exp(-radius * 2.8);
          float grain = 0.86 + hash(floor(vUv * 148.0) + floor(uTime * 5.0)) * 0.14;
          float alpha = (halo * 0.18 + core * 0.24 + filaments * 0.11)
            * event * uStrength
            * uVisibility
            * (1.0 + uFocus * 0.12)
            * mix(1.0, 0.46, uCompact)
            * grain;
          if (alpha < 0.002) discard;
          gl_FragColor = vec4(uColour * (0.68 + core * 0.9), alpha);
        }
      `,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(spec.x, spec.y, spec.z);
    mesh.scale.set(spec.w, spec.h, 1);
    mesh.renderOrder = -9;
    mesh.frustumCulled = false;
    group.add(mesh);
    states.push({ mesh, material, spec });
  }

  return {
    group,
    states,
    geometry,
    update(elapsed, visibility, compact, focus, manualBurst) {
      for (const state of states) {
        const uniforms = state.material.uniforms;
        uniforms.uTime.value = elapsed;
        uniforms.uVisibility.value = visibility;
        uniforms.uCompact.value = compact ? 1 : 0;
        uniforms.uFocus.value = focus;
        uniforms.uManualBurst.value = manualBurst;
        state.mesh.rotation.z = Math.sin(elapsed * 0.012 + state.spec.phase) * 0.025;
      }
    },
    dispose() {
      geometry.dispose();
      for (const state of states) state.material.dispose();
    },
  };
}

export function createProceduralOrreryField({ camera = null, renderer = null } = {}) {
  const group = new THREE.Group();
  group.name = 'hybrid-orrery-field-v5.2';
  group.userData.kind = 'hybrid-orrery-field-v5.2';

  const placeholder = makeTransparentTexture();
  const texturedMeshes = [];
  const texturedStates = [];

  const backdropSpec = {
    name: 'world-imprint', inner: 0.0, outer: 0.86,
    sector: 0, sectorWidth: TWO_PI, phase: 0.0,
    tintA: 'blue', tintB: 'amber', baseAlpha: 0.014,
  };
  const backdropMaterial = makeImprintMaterial(placeholder, backdropSpec, 0);
  const backdropGeometry = new THREE.PlaneGeometry(62, 62, 1, 1);
  const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
  backdrop.name = 'orrery-world-imprint';
  backdrop.position.set(0, 1.0, -39.0);
  backdrop.renderOrder = -14;
  backdrop.visible = false;
  backdrop.frustumCulled = false;
  group.add(backdrop);
  texturedMeshes.push(backdrop);
  texturedStates.push({
    mesh: backdrop,
    material: backdropMaterial,
    spec: backdropSpec,
    baseRotation: 0,
    activationIndex: 0,
  });

  const detailGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  DETAIL_LAYERS.forEach((spec, index) => {
    const material = makeImprintMaterial(placeholder, spec, 0);
    const mesh = new THREE.Mesh(detailGeometry, material);
    mesh.name = `orrery-detail-${spec.name}`;
    mesh.position.set(0, 1.0, spec.z);
    mesh.scale.set(spec.size, spec.size, 1);
    mesh.rotation.z = spec.phase * 0.011;
    mesh.renderOrder = -11 + index * 0.01;
    mesh.visible = false;
    mesh.frustumCulled = false;
    group.add(mesh);
    texturedMeshes.push(mesh);
    texturedStates.push({
      mesh,
      material,
      spec,
      baseRotation: mesh.rotation.z,
      activationIndex: index + 1,
    });
  });

  FRAGMENT_LAYERS.forEach((spec, index) => {
    const material = makeImprintMaterial(placeholder, {
      ...spec,
      baseAlpha: 0.016,
    }, 1);
    const mesh = new THREE.Mesh(detailGeometry, material);
    mesh.name = `orrery-fragment-${spec.name}`;
    mesh.position.set(spec.x, spec.y, spec.z);
    mesh.scale.set(spec.size * spec.scale, spec.size * spec.scale, 1);
    mesh.rotation.z = spec.rotation;
    mesh.rotation.y = spec.x < 0 ? 0.14 : -0.14;
    mesh.renderOrder = -12;
    mesh.visible = false;
    mesh.frustumCulled = false;
    group.add(mesh);
    texturedMeshes.push(mesh);
    texturedStates.push({
      mesh,
      material,
      spec,
      baseRotation: spec.rotation,
      activationIndex: DETAIL_LAYERS.length + index + 1,
      fragmentIndex: index,
    });
  });

  const skeleton = createMechanicalSkeleton();
  group.add(skeleton.group);

  const dust = createEnergyDust();
  group.add(dust.points);

  const atmosphere = createAtmosphericGlows();
  group.add(atmosphere.group);

  let sourceTexture = placeholder;
  let textureReady = false;
  let textureActivationStart = null;
  let effectsEnabled = true;
  let externallySuspended = false;
  let compact = false;
  let pointerActive = false;
  let visibility = 1;
  let visibilityTarget = 1;
  let focus = 0;
  let focusTarget = 0;
  let manualBurst = 0;
  let disposed = false;
  const pointer = new THREE.Vector2(-2, -2);

  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  const loader = new THREE.TextureLoader();
  loader.load(
    SOURCE_URL,
    (texture) => {
      if (disposed) {
        texture.dispose();
        resolveReady?.(false);
        return;
      }
      configureTexture(texture, renderer);
      sourceTexture = texture;
      const width = texture.image?.naturalWidth || texture.image?.width || 1024;
      const height = texture.image?.naturalHeight || texture.image?.height || 1024;
      for (const state of texturedStates) {
        state.material.uniforms.uMap.value = texture;
        state.material.uniforms.uTexel.value.set(1 / width, 1 / height);
      }
      textureReady = true;
      resolveReady?.(true);
    },
    undefined,
    (error) => {
      console.warn(
        'Orrery source image could not be loaded; the 3D mechanical world remains active.',
        error,
      );
      resolveReady?.(false);
    },
  );

  function syncTexturedUniforms(elapsed) {
    for (const state of texturedStates) {
      const uniforms = state.material.uniforms;
      uniforms.uTime.value = elapsed;
      uniforms.uVisibility.value = visibility;
      uniforms.uCompact.value = compact ? 1 : 0;
      uniforms.uFocus.value = focus;
      uniforms.uManualBurst.value = manualBurst;
      uniforms.uPointer.value.copy(pointer);
      uniforms.uPointerActive.value = pointerActive ? 1 : 0;
    }
  }

  function setLayerProgress(elapsed) {
    if (!textureReady) return;
    if (textureActivationStart === null) textureActivationStart = elapsed;
    const age = elapsed - textureActivationStart;
    for (const state of texturedStates) {
      const delay = state.activationIndex * 0.18;
      const progress = smooth01((age - delay) / 0.72);
      state.material.uniforms.uLayerReveal.value = progress;
      state.mesh.visible = progress > 0.002 && visibility > 0.002;
      if (state.fragmentIndex !== undefined && compact) {
        state.mesh.visible = state.fragmentIndex < 2 && state.mesh.visible;
      }
    }
  }

  return {
    group,
    ready,

    // Background currently uses this hook for endpoint/telemetry suppression.
    // The giant world intentionally remains alive behind an opened CV; this
    // flag only lowers secondary activity instead of hiding the construction.
    setSuspended(value) {
      externallySuspended = Boolean(value);
      focusTarget = externallySuspended ? 1 : 0;
    },

    setEffectsEnabled(value) {
      effectsEnabled = Boolean(value);
      visibilityTarget = effectsEnabled ? 1 : 0;
      if (!effectsEnabled) {
        visibility = 0;
        group.visible = false;
      } else {
        group.visible = true;
      }
    },

    setCompact(value) {
      // Visibility stays under the progressive activation controller. Merely
      // storing the quality flag avoids compiling every image shader during
      // the first resize before the source texture has even arrived.
      compact = Boolean(value);
    },

    setPointerNdc(x, y, active = true) {
      pointer.set(Number(x) || 0, Number(y) || 0);
      pointerActive = Boolean(active);
    },

    setPixelRatio(value) {
      dust.material.uniforms.uPixelRatio.value = Math.min(1.5, Math.max(0.75, Number(value) || 1));
    },

    triggerSparseIllumination() {
      if (!effectsEnabled) return false;
      manualBurst = 1;
      group.visible = true;
      return true;
    },

    update(elapsed, delta) {
      const dt = Math.min(0.1, Math.max(0, delta || 0));
      const response = 1 - Math.pow(0.002, dt);
      visibility += (visibilityTarget - visibility) * response;
      focus += (focusTarget - focus) * (1 - Math.pow(0.01, dt));
      manualBurst = Math.max(0, manualBurst - dt / 2.7);

      if (!effectsEnabled && visibility < 0.002) {
        group.visible = false;
        return;
      }
      group.visible = true;

      setLayerProgress(elapsed);
      syncTexturedUniforms(elapsed);

      const activity = externallySuspended ? 0.78 : 1;
      skeleton.update(
        elapsed,
        visibility,
        compact,
        focus,
        activity,
        manualBurst,
      );

      dust.material.uniforms.uTime.value = elapsed;
      dust.material.uniforms.uVisibility.value = visibility;
      dust.material.uniforms.uCompact.value = compact ? 1 : 0;
      dust.material.uniforms.uFocus.value = focus;
      dust.material.uniforms.uActivity.value = activity;
      dust.material.uniforms.uManualBurst.value = manualBurst;

      atmosphere.update(elapsed, visibility, compact, focus, manualBurst);

      backdrop.position.x = Math.sin(elapsed * 0.007) * 0.42;
      backdrop.position.y = 1.0 + Math.cos(elapsed * 0.005) * 0.26;
      backdrop.rotation.z = Math.sin(elapsed * 0.0043) * 0.011;

      for (const state of texturedStates) {
        if (state === texturedStates[0]) continue;
        const { mesh, spec, baseRotation } = state;
        mesh.rotation.z = baseRotation + elapsed * (spec.speed || 0) * activity;
        mesh.rotation.x = Math.sin(elapsed * 0.008 + spec.phase) * 0.010;
        if (state.fragmentIndex !== undefined) {
          mesh.position.y = spec.y + Math.sin(elapsed * 0.013 + spec.phase) * 0.25;
          mesh.rotation.y = (spec.x < 0 ? 0.14 : -0.14)
            + Math.cos(elapsed * 0.009 + spec.phase) * 0.016;
        } else {
          mesh.rotation.y = Math.cos(elapsed * 0.007 + spec.phase) * 0.012;
        }
      }

      // Small camera-relative parallax preserves the source detail while the
      // background still feels volumetric during card and CV camera movement.
      if (camera) {
        const parallaxX = THREE.MathUtils.clamp(camera.position.x * -0.020, -0.52, 0.52);
        const parallaxY = THREE.MathUtils.clamp(camera.position.y * -0.011, -0.32, 0.32);
        group.position.x += (parallaxX - group.position.x) * Math.min(1, dt * 0.74);
        group.position.y += (parallaxY - group.position.y) * Math.min(1, dt * 0.74);
      }
    },

    dispose() {
      disposed = true;
      backdropGeometry.dispose();
      detailGeometry.dispose();
      for (const state of texturedStates) state.material.dispose();
      skeleton.dispose();
      dust.geometry.dispose();
      dust.material.dispose();
      atmosphere.dispose();
      if (sourceTexture !== placeholder) sourceTexture.dispose();
      placeholder.dispose();
      group.clear();
    },
  };
}
