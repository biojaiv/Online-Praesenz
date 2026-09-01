import * as THREE from 'three';
import { lightColor } from './palette.js';

const SOURCE_URL = new URL(
  '../../Elemente/Orrery/orrery-source.png',
  import.meta.url,
).href;

const SOURCE_CENTER = new THREE.Vector2(0.505, 0.515);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const TEMP_START = new THREE.Vector3();
const TEMP_END = new THREE.Vector3();
const TEMP_MID = new THREE.Vector3();
const TEMP_DIR = new THREE.Vector3();
const TEMP_SCALE = new THREE.Vector3();
const TEMP_QUAT = new THREE.Quaternion();
const TEMP_MATRIX = new THREE.Matrix4();

const DETAIL_LAYERS = Object.freeze([
  { inner: 0.00, outer: 0.175, sector: 0.00, width: Math.PI * 2, z: -31.8, scale: 1.00, speed:  0.0030, phase:  1.2, tint: 2 },
  { inner: 0.145, outer: 0.300, sector: 0.00, width: Math.PI * 2, z: -32.2, scale: 1.00, speed: -0.0021, phase:  4.7, tint: 0 },
  { inner: 0.270, outer: 0.445, sector: 0.00, width: Math.PI * 2, z: -32.7, scale: 1.00, speed:  0.00145, phase:  8.1, tint: 1 },
  { inner: 0.405, outer: 0.690, sector: 0.00, width: Math.PI * 2, z: -33.4, scale: 1.00, speed: -0.00085, phase: 11.4, tint: 2 },
  { inner: 0.310, outer: 0.760, sector:  2.25, width: 0.72, z: -30.8, scale: 1.01, speed:  0.0022, phase:  6.4, tint: 0 },
  { inner: 0.325, outer: 0.780, sector: -0.72, width: 0.78, z: -31.2, scale: 1.01, speed: -0.0018, phase: 13.8, tint: 1 },
]);

const FRAGMENTS = Object.freeze([
  { x: -20.5, y:  5.6, z: -42, scale: 0.53, rotation: -0.22, phase:  2.3, tint: 0, sector:  2.55, width: 1.25 },
  { x:  20.8, y:  4.4, z: -47, scale: 0.58, rotation:  0.27, phase:  9.7, tint: 1, sector: -0.52, width: 1.20 },
  { x: -18.0, y: -8.7, z: -55, scale: 0.44, rotation:  0.38, phase: 14.1, tint: 2, sector: -2.28, width: 1.35 },
  { x:  18.6, y: -9.2, z: -51, scale: 0.47, rotation: -0.33, phase:  5.8, tint: 3, sector:  0.88, width: 1.30 },
]);

const RING_RADII = Object.freeze([4.7, 6.2, 8.1, 10.5, 13.2, 16.0]);
const RING_SPEEDS = Object.freeze([0.030, -0.022, 0.016, -0.011, 0.0074, -0.0048]);
const EVENT_CYCLE = 18.0;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / Math.max(0.000001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function disposeMaterial(material) {
  if (!material) return;
  if (material.map?.isTexture) material.map.dispose();
  material.dispose?.();
}

function makeTransparentTexture() {
  const data = new Uint8Array([0, 0, 0, 0]);
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

function paletteVector(index) {
  const names = ['fiberBlue', 'violet', 'amber', 'signal'];
  return lightColor(names[index % names.length]).clone();
}

function makeBackdropMaterial(texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
      uTime: { value: 0 },
      uVisibility: { value: 1 },
      uCompact: { value: 0 },
      uPointer: { value: new THREE.Vector2(-2, -2) },
      uPointerActive: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: false,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec2 uTexel, uPointer;
      uniform float uTime, uVisibility, uCompact, uPointerActive;
      varying vec2 vUv;

      float lum(vec3 c) {
        return dot(c, vec3(0.2126, 0.7152, 0.0722));
      }

      float envelope(float time, float phase) {
        float cycle = mod(time + phase, 18.0);
        return smoothstep(2.2, 3.5, cycle) * (1.0 - smoothstep(7.2, 10.0, cycle));
      }

      void main() {
        vec4 source = texture2D(uMap, vUv);
        float sourceLum = lum(source.rgb);
        float edge = max(
          abs(lum(texture2D(uMap, vUv + vec2(uTexel.x, 0.0)).rgb)
            - lum(texture2D(uMap, vUv - vec2(uTexel.x, 0.0)).rgb)),
          abs(lum(texture2D(uMap, vUv + vec2(0.0, uTexel.y)).rgb)
            - lum(texture2D(uMap, vUv - vec2(0.0, uTexel.y)).rgb))
        );
        float chroma = max(source.r, max(source.g, source.b))
          - min(source.r, min(source.g, source.b));
        float structure = clamp(
          smoothstep(0.02, 0.58, 0.91 - sourceLum)
          + smoothstep(0.015, 0.11, edge) * 0.85
          + smoothstep(0.025, 0.16, chroma) * 0.45,
          0.0,
          1.0
        );

        vec2 p = vUv - vec2(0.505, 0.515);
        float angle = atan(p.y, p.x);
        float radius = length(p);
        float head = uTime * 0.115;
        float angleDistance = abs(atan(sin(angle - head), cos(angle - head)));
        float arc = 1.0 - smoothstep(0.18, 0.72, angleDistance);
        float radialBand = 1.0 - smoothstep(0.09, 0.31, abs(radius - 0.34));
        float event = envelope(uTime, 0.0) * max(arc * radialBand, 0.0);

        vec2 movingLight = vec2(
          0.505 + cos(uTime * 0.091) * 0.27,
          0.515 + sin(uTime * 0.073) * 0.24
        );
        float spot = exp(-dot(vUv - movingLight, vUv - movingLight) * 54.0)
          * envelope(uTime, 7.0);
        float pointerGlow = uPointerActive
          * exp(-dot(vUv - (uPointer * 0.5 + 0.5), vUv - (uPointer * 0.5 + 0.5)) * 90.0)
          * 0.18;
        float reveal = clamp(event * 0.72 + spot * 0.55 + pointerGlow, 0.0, 1.0);

        vec3 amber = vec3(1.0, 0.53, 0.20);
        vec3 blue = vec3(0.20, 0.70, 1.0);
        vec3 tint = mix(blue, amber, smoothstep(0.18, 0.72, radius));
        vec3 metal = source.rgb * (0.022 + structure * 0.050);
        metal += source.rgb * structure * reveal * 0.28;
        metal += tint * structure * reveal * (0.10 + edge * 1.8);

        vec2 edgeUv = abs(vUv - 0.5) * 2.0;
        float vignette = smoothstep(1.02, 0.66, max(edgeUv.x, edgeUv.y));
        float alpha = structure * vignette
          * (0.10 + reveal * 0.56)
          * uVisibility
          * mix(1.0, 0.58, uCompact);
        if (alpha < 0.003) discard;
        gl_FragColor = vec4(metal, alpha);
      }
    `,
  });
}

function makeDetailMaterial(texture, spec) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uTime: { value: 0 },
      uVisibility: { value: 1 },
      uCompact: { value: 0 },
      uInner: { value: spec.inner ?? 0.0 },
      uOuter: { value: spec.outer ?? 0.76 },
      uSector: { value: spec.sector ?? 0.0 },
      uSectorWidth: { value: spec.width ?? Math.PI * 2 },
      uPhase: { value: spec.phase ?? 0.0 },
      uTint: { value: paletteVector(spec.tint ?? 0) },
      uPointer: { value: new THREE.Vector2(-2, -2) },
      uPointerActive: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec2 uPointer;
      uniform vec3 uTint;
      uniform float uTime, uVisibility, uCompact;
      uniform float uInner, uOuter, uSector, uSectorWidth, uPhase, uPointerActive;
      varying vec2 vUv;

      float eventEnvelope(float time, float phase) {
        float cycle = mod(time + phase, 18.0);
        return smoothstep(1.8, 3.0, cycle)
          * (1.0 - smoothstep(6.8, 9.4, cycle));
      }

      float sourceStructure(vec3 colour) {
        float luminance = dot(colour, vec3(0.2126, 0.7152, 0.0722));
        float chroma = max(colour.r, max(colour.g, colour.b))
          - min(colour.r, min(colour.g, colour.b));
        float derivativeEdge = fwidth(luminance);
        float darkMetal = smoothstep(0.035, 0.56, 0.92 - luminance);
        float colouredMetal = smoothstep(0.022, 0.17, chroma);
        float fineEdge = smoothstep(0.004, 0.055, derivativeEdge);
        float warmHighlight = smoothstep(0.018, 0.14, colour.r - colour.b)
          * smoothstep(0.42, 0.95, luminance);
        float structure = max(
          pow(darkMetal, 0.78),
          max(colouredMetal * 0.82, max(fineEdge, warmHighlight * 0.92))
        );
        float flatPaper = smoothstep(0.78, 0.98, luminance)
          * (1.0 - smoothstep(0.025, 0.09, chroma))
          * (1.0 - smoothstep(0.004, 0.026, derivativeEdge));
        return clamp(structure * (1.0 - flatPaper * 0.98), 0.0, 1.0);
      }

      void main() {
        vec2 p = vUv - vec2(0.505, 0.515);
        float radius = length(p);
        float angle = atan(p.y, p.x);
        float radial = smoothstep(uInner - 0.018, uInner + 0.012, radius)
          * (1.0 - smoothstep(uOuter - 0.018, uOuter + 0.012, radius));
        float sectorDistance = abs(atan(sin(angle - uSector), cos(angle - uSector)));
        float sector = uSectorWidth > 6.0
          ? 1.0
          : 1.0 - smoothstep(uSectorWidth * 0.48, uSectorWidth * 0.56, sectorDistance);
        float geometryMask = radial * sector;
        if (geometryMask < 0.008) discard;

        vec4 source = texture2D(uMap, vUv);
        float structure = sourceStructure(source.rgb) * source.a;
        float mask = geometryMask * structure;
        if (mask < 0.008) discard;

        float event = eventEnvelope(uTime, uPhase);
        float travelling = uTime * (0.10 + uPhase * 0.0009) + uPhase * 0.37;
        float arcDistance = abs(atan(sin(angle - travelling), cos(angle - travelling)));
        float arc = 1.0 - smoothstep(0.10, 0.42, arcDistance);
        float radialHead = 1.0 - smoothstep(0.045, 0.19,
          abs(radius - mix(max(uInner, 0.04), uOuter, 0.5 + 0.5 * sin(uTime * 0.071 + uPhase))));
        float localReveal = event * max(arc, radialHead * 0.58);
        float pointerReveal = uPointerActive
          * exp(-dot(vUv - (uPointer * 0.5 + 0.5), vUv - (uPointer * 0.5 + 0.5)) * 120.0)
          * 0.35;
        float reveal = clamp(localReveal + pointerReveal, 0.0, 1.0);

        float luminance = dot(source.rgb, vec3(0.2126, 0.7152, 0.0722));
        vec3 colouredMetal = mix(source.rgb, luminance * uTint, 0.44);
        vec3 colour = source.rgb * (0.028 + reveal * 0.72);
        colour += colouredMetal * reveal * 0.42;
        colour += uTint * reveal * pow(luminance, 1.5) * 0.24;

        float alpha = mask
          * (0.035 + reveal * 0.88)
          * uVisibility
          * mix(1.0, 0.62, uCompact);
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(colour, alpha);
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

function makeBaseMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x05070a,
    metalness: 0.95,
    roughness: 0.31,
    emissive: 0x05080c,
    emissiveIntensity: 0.18,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
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

function createMechanicalSkeleton() {
  const group = new THREE.Group();
  group.name = 'orrery-mechanical-depth-skeleton';
  group.position.set(0, 1.1, -30.4);
  group.rotation.set(-0.035, 0.018, 0);

  const baseMaterial = makeBaseMaterial();
  const ringStates = [];
  const geometries = [];
  const materials = [baseMaterial];

  RING_RADII.forEach((radius, index) => {
    const holder = new THREE.Group();
    holder.rotation.x = (index % 2 ? 1 : -1) * (0.018 + index * 0.004);
    holder.rotation.y = (index % 3 - 1) * 0.026;
    const geometry = new THREE.TorusGeometry(radius, 0.055 + index * 0.012, 6, 128);
    geometries.push(geometry);
    const base = new THREE.Mesh(geometry, baseMaterial);
    const colour = paletteVector(index);
    const glowMaterial = makeGlowMaterial(colour);
    materials.push(glowMaterial);
    const glow = new THREE.Mesh(geometry, glowMaterial);
    glow.scale.setScalar(1.008);
    holder.add(base, glow);
    group.add(holder);
    ringStates.push({
      holder,
      glowMaterial,
      speed: RING_SPEEDS[index],
      phase: index * 2.7,
    });
  });

  const hubGeometry = new THREE.IcosahedronGeometry(0.42, 2);
  geometries.push(hubGeometry);
  const hub = new THREE.Mesh(hubGeometry, baseMaterial);
  const hubGlowMaterial = makeGlowMaterial(lightColor('amber'));
  materials.push(hubGlowMaterial);
  const hubGlow = new THREE.Mesh(hubGeometry, hubGlowMaterial);
  hubGlow.scale.setScalar(1.08);
  group.add(hub, hubGlow);

  const nodeGeometry = new THREE.IcosahedronGeometry(0.18, 1);
  geometries.push(nodeGeometry);
  const nodes = new THREE.InstancedMesh(nodeGeometry, baseMaterial, 48);
  for (let index = 0; index < 48; index += 1) {
    const ringIndex = index % RING_RADII.length;
    const radius = RING_RADII[ringIndex] + ((index % 3) - 1) * 0.34;
    const angle = (index / 48) * Math.PI * 2 * 5.0 + ringIndex * 0.37;
    TEMP_MID.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      ((index % 5) - 2) * 0.22,
    );
    TEMP_QUAT.setFromEuler(new THREE.Euler(angle * 0.2, angle, 0));
    TEMP_SCALE.setScalar(0.7 + (index % 4) * 0.18);
    TEMP_MATRIX.compose(TEMP_MID, TEMP_QUAT, TEMP_SCALE);
    nodes.setMatrixAt(index, TEMP_MATRIX);
  }
  nodes.instanceMatrix.needsUpdate = true;
  group.add(nodes);

  const strutGeometry = new THREE.CylinderGeometry(0.025, 0.025, 1, 5, 1, true);
  geometries.push(strutGeometry);
  const struts = new THREE.InstancedMesh(strutGeometry, baseMaterial, 28);
  for (let index = 0; index < 28; index += 1) {
    const angle = (index / 28) * Math.PI * 2;
    const inner = 2.2 + (index % 4) * 0.55;
    const outer = 10.8 + (index % 5) * 0.95;
    TEMP_START.set(Math.cos(angle) * inner, Math.sin(angle) * inner, ((index % 3) - 1) * 0.12);
    TEMP_END.set(Math.cos(angle) * outer, Math.sin(angle) * outer, ((index % 5) - 2) * 0.22);
    setCylinderBetween(struts, index, TEMP_START, TEMP_END, index % 2 ? 0.72 : 1.0);
  }
  struts.instanceMatrix.needsUpdate = true;
  group.add(struts);

  const satelliteStates = [];
  const satelliteGeometry = new THREE.TorusGeometry(0.92, 0.045, 5, 64);
  geometries.push(satelliteGeometry);
  const satellitePositions = [
    [-14.6, 7.1, -0.4, 1.2], [14.8, 6.5, -1.2, 1.0],
    [-15.8, -6.8, -2.0, 0.82], [15.1, -7.4, -1.4, 0.9],
    [-7.4, 10.9, -2.6, 0.72], [8.6, 11.4, -3.0, 0.68],
  ];
  satellitePositions.forEach((entry, index) => {
    const holder = new THREE.Group();
    holder.position.set(entry[0], entry[1], entry[2]);
    holder.scale.setScalar(entry[3]);
    holder.rotation.set(0.12 * (index % 2 ? 1 : -1), 0.08, index * 0.4);
    const base = new THREE.Mesh(satelliteGeometry, baseMaterial);
    const glowMaterial = makeGlowMaterial(paletteVector(index + 1));
    materials.push(glowMaterial);
    const glow = new THREE.Mesh(satelliteGeometry, glowMaterial);
    glow.scale.setScalar(1.025);
    const core = new THREE.Mesh(hubGeometry, baseMaterial);
    core.scale.setScalar(0.74);
    holder.add(base, glow, core);
    group.add(holder);
    satelliteStates.push({ holder, glowMaterial, phase: index * 3.1 });
  });

  return {
    group,
    ringStates,
    satelliteStates,
    hubGlowMaterial,
    update(elapsed, visibility, compact) {
      const compactFactor = compact ? 0.55 : 1;
      for (const state of ringStates) {
        state.holder.rotation.z = elapsed * state.speed + state.phase * 0.07;
        const cycle = (elapsed + state.phase) % EVENT_CYCLE;
        const event = smoothstep(2.0, 3.1, cycle)
          * (1 - smoothstep(6.6, 9.2, cycle));
        state.glowMaterial.opacity = event * 0.38 * visibility * compactFactor;
      }
      for (const state of satelliteStates) {
        state.holder.rotation.z = elapsed * (0.012 + state.phase * 0.0003);
        state.holder.rotation.y = Math.sin(elapsed * 0.065 + state.phase) * 0.18;
        const cycle = (elapsed + state.phase + 4.0) % EVENT_CYCLE;
        const event = smoothstep(2.0, 3.0, cycle)
          * (1 - smoothstep(5.8, 8.5, cycle));
        state.glowMaterial.opacity = event * 0.48 * visibility * compactFactor;
      }
      const hubCycle = (elapsed + 1.4) % EVENT_CYCLE;
      const hubEvent = smoothstep(2.0, 3.0, hubCycle)
        * (1 - smoothstep(6.0, 9.0, hubCycle));
      hubGlowMaterial.opacity = hubEvent * 0.72 * visibility;
      group.rotation.z = Math.sin(elapsed * 0.016) * 0.018;
      group.rotation.y = Math.sin(elapsed * 0.011) * 0.026;
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      for (const material of new Set(materials)) material.dispose();
    },
  };
}

export function createProceduralOrreryField({ camera = null } = {}) {
  const group = new THREE.Group();
  group.name = 'hybrid-orrery-field-v5';
  group.userData.kind = 'hybrid-orrery-field-v5';

  const placeholder = makeTransparentTexture();
  const planeGeometry = new THREE.PlaneGeometry(44, 44, 1, 1);
  const fragmentGeometry = new THREE.PlaneGeometry(28, 28, 1, 1);
  const backdropMaterial = makeBackdropMaterial(placeholder);
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(54, 54), backdropMaterial);
  backdrop.position.set(0, 1.2, -36.8);
  backdrop.renderOrder = -12;
  backdrop.visible = false;
  group.add(backdrop);

  const detailStates = [];
  for (const spec of DETAIL_LAYERS) {
    const material = makeDetailMaterial(placeholder, spec);
    const mesh = new THREE.Mesh(planeGeometry, material);
    mesh.position.set(0, 1.2, spec.z);
    mesh.scale.setScalar(spec.scale);
    mesh.rotation.z = spec.phase * 0.012;
    mesh.renderOrder = -10;
    mesh.visible = false;
    group.add(mesh);
    detailStates.push({
      mesh, material, spec, baseRotation: mesh.rotation.z, reveal: 0,
    });
  }

  const fragmentStates = [];
  for (const spec of FRAGMENTS) {
    const material = makeDetailMaterial(placeholder, {
      inner: 0.18,
      outer: 0.79,
      sector: spec.sector,
      width: spec.width,
      phase: spec.phase,
      tint: spec.tint,
    });
    const mesh = new THREE.Mesh(fragmentGeometry, material);
    mesh.position.set(spec.x, spec.y, spec.z);
    mesh.scale.setScalar(spec.scale);
    mesh.rotation.z = spec.rotation;
    mesh.rotation.y = spec.x < 0 ? 0.13 : -0.13;
    mesh.renderOrder = -11;
    mesh.visible = false;
    group.add(mesh);
    fragmentStates.push({ mesh, material, spec, reveal: 0 });
  }

  const skeleton = createMechanicalSkeleton();
  group.add(skeleton.group);

  let sourceTexture = placeholder;
  let sourceReady = false;
  let activationAge = 0;
  let effectsEnabled = true;
  let suspended = false;
  let visibility = 1;
  let visibilityTarget = 1;
  let compact = false;
  let pointerActive = false;
  const pointer = new THREE.Vector2(-2, -2);
  let disposed = false;

  const loader = new THREE.TextureLoader();
  loader.load(
    SOURCE_URL,
    (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
      sourceTexture = texture;
      backdropMaterial.uniforms.uMap.value = sourceTexture;
      const width = texture.image?.naturalWidth || texture.image?.width || 1024;
      const height = texture.image?.naturalHeight || texture.image?.height || 1024;
      backdropMaterial.uniforms.uTexel.value.set(1 / width, 1 / height);
      for (const state of detailStates) state.material.uniforms.uMap.value = sourceTexture;
      for (const state of fragmentStates) state.material.uniforms.uMap.value = sourceTexture;
      sourceReady = true;
      activationAge = 0;
      backdrop.visible = true;
      placeholder.dispose();
    },
    undefined,
    (error) => {
      console.warn('Orrery source image could not be loaded; procedural depth skeleton remains active.', error);
    },
  );

  function syncCommonUniforms(elapsed) {
    backdropMaterial.uniforms.uTime.value = elapsed;
    backdropMaterial.uniforms.uVisibility.value = sourceReady ? visibility : 0;
    backdropMaterial.uniforms.uCompact.value = compact ? 1 : 0;
    backdropMaterial.uniforms.uPointer.value.copy(pointer);
    backdropMaterial.uniforms.uPointerActive.value = pointerActive ? 1 : 0;
    for (const state of detailStates) {
      state.material.uniforms.uTime.value = elapsed;
      state.material.uniforms.uVisibility.value = visibility * state.reveal;
      state.material.uniforms.uCompact.value = compact ? 1 : 0;
      state.material.uniforms.uPointer.value.copy(pointer);
      state.material.uniforms.uPointerActive.value = pointerActive ? 1 : 0;
    }
    for (const state of fragmentStates) {
      state.material.uniforms.uTime.value = elapsed;
      state.material.uniforms.uVisibility.value = visibility * state.reveal;
      state.material.uniforms.uCompact.value = compact ? 1 : 0;
      state.material.uniforms.uPointer.value.copy(pointer);
      state.material.uniforms.uPointerActive.value = pointerActive ? 1 : 0;
    }
  }

  function syncVisibilityTarget() {
    const active = effectsEnabled && !suspended;
    visibilityTarget = active ? 1 : 0;
    if (active) group.visible = true;
  }

  return {
    group,

    setEffectsEnabled(value) {
      effectsEnabled = Boolean(value);
      if (!effectsEnabled) {
        visibility = 0;
        group.visible = false;
      }
      syncVisibilityTarget();
    },

    setSuspended(value) {
      // background.js historically combines intro and CV suppression in one
      // flag. During normal operation (effects enabled) the CV must not hide
      // the mechanical world; only the global intro/effect lock may suspend it.
      suspended = Boolean(value) && !effectsEnabled;
      if (suspended) {
        visibility = 0;
        group.visible = false;
      }
      syncVisibilityTarget();
    },

    setCompact(value) {
      compact = Boolean(value);
      // The central construction remains. Peripheral repetitions are removed
      // on narrow screens so the CV and pedestals retain visual priority.
      fragmentStates.forEach((state, index) => {
        state.mesh.visible = sourceReady
          && state.reveal > 0.002
          && (!compact || index < 2);
      });
    },

    setPointerNdc(x, y, active = true) {
      pointer.set(Number(x) || 0, Number(y) || 0);
      pointerActive = Boolean(active);
    },

    update(elapsed, delta) {
      const dt = Math.min(0.1, Math.max(0, delta || 0));
      const response = 1 - Math.pow(0.002, dt);
      visibility += (visibilityTarget - visibility) * response;
      if ((!effectsEnabled || suspended) && visibility < 0.003) {
        group.visible = false;
        return;
      }
      group.visible = true;

      // The source texture is shared by every layer. Layers are admitted in a
      // short sequence so the browser does not compile all material variants
      // in the first visible frame.
      if (sourceReady) {
        activationAge += dt;
        detailStates.forEach((state, index) => {
          const target = smoothstep(index * 0.12, index * 0.12 + 0.58, activationAge);
          state.reveal += (target - state.reveal) * response;
          state.mesh.visible = state.reveal > 0.002;
        });
        fragmentStates.forEach((state, index) => {
          const start = 0.78 + index * 0.16;
          const target = smoothstep(start, start + 0.62, activationAge);
          state.reveal += (target - state.reveal) * response;
          state.mesh.visible = state.reveal > 0.002
            && (!compact || index < 2);
        });
      }

      syncCommonUniforms(elapsed);

      backdrop.position.x = Math.sin(elapsed * 0.008) * 0.34;
      backdrop.position.y = 1.2 + Math.cos(elapsed * 0.006) * 0.22;
      backdrop.rotation.z = Math.sin(elapsed * 0.0048) * 0.010;

      for (const state of detailStates) {
        const { mesh, spec, baseRotation } = state;
        mesh.rotation.z = baseRotation + elapsed * spec.speed;
        mesh.rotation.x = Math.sin(elapsed * 0.009 + spec.phase) * 0.010;
        mesh.rotation.y = Math.cos(elapsed * 0.007 + spec.phase) * 0.012;
      }
      for (const state of fragmentStates) {
        const { mesh, spec } = state;
        mesh.rotation.z = spec.rotation + elapsed * (spec.x < 0 ? 0.0008 : -0.0007);
        mesh.position.y = spec.y + Math.sin(elapsed * 0.014 + spec.phase) * 0.22;
      }
      skeleton.update(elapsed, visibility, compact);

      // Camera-relative parallax remains small enough that the source detail
      // never tears apart, but it is visible during the document dolly.
      if (camera) {
        const parallaxX = THREE.MathUtils.clamp(camera.position.x * -0.018, -0.45, 0.45);
        const parallaxY = THREE.MathUtils.clamp(camera.position.y * -0.010, -0.28, 0.28);
        group.position.x += (parallaxX - group.position.x) * Math.min(1, dt * 0.7);
        group.position.y += (parallaxY - group.position.y) * Math.min(1, dt * 0.7);
      }
    },

    dispose() {
      disposed = true;
      planeGeometry.dispose();
      fragmentGeometry.dispose();
      backdrop.geometry.dispose();
      disposeMaterial(backdropMaterial);
      for (const state of detailStates) state.material.dispose();
      for (const state of fragmentStates) state.material.dispose();
      skeleton.dispose();
      if (sourceTexture && sourceTexture !== placeholder) sourceTexture.dispose();
      if (placeholder && placeholder !== sourceTexture) placeholder.dispose();
      group.clear();
    },
  };
}
