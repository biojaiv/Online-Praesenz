import * as THREE from 'three';
import { lightColor } from './palette.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const TEMP_MID = new THREE.Vector3();
const TEMP_DIR = new THREE.Vector3();
const TEMP_SCALE = new THREE.Vector3();
const TEMP_QUAT = new THREE.Quaternion();
const TEMP_MATRIX = new THREE.Matrix4();
const TEMP_COLOR = new THREE.Color();
const TEMP_WORLD = new THREE.Vector3();

const PALETTE = Object.freeze([
  lightColor('fiber').clone(),
  lightColor('violet').clone(),
  lightColor('amber').clone(),
  lightColor('fiberBlue').clone(),
]);

const FIELD_SPECS = Object.freeze([
  { x: 0.00, y: -0.02, z: -235, scale: 1.34, rx: -0.16, ry:  0.05, rz:  0.03, spin:  0.0024, seed: 0.07 },
  { x: -0.34, y: 0.27, z: -185, scale: 0.66, rx:  0.12, ry: -0.18, rz: -0.18, spin: -0.0038, seed: 0.21 },
  { x:  0.35, y: 0.30, z: -210, scale: 0.73, rx: -0.09, ry:  0.22, rz:  0.16, spin:  0.0032, seed: 0.38 },
  { x: -0.42, y: -0.18, z: -285, scale: 0.82, rx:  0.18, ry:  0.12, rz:  0.08, spin:  0.0028, seed: 0.52 },
  { x:  0.43, y: -0.19, z: -300, scale: 0.74, rx: -0.14, ry: -0.16, rz: -0.08, spin: -0.0026, seed: 0.66 },
  { x: -0.12, y: 0.42, z: -355, scale: 0.58, rx:  0.06, ry:  0.24, rz:  0.22, spin:  0.0022, seed: 0.78 },
  { x:  0.12, y: -0.42, z: -330, scale: 0.62, rx: -0.07, ry: -0.20, rz: -0.24, spin: -0.0020, seed: 0.87 },
  { x: -0.50, y: 0.03, z: -390, scale: 0.54, rx:  0.19, ry:  0.05, rz:  0.27, spin:  0.0018, seed: 0.93 },
  { x:  0.52, y: 0.05, z: -405, scale: 0.52, rx: -0.17, ry: -0.06, rz: -0.29, spin: -0.0017, seed: 0.98 },
]);

const RING_SPECS = Object.freeze([
  { radius: 38, tube: 0.72, tiltX: 0.00, tiltY: 0.00, speed:  0.0062 },
  { radius: 31, tube: 0.48, tiltX: 0.18, tiltY: 0.06, speed: -0.0084 },
  { radius: 24, tube: 0.52, tiltX: -0.12, tiltY: 0.22, speed:  0.0101 },
  { radius: 17, tube: 0.36, tiltX: 0.28, tiltY: -0.10, speed: -0.0122 },
]);

const FIRST_EVENT_MIN = 6.5;
const FIRST_EVENT_MAX = 11.5;
const EVENT_GAP_MIN = 12.0;
const EVENT_GAP_MAX = 24.0;
const EVENT_DURATION_MIN = 5.5;
const EVENT_DURATION_MAX = 9.0;
const MAX_SIMULTANEOUS = 2;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smooth(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function eventEnvelope(t) {
  const attack = smooth(t / 0.16);
  const release = 1 - smooth((t - 0.68) / 0.32);
  return clamp01(Math.min(attack, release));
}

function paletteColor(phase, out = TEMP_COLOR) {
  const wrapped = ((phase % 1) + 1) % 1;
  const scaled = wrapped * PALETTE.length;
  const index = Math.floor(scaled) % PALETTE.length;
  const next = (index + 1) % PALETTE.length;
  const local = smooth(scaled - Math.floor(scaled));
  return out.copy(PALETTE[index]).lerp(PALETTE[next], local);
}

function setCylinderBetween(instanced, index, start, end, radiusScale = 1) {
  TEMP_MID.copy(start).add(end).multiplyScalar(0.5);
  TEMP_DIR.copy(end).sub(start);
  const length = Math.max(0.001, TEMP_DIR.length());
  TEMP_DIR.normalize();
  TEMP_QUAT.setFromUnitVectors(Y_AXIS, TEMP_DIR);
  TEMP_SCALE.set(radiusScale, length, radiusScale);
  TEMP_MATRIX.compose(TEMP_MID, TEMP_QUAT, TEMP_SCALE);
  instanced.setMatrixAt(index, TEMP_MATRIX);
}

function makeArcMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: lightColor('fiber').clone() },
      uEnergy: { value: 0 },
      uHead: { value: 0 },
      uWidth: { value: 0.11 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uEnergy, uHead, uWidth;
      varying vec2 vUv;

      float circularDistance(float a, float b) {
        float d = abs(a - b);
        return min(d, 1.0 - d);
      }

      void main() {
        float d = circularDistance(vUv.x, fract(uHead));
        float head = 1.0 - smoothstep(uWidth * 0.18, uWidth, d);
        float tail = 1.0 - smoothstep(uWidth, uWidth * 3.4, d);
        float energy = (head * 1.18 + tail * 0.34) * uEnergy;
        float rim = smoothstep(0.0, 0.18, vUv.y) * smoothstep(0.0, 0.18, 1.0 - vUv.y);
        float alpha = energy * rim;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(uColor * (1.15 + head * 0.85), alpha);
      }
    `,
  });
}

function makeBaseMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x070b10,
    metalness: 0.94,
    roughness: 0.34,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
}

function makeGlowMaterial() {
  return new THREE.MeshBasicMaterial({
    color: lightColor('fiber'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function buildAssembly(spec, index, shared) {
  const root = new THREE.Group();
  root.name = `orrery-assembly-${index}`;
  root.position.set(spec.x * 245, spec.y * 175, spec.z);
  root.rotation.set(spec.rx, spec.ry, spec.rz);
  root.scale.setScalar(spec.scale);

  const baseMaterial = makeBaseMaterial();
  const glowMaterial = makeGlowMaterial();
  const spokeGlowMaterial = makeGlowMaterial();
  spokeGlowMaterial.opacity = 0;

  const hub = new THREE.Mesh(shared.hubGeometry, baseMaterial);
  hub.scale.setScalar(5.8);
  root.add(hub);

  const hubGlow = new THREE.Mesh(shared.hubGeometry, glowMaterial);
  hubGlow.scale.setScalar(6.0);
  root.add(hubGlow);

  const ringStates = [];
  RING_SPECS.forEach((ringSpec, ringIndex) => {
    const geometry = shared.ringGeometries[ringIndex];
    const holder = new THREE.Group();
    holder.rotation.x = ringSpec.tiltX;
    holder.rotation.y = ringSpec.tiltY;
    holder.rotation.z = ringIndex * 0.42;

    const base = new THREE.Mesh(geometry, baseMaterial);
    const arcMaterial = makeArcMaterial();
    const glow = new THREE.Mesh(geometry, arcMaterial);
    glow.scale.setScalar(1.012);
    holder.add(base, glow);
    root.add(holder);
    ringStates.push({ holder, arcMaterial, speed: ringSpec.speed, phase: ringIndex * 0.19 });
  });

  const spokeCount = 16;
  const spokes = new THREE.InstancedMesh(shared.strutGeometry, baseMaterial, spokeCount);
  const glowSpokes = new THREE.InstancedMesh(shared.strutGeometry, spokeGlowMaterial, spokeCount);
  const center = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2 + index * 0.17;
    const radius = i % 2 === 0 ? 37 : 30;
    const end = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, ((i % 3) - 1) * 2.4);
    setCylinderBetween(spokes, i, center, end, i % 2 === 0 ? 0.82 : 0.62);
    setCylinderBetween(glowSpokes, i, center, end, i % 2 === 0 ? 0.92 : 0.72);
  }
  spokes.instanceMatrix.needsUpdate = true;
  glowSpokes.instanceMatrix.needsUpdate = true;
  root.add(spokes, glowSpokes);

  const satelliteCount = 10;
  const satelliteHolder = new THREE.Group();
  const satellites = new THREE.InstancedMesh(shared.satelliteGeometry, baseMaterial, satelliteCount);
  const glowSatellites = new THREE.InstancedMesh(shared.satelliteGeometry, glowMaterial, satelliteCount);
  for (let i = 0; i < satelliteCount; i++) {
    const angle = (i / satelliteCount) * Math.PI * 2 + index * 0.31;
    const radius = 42 + (i % 3) * 5;
    const scale = 1.4 + (i % 4) * 0.42;
    TEMP_MID.set(Math.cos(angle) * radius, Math.sin(angle) * radius, ((i % 4) - 1.5) * 5.4);
    TEMP_QUAT.setFromEuler(new THREE.Euler(angle * 0.3, angle, 0));
    TEMP_SCALE.setScalar(scale);
    TEMP_MATRIX.compose(TEMP_MID, TEMP_QUAT, TEMP_SCALE);
    satellites.setMatrixAt(i, TEMP_MATRIX);
    TEMP_SCALE.setScalar(scale * 1.12);
    TEMP_MATRIX.compose(TEMP_MID, TEMP_QUAT, TEMP_SCALE);
    glowSatellites.setMatrixAt(i, TEMP_MATRIX);
  }
  satellites.instanceMatrix.needsUpdate = true;
  glowSatellites.instanceMatrix.needsUpdate = true;
  satelliteHolder.add(satellites, glowSatellites);
  root.add(satelliteHolder);

  const connectorPositions = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = ((i + 4) / 12) * Math.PI * 2;
    connectorPositions.push(
      Math.cos(a) * 18, Math.sin(a) * 18, -4 + (i % 3) * 4,
      Math.cos(b) * 44, Math.sin(b) * 44, -9 + (i % 5) * 4,
    );
  }
  const connectorGeometry = new THREE.BufferGeometry();
  connectorGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connectorPositions, 3));
  const connectorMaterial = new THREE.LineBasicMaterial({
    color: 0x18222c,
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
  });
  const connectors = new THREE.LineSegments(connectorGeometry, connectorMaterial);
  root.add(connectors);

  return {
    root,
    spec,
    baseMaterial,
    glowMaterial,
    spokeGlowMaterial,
    ringStates,
    satelliteHolder,
    connectorGeometry,
    connectorMaterial,
    eventAge: -1,
    eventDuration: 1,
    colorSeed: spec.seed,
    energy: 0,
    homeZ: spec.z,
  };
}

export function createProceduralOrreryField({ camera = null } = {}) {
  const group = new THREE.Group();
  group.name = 'procedural-orrery-field-v4.8';
  group.userData.kind = 'procedural-orrery-field-v4.8';

  const shared = {
    hubGeometry: new THREE.IcosahedronGeometry(1, 2),
    satelliteGeometry: new THREE.IcosahedronGeometry(1, 1),
    strutGeometry: new THREE.CylinderGeometry(0.44, 0.44, 1, 6, 1, true),
    ringGeometries: RING_SPECS.map((ring) => new THREE.TorusGeometry(ring.radius, ring.tube, 8, 96)),
  };

  const assemblies = FIELD_SPECS.map((spec, index) => {
    const assembly = buildAssembly(spec, index, shared);
    group.add(assembly.root);
    return assembly;
  });

  let suspended = false;
  let compact = false;
  let effectsEnabled = true;
  let pointerActive = false;
  const pointer = new THREE.Vector2();
  let nextEvent = randomBetween(FIRST_EVENT_MIN, FIRST_EVENT_MAX);
  let lastIndex = -1;

  function triggerAssembly(assembly, elapsed) {
    assembly.eventAge = 0;
    assembly.eventDuration = randomBetween(EVENT_DURATION_MIN, EVENT_DURATION_MAX);
    assembly.colorSeed = (assembly.spec.seed + elapsed * 0.011 + Math.random() * 0.35) % 1;
  }

  function scheduleEvent(elapsed) {
    const active = assemblies.filter((assembly) => assembly.eventAge >= 0).length;
    if (active >= MAX_SIMULTANEOUS) return;

    const candidates = assemblies
      .map((assembly, index) => ({ assembly, index }))
      .filter(({ assembly, index }) => assembly.eventAge < 0 && index !== lastIndex && assembly.root.visible);
    if (!candidates.length) return;

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    lastIndex = picked.index;
    triggerAssembly(picked.assembly, elapsed);

    if (Math.random() < 0.17 && active === 0 && candidates.length > 2) {
      const second = candidates[(candidates.indexOf(picked) + 2 + Math.floor(Math.random() * 3)) % candidates.length];
      if (second && second.index !== picked.index) triggerAssembly(second.assembly, elapsed + 0.7);
    }
  }

  function updateAssembly(assembly, elapsed, dt, index) {
    const spec = assembly.spec;
    const slowTime = elapsed;

    assembly.root.rotation.z = spec.rz + slowTime * spec.spin;
    assembly.root.rotation.y = spec.ry + Math.sin(slowTime * 0.021 + spec.seed * 11.0) * 0.055;
    assembly.root.rotation.x = spec.rx + Math.cos(slowTime * 0.017 + spec.seed * 9.0) * 0.032;
    assembly.root.position.z = assembly.homeZ + Math.sin(slowTime * 0.014 + spec.seed * 8.0) * 8.5;
    assembly.satelliteHolder.rotation.z = -slowTime * spec.spin * 1.7;
    assembly.satelliteHolder.rotation.y = Math.sin(slowTime * 0.012 + index) * 0.09;

    assembly.ringStates.forEach((ring, ringIndex) => {
      ring.holder.rotation.z = ring.phase + slowTime * ring.speed * (0.72 + spec.scale * 0.22);
      ring.holder.rotation.y += Math.sin(slowTime * 0.010 + ringIndex + spec.seed * 5.0) * 0.00008;
    });

    let energy = 0;
    let eventT = 0;
    if (assembly.eventAge >= 0) {
      assembly.eventAge += dt;
      eventT = assembly.eventAge / assembly.eventDuration;
      energy = eventEnvelope(eventT);
      if (eventT >= 1) {
        assembly.eventAge = -1;
        energy = 0;
      }
    }
    assembly.energy += (energy - assembly.energy) * (1 - Math.pow(0.008, Math.min(dt, 0.1)));

    const phase = assembly.colorSeed + elapsed * 0.018 + eventT * 0.42 + index * 0.071;
    const color = paletteColor(phase);
    const glowEnergy = assembly.energy * (compact ? 0.54 : 1);

    assembly.baseMaterial.emissive.copy(color);
    assembly.baseMaterial.emissiveIntensity = glowEnergy * 0.30;
    assembly.glowMaterial.color.copy(color);
    assembly.glowMaterial.opacity = glowEnergy * 0.31;
    assembly.spokeGlowMaterial.color.copy(color);
    assembly.spokeGlowMaterial.opacity = glowEnergy * 0.11;
    assembly.connectorMaterial.color.copy(color).multiplyScalar(0.48);
    assembly.connectorMaterial.opacity = 0.12 + glowEnergy * 0.13;

    assembly.ringStates.forEach((ring, ringIndex) => {
      ring.arcMaterial.uniforms.uColor.value.copy(color);
      ring.arcMaterial.uniforms.uEnergy.value = glowEnergy * (0.72 + ringIndex * 0.07);
      ring.arcMaterial.uniforms.uHead.value = eventT * (0.30 + ringIndex * 0.035) + ringIndex * 0.21 + spec.seed;
      ring.arcMaterial.uniforms.uWidth.value = 0.085 + ringIndex * 0.018;
    });
  }

  return {
    group,

    setSuspended(value) {
      suspended = Boolean(value);
      group.visible = !suspended;
      if (suspended) {
        for (const assembly of assemblies) {
          assembly.eventAge = -1;
          assembly.energy = 0;
          assembly.glowMaterial.opacity = 0;
          assembly.spokeGlowMaterial.opacity = 0;
          assembly.ringStates.forEach((ring) => {
            ring.arcMaterial.uniforms.uEnergy.value = 0;
          });
        }
      }
    },

    setEffectsEnabled(value) {
      effectsEnabled = Boolean(value);
    },

    setCompact(value) {
      compact = Boolean(value);
      assemblies.forEach((assembly, index) => {
        assembly.root.visible = !compact || index < 6;
      });
    },

    setPointerNdc(x, y, active = true) {
      pointer.set(Number(x) || 0, Number(y) || 0);
      pointerActive = Boolean(active);
    },

    triggerSparseIllumination() {
      if (suspended || !effectsEnabled) return false;
      scheduleEvent(performance.now() * 0.001);
      return true;
    },

    update(elapsed, delta) {
      if (suspended) return;
      const dt = Math.min(0.1, Math.max(0, delta));

      if (effectsEnabled) {
        nextEvent -= dt;
        if (nextEvent <= 0) {
          scheduleEvent(elapsed);
          nextEvent = randomBetween(EVENT_GAP_MIN, EVENT_GAP_MAX);
        }
      }

      // A very small camera-relative drift makes the whole mechanism feel
      // volumetric without turning the background into a mouse-following HUD.
      const pointerWeight = pointerActive ? 1 : 0;
      group.rotation.y += ((pointer.x * 0.012 * pointerWeight) - group.rotation.y) * (1 - Math.pow(0.03, dt));
      group.rotation.x += ((-pointer.y * 0.007 * pointerWeight) - group.rotation.x) * (1 - Math.pow(0.03, dt));

      assemblies.forEach((assembly, index) => updateAssembly(assembly, elapsed, dt, index));

      // Projecting one representative point keeps the field from becoming
      // visually dominant when the camera has moved very close to a card.
      if (camera && assemblies.length) {
        assemblies[0].root.getWorldPosition(TEMP_WORLD);
        const distance = camera.position.distanceTo(TEMP_WORLD);
        group.scale.setScalar(distance < 90 ? 0.82 : 1);
      }
    },

    dispose() {
      for (const assembly of assemblies) {
        assembly.baseMaterial.dispose();
        assembly.glowMaterial.dispose();
        assembly.spokeGlowMaterial.dispose();
        assembly.connectorGeometry.dispose();
        assembly.connectorMaterial.dispose();
        for (const ring of assembly.ringStates) ring.arcMaterial.dispose();
      }
      shared.hubGeometry.dispose();
      shared.satelliteGeometry.dispose();
      shared.strutGeometry.dispose();
      for (const geometry of shared.ringGeometries) geometry.dispose();
    },
  };
}
