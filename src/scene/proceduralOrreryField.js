import * as THREE from 'three';
import { lightColor } from './palette.js';

const SOURCE_URL = new URL(
  '../../Elemente/Orrery/orrery-source.png',
  import.meta.url,
).href;

const X_AXIS = new THREE.Vector3(1, 0, 0);
const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();
const TMP_MID = new THREE.Vector3();
const TMP_DIR = new THREE.Vector3();
const TMP_SCALE = new THREE.Vector3();
const TMP_QUAT = new THREE.Quaternion();
const TMP_MATRIX = new THREE.Matrix4();
const TMP_COLOUR = new THREE.Color();

const PALETTE = Object.freeze({
  ice: new THREE.Color(0xccefff),
  steel: lightColor('fiberBlue'),
  cyan: lightColor('fiber'),
  amber: lightColor('amber'),
  violet: lightColor('violet'),
  red: lightColor('signal'),
});

const CLUSTERS = Object.freeze([
  {
    name: 'left-envelope',
    position: [-31, -1, -42],
    rotation: [-0.08, 0.18, -0.20],
    scale: 1.18,
    speed: 0.0034,
    drift: 0.018,
    arcs: [
      [19, -1.36, 1.24, -1.2, 0.13],
      [22, -1.18, 0.78, 0.3, 0.09],
      [26, -1.05, 0.42, -2.0, 0.08],
      [15, -0.82, 1.58, 1.1, 0.07],
    ],
  },
  {
    name: 'right-envelope',
    position: [31, -2, -45],
    rotation: [0.06, -0.20, 2.92],
    scale: 1.22,
    speed: -0.0029,
    drift: 0.023,
    arcs: [
      [18, -1.50, 1.10, 0.7, 0.12],
      [22, -1.06, 0.72, -1.4, 0.09],
      [27, -0.96, 0.46, 1.8, 0.075],
      [14, -0.70, 1.68, -0.3, 0.065],
    ],
  },
  {
    name: 'upper-vault',
    position: [0, 22, -51],
    rotation: [0.14, 0.02, -0.52],
    scale: 1.30,
    speed: 0.0021,
    drift: 0.014,
    arcs: [
      [22, 2.95, 5.80, -0.6, 0.12],
      [27, 3.25, 5.35, 1.5, 0.085],
      [32, 3.48, 5.10, -2.1, 0.07],
      [17, 2.72, 5.65, 2.8, 0.06],
    ],
  },
  {
    name: 'lower-foundation',
    position: [0, -22, -58],
    rotation: [-0.12, 0.05, 0.44],
    scale: 1.34,
    speed: -0.0018,
    drift: 0.011,
    arcs: [
      [24, 0.08, 2.70, 0.2, 0.11],
      [29, 0.34, 2.38, -1.8, 0.08],
      [35, 0.58, 2.18, 2.3, 0.065],
      [18, -0.18, 2.85, -3.0, 0.06],
    ],
  },
  {
    name: 'deep-spine',
    position: [2, 1, -69],
    rotation: [0.05, -0.08, 1.18],
    scale: 1.55,
    speed: 0.0013,
    drift: 0.008,
    arcs: [
      [25, -0.92, 1.30, -1.0, 0.10],
      [31, -0.62, 1.02, 1.6, 0.07],
      [39, -0.38, 0.78, -2.5, 0.055],
    ],
  },
]);

const PATHS = Object.freeze([
  [[-54, 12, -37], [-28, 16, -44], [-4, 5, -39], [24, -6, -45], [53, -12, -43]],
  [[49, 21, -52], [25, 12, -39], [4, -2, -43], [-24, -12, -49], [-53, -5, -45]],
  [[-40, -25, -58], [-16, -11, -43], [6, -2, -36], [22, 13, -47], [42, 27, -58]],
  [[-19, 31, -61], [-8, 14, -44], [15, 4, -38], [31, -13, -47], [18, -31, -62]],
  [[47, -24, -55], [24, -16, -42], [0, 4, -37], [-21, 17, -48], [-45, 24, -59]],
  [[-52, 0, -47], [-25, -3, -38], [0, -13, -43], [27, -3, -40], [52, 4, -49]],
]);

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smooth01(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function makeRng(seed = 0x5f3759df) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

function setBoxBetween(target, index, start, end, thickness = 0.1, depth = thickness) {
  TMP_MID.copy(start).add(end).multiplyScalar(0.5);
  TMP_DIR.copy(end).sub(start);
  const length = Math.max(0.001, TMP_DIR.length());
  TMP_DIR.normalize();
  TMP_QUAT.setFromUnitVectors(X_AXIS, TMP_DIR);
  TMP_SCALE.set(length, thickness, depth);
  TMP_MATRIX.compose(TMP_MID, TMP_QUAT, TMP_SCALE);
  target.setMatrixAt(index, TMP_MATRIX);
}

function makeSharedUniforms() {
  return {
    uTime: { value: 0 },
    uVisible: { value: 1 },
    uCompact: { value: 0 },
    uDocumentOpen: { value: 0 },
    uAmbient: { value: 0.025 },
    uPulsePosA: { value: new THREE.Vector3(0, 0, -45) },
    uPulsePosB: { value: new THREE.Vector3(0, 0, -45) },
    uPulseColourA: { value: PALETTE.ice.clone() },
    uPulseColourB: { value: PALETTE.steel.clone() },
    uPulseStrengthA: { value: 0 },
    uPulseStrengthB: { value: 0 },
  };
}

function makeStructureMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: false,
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying float vMicro;

      void main() {
        vec4 transformed = vec4(position, 1.0);
        vec3 transformedNormal = normal;
        #ifdef USE_INSTANCING
          transformed = instanceMatrix * transformed;
          transformedNormal = mat3(instanceMatrix) * transformedNormal;
        #endif
        vec4 world = modelMatrix * transformed;
        vWorldPosition = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * transformedNormal);
        vMicro = 0.5 + 0.5 * sin(
          world.x * 0.37 + world.y * 0.23 + world.z * 0.19 + uTime * 0.16
        );
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uVisible, uCompact, uDocumentOpen, uAmbient;
      uniform vec3 uPulsePosA, uPulsePosB;
      uniform vec3 uPulseColourA, uPulseColourB;
      uniform float uPulseStrengthA, uPulseStrengthB;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying float vMicro;

      float pulseFalloff(vec3 point, vec3 centre, float radius) {
        float d = distance(point, centre);
        float inner = exp(-d * d / (radius * radius));
        float rim = exp(-abs(d - radius * 0.58) * 0.26) * 0.18;
        return inner + rim;
      }

      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float facing = 0.28 + 0.72 * abs(dot(normalize(vWorldNormal), viewDirection));
        float fresnel = pow(1.0 - abs(dot(normalize(vWorldNormal), viewDirection)), 3.0);

        float a = pulseFalloff(vWorldPosition, uPulsePosA, 18.0) * uPulseStrengthA;
        float b = pulseFalloff(vWorldPosition, uPulsePosB, 24.0) * uPulseStrengthB;
        float lightAmount = a + b;

        vec3 pulseColour = (
          uPulseColourA * a + uPulseColourB * b
        ) / max(0.0001, a + b);
        vec3 darkMetal = vec3(0.004, 0.007, 0.011);
        vec3 coldMetal = vec3(0.055, 0.075, 0.092);
        vec3 colour = mix(darkMetal, coldMetal, uAmbient * (0.55 + vMicro * 0.45));
        colour += pulseColour * lightAmount * (0.46 + facing * 0.62);
        colour += pulseColour * fresnel * lightAmount * 0.38;
        colour += vec3(0.14, 0.17, 0.20) * lightAmount * vMicro * 0.12;

        float idleAlpha = uAmbient * mix(0.42, 0.18, uCompact);
        float alpha = (idleAlpha + lightAmount * 0.88)
          * uVisible
          * mix(1.0, 0.93, uDocumentOpen)
          * (0.55 + facing * 0.45);
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.96));
      }
    `,
  });
}

function buildCluster(spec, material, rng) {
  const group = new THREE.Group();
  group.name = `machine-${spec.name}`;
  group.position.fromArray(spec.position);
  group.rotation.set(...spec.rotation);
  group.scale.setScalar(spec.scale);

  const railMatrices = [];
  const jointMatrices = [];
  const bracePairs = [];

  for (const [radius, start, end, z, thickness] of spec.arcs) {
    const arcLength = Math.abs(end - start) * radius;
    const segments = Math.max(18, Math.ceil(arcLength / 0.62));
    const anchorPoints = [];

    for (let index = 0; index < segments; index += 1) {
      const t0 = index / segments;
      const t1 = (index + 1) / segments;
      const a0 = THREE.MathUtils.lerp(start, end, t0);
      const a1 = THREE.MathUtils.lerp(start, end, t1);
      TMP_A.set(
        Math.cos(a0) * radius,
        Math.sin(a0) * radius,
        z + Math.sin(a0 * 2.7 + radius) * 0.18,
      );
      TMP_B.set(
        Math.cos(a1) * radius,
        Math.sin(a1) * radius,
        z + Math.sin(a1 * 2.7 + radius) * 0.18,
      );
      TMP_MID.copy(TMP_A).add(TMP_B).multiplyScalar(0.5);
      TMP_DIR.copy(TMP_B).sub(TMP_A);
      TMP_QUAT.setFromUnitVectors(X_AXIS, TMP_DIR.clone().normalize());
      TMP_SCALE.set(TMP_DIR.length() * 1.035, thickness, thickness * 0.72);
      TMP_MATRIX.compose(TMP_MID, TMP_QUAT, TMP_SCALE);
      railMatrices.push(TMP_MATRIX.clone());

      if (index % Math.max(4, Math.floor(segments / 11)) === 0) {
        anchorPoints.push(TMP_MID.clone());
        TMP_QUAT.setFromEuler(new THREE.Euler(a0 * 0.07, a0 * 0.11, a0));
        TMP_SCALE.setScalar(0.11 + thickness * 1.9);
        TMP_MATRIX.compose(TMP_MID, TMP_QUAT, TMP_SCALE);
        jointMatrices.push(TMP_MATRIX.clone());
      }
    }

    for (let i = 0; i < anchorPoints.length - 2; i += 2) {
      if (rng() < 0.68) {
        const inward = anchorPoints[i].clone().multiplyScalar(0.54 + rng() * 0.17);
        inward.z += (rng() - 0.5) * 2.4;
        bracePairs.push([anchorPoints[i], inward]);
      }
    }
  }

  // Cross-members make the arcs read as one huge machine rather than rings.
  for (let index = 0; index < 18; index += 1) {
    const angle = THREE.MathUtils.lerp(-1.45, 1.45, index / 17) + (rng() - 0.5) * 0.11;
    const inner = 4.2 + rng() * 7.0;
    const outer = 17.0 + rng() * 12.0;
    TMP_A.set(Math.cos(angle) * inner, Math.sin(angle) * inner, (rng() - 0.5) * 3.0);
    TMP_B.set(Math.cos(angle) * outer, Math.sin(angle) * outer, (rng() - 0.5) * 3.8);
    bracePairs.push([TMP_A.clone(), TMP_B.clone()]);
  }

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const rails = new THREE.InstancedMesh(boxGeometry, material, railMatrices.length + bracePairs.length);
  let railIndex = 0;
  for (const matrix of railMatrices) rails.setMatrixAt(railIndex++, matrix);
  for (const [start, end] of bracePairs) {
    setBoxBetween(rails, railIndex++, start, end, 0.055 + rng() * 0.055, 0.045 + rng() * 0.04);
  }
  rails.instanceMatrix.needsUpdate = true;
  rails.computeBoundingSphere();
  rails.frustumCulled = true;
  group.add(rails);

  const jointGeometry = new THREE.IcosahedronGeometry(1, 1);
  const jointCount = jointMatrices.length + 24;
  const joints = new THREE.InstancedMesh(jointGeometry, material, jointCount);
  let jointIndex = 0;
  for (const matrix of jointMatrices) joints.setMatrixAt(jointIndex++, matrix);
  while (jointIndex < jointCount) {
    const angle = rng() * Math.PI * 2;
    const radius = 8 + rng() * 22;
    TMP_MID.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      (rng() - 0.5) * 5.5,
    );
    TMP_QUAT.setFromEuler(new THREE.Euler(rng() * Math.PI, rng() * Math.PI, angle));
    TMP_SCALE.setScalar(0.10 + rng() * 0.22);
    TMP_MATRIX.compose(TMP_MID, TMP_QUAT, TMP_SCALE);
    joints.setMatrixAt(jointIndex++, TMP_MATRIX);
  }
  joints.instanceMatrix.needsUpdate = true;
  joints.computeBoundingSphere();
  group.add(joints);

  return {
    group,
    boxGeometry,
    jointGeometry,
    home: new THREE.Vector3().fromArray(spec.position),
    rotation: new THREE.Euler(...spec.rotation),
    speed: spec.speed,
    drift: spec.drift,
    phase: rng() * Math.PI * 2,
    dispose() {
      boxGeometry.dispose();
      jointGeometry.dispose();
    },
  };
}

function makeImprintMaterial(texture, uniforms) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uMap: { value: texture },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: false,
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(position.x * 0.055 + position.y * 0.037 + uTime * 0.025) * 0.16;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorldPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec2 uTexel;
      uniform float uVisible, uCompact, uDocumentOpen, uAmbient;
      uniform vec3 uPulsePosA, uPulsePosB;
      uniform vec3 uPulseColourA, uPulseColourB;
      uniform float uPulseStrengthA, uPulseStrengthB;
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      float luma(vec3 c) {
        return dot(c, vec3(0.2126, 0.7152, 0.0722));
      }

      void main() {
        vec4 source = texture2D(uMap, vUv);
        float centre = luma(source.rgb);
        float left = luma(texture2D(uMap, vUv - vec2(uTexel.x, 0.0)).rgb);
        float right = luma(texture2D(uMap, vUv + vec2(uTexel.x, 0.0)).rgb);
        float down = luma(texture2D(uMap, vUv - vec2(0.0, uTexel.y)).rgb);
        float up = luma(texture2D(uMap, vUv + vec2(0.0, uTexel.y)).rgb);
        float edge = abs(right - left) + abs(up - down);
        float chroma = max(source.r, max(source.g, source.b))
          - min(source.r, min(source.g, source.b));

        float darkMetal = smoothstep(0.04, 0.60, 0.91 - centre);
        float fineEdge = smoothstep(0.014, 0.12, edge);
        float colouredMetal = smoothstep(0.035, 0.18, chroma);
        float structure = max(darkMetal * 0.72, max(fineEdge, colouredMetal * 0.72));
        if (centre > 0.78 && chroma < 0.055 && edge < 0.025) structure *= 0.015;

        float da = distance(vWorldPosition, uPulsePosA);
        float db = distance(vWorldPosition, uPulsePosB);
        float a = exp(-da * da / 390.0) * uPulseStrengthA;
        float b = exp(-db * db / 620.0) * uPulseStrengthB;
        float reveal = a + b;
        float grain = 0.86 + 0.14 * sin(vUv.x * 711.0 + vUv.y * 487.0);
        vec3 pulseColour = (
          uPulseColourA * a + uPulseColourB * b
        ) / max(0.0001, a + b);

        vec3 metal = source.rgb * (0.006 + uAmbient * 0.025);
        metal += source.rgb * reveal * 0.54;
        metal += pulseColour * structure * reveal * (0.16 + edge * 1.7);
        metal *= grain;

        float edgeFade = smoothstep(0.0, 0.08, vUv.x)
          * smoothstep(0.0, 0.08, vUv.y)
          * smoothstep(0.0, 0.08, 1.0 - vUv.x)
          * smoothstep(0.0, 0.08, 1.0 - vUv.y);
        float alpha = structure
          * edgeFade
          * (uAmbient * 0.010 + reveal * 0.87)
          * uVisible
          * mix(1.0, 0.62, uCompact)
          * mix(1.0, 0.92, uDocumentOpen);
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(metal, clamp(alpha, 0.0, 0.92));
      }
    `,
  });
}

function createFogVeils(uniforms, rng) {
  const group = new THREE.Group();
  group.name = 'machine-world-fog';
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  const states = [];

  for (let index = 0; index < 6; index += 1) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: uniforms.uTime,
        uVisible: uniforms.uVisible,
        uCompact: uniforms.uCompact,
        uPhase: { value: rng() * 10 },
        uOpacity: { value: 0.055 + rng() * 0.045 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
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
        uniform float uTime, uVisible, uCompact, uPhase, uOpacity;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.52;
          for (int i = 0; i < 5; i++) {
            value += noise(p) * amplitude;
            p = p * 2.03 + vec2(17.3, 9.1);
            amplitude *= 0.49;
          }
          return value;
        }

        void main() {
          vec2 p = (vUv - 0.5) * vec2(2.2, 1.35);
          vec2 flow = vec2(uTime * 0.0038, -uTime * 0.0025) + uPhase;
          float cloud = fbm(p * 2.1 + flow);
          cloud *= fbm(p * 4.0 - flow * 1.6) * 0.75 + 0.35;
          float veil = smoothstep(0.30, 0.78, cloud);
          float vignette = smoothstep(1.12, 0.16, length(p));
          vec3 colour = mix(
            vec3(0.018, 0.030, 0.043),
            vec3(0.055, 0.082, 0.104),
            veil
          );
          float alpha = veil * vignette * uOpacity * uVisible * mix(1.0, 0.55, uCompact);
          if (alpha < 0.002) discard;
          gl_FragColor = vec4(colour, alpha);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (rng() - 0.5) * 34,
      (rng() - 0.5) * 18,
      -30 - index * 8 - rng() * 5,
    );
    mesh.scale.set(74 + rng() * 42, 40 + rng() * 25, 1);
    mesh.rotation.z = (rng() - 0.5) * 0.28;
    mesh.renderOrder = -30 + index;
    mesh.frustumCulled = false;
    group.add(mesh);
    states.push({
      mesh,
      homeX: mesh.position.x,
      homeY: mesh.position.y,
      phase: rng() * Math.PI * 2,
      speed: 0.0015 + rng() * 0.002,
    });
  }

  return {
    group,
    update(elapsed) {
      for (const state of states) {
        state.mesh.position.x = state.homeX
          + Math.sin(elapsed * state.speed + state.phase) * 1.8;
        state.mesh.position.y = state.homeY
          + Math.cos(elapsed * state.speed * 0.8 + state.phase) * 1.1;
      }
    },
    dispose() {
      geometry.dispose();
      for (const child of group.children) child.material.dispose();
    },
  };
}

function createDust(uniforms, rng) {
  const count = 4200;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 2);
  const sizes = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (rng() - 0.5) * 122;
    positions[index * 3 + 1] = (rng() - 0.5) * 70;
    positions[index * 3 + 2] = -24 - rng() * 64;
    seeds[index * 2] = rng();
    seeds[index * 2 + 1] = rng();
    sizes[index] = 0.45 + Math.pow(rng(), 2.3) * 2.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 2));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -50), 86);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uPixelRatio: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      attribute vec2 aSeed;
      attribute float aSize;
      uniform float uTime, uPixelRatio, uVisible, uCompact, uAmbient;
      uniform vec3 uPulsePosA, uPulsePosB;
      uniform float uPulseStrengthA, uPulseStrengthB;
      varying float vAlpha;
      varying float vMix;

      void main() {
        vec3 p = position;
        p.x += sin(uTime * (0.035 + aSeed.x * 0.025) + aSeed.y * 21.0) * (0.18 + aSeed.x * 0.48);
        p.y += cos(uTime * (0.027 + aSeed.y * 0.021) + aSeed.x * 17.0) * (0.13 + aSeed.y * 0.42);
        float a = exp(-distance(p, uPulsePosA) * 0.085) * uPulseStrengthA;
        float b = exp(-distance(p, uPulsePosB) * 0.062) * uPulseStrengthB;
        float pulse = a + b;
        vAlpha = (uAmbient * 0.028 + pulse * 0.74)
          * uVisible
          * mix(1.0, 0.35, uCompact)
          * (0.35 + aSeed.x * 0.65);
        vMix = b / max(0.0001, a + b);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = min(
          7.0,
          aSize * uPixelRatio * (145.0 / max(1.0, -mv.z)) * (0.65 + pulse * 1.9)
        );
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uPulseColourA, uPulseColourB;
      varying float vAlpha;
      varying float vMix;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        vec3 colour = mix(uPulseColourA, uPulseColourB, vMix);
        colour = mix(vec3(0.10, 0.15, 0.19), colour, 0.72);
        gl_FragColor = vec4(colour, vAlpha * core * core);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'machine-world-dust';
  points.frustumCulled = false;
  points.renderOrder = -4;

  return {
    points,
    material,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createPulseCore() {
  const group = new THREE.Group();
  group.name = 'travelling-illumination-core';
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.ice.clone(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const haloMaterial = coreMaterial.clone();
  const coreGeometry = new THREE.IcosahedronGeometry(0.30, 2);
  const haloGeometry = new THREE.IcosahedronGeometry(1.0, 2);
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.scale.setScalar(2.6);
  group.add(core, halo);
  group.visible = false;

  return {
    group,
    set(position, colour, strength) {
      group.position.copy(position);
      group.visible = strength > 0.005;
      coreMaterial.color.copy(colour);
      haloMaterial.color.copy(colour);
      coreMaterial.opacity = Math.min(0.92, strength * 0.72);
      haloMaterial.opacity = Math.min(0.18, strength * 0.12);
      const scale = 0.82 + strength * 0.55;
      core.scale.setScalar(scale);
      halo.scale.setScalar(2.5 + strength * 1.5);
    },
    dispose() {
      coreGeometry.dispose();
      haloGeometry.dispose();
      coreMaterial.dispose();
      haloMaterial.dispose();
    },
  };
}

function choosePulseColour(rng) {
  const roll = rng();
  if (roll < 0.48) return PALETTE.ice;
  if (roll < 0.70) return PALETTE.steel;
  if (roll < 0.84) return PALETTE.amber;
  if (roll < 0.96) return PALETTE.violet;
  return PALETTE.red;
}

function makeEventCurve(rng) {
  const source = PATHS[Math.floor(rng() * PATHS.length) % PATHS.length];
  const offsetX = (rng() - 0.5) * 9;
  const offsetY = (rng() - 0.5) * 8;
  const offsetZ = (rng() - 0.5) * 7;
  const points = source.map(([x, y, z], index) => new THREE.Vector3(
    x + offsetX * Math.sin((index + 1) * 1.37),
    y + offsetY * Math.cos((index + 1) * 1.11),
    z + offsetZ * Math.sin((index + 1) * 0.83),
  ));
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45);
}

export function createProceduralOrreryField({ camera = null, renderer = null } = {}) {
  const group = new THREE.Group();
  group.name = 'oversized-dark-machine-world-v5.4';
  group.userData.kind = 'oversized-dark-machine-world-v5.4';

  const rng = makeRng(0x20260902);
  const uniforms = makeSharedUniforms();
  const structureMaterial = makeStructureMaterial(uniforms);
  const clusters = CLUSTERS.map((spec) => buildCluster(spec, structureMaterial, rng));
  for (const cluster of clusters) group.add(cluster.group);

  const placeholder = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 0]),
    1,
    1,
    THREE.RGBAFormat,
  );
  placeholder.needsUpdate = true;

  const imprintGeometry = new THREE.PlaneGeometry(126, 126, 48, 48);
  const imprintMaterial = makeImprintMaterial(placeholder, uniforms);
  const imprint = new THREE.Mesh(imprintGeometry, imprintMaterial);
  imprint.name = 'giant-mechanical-imprint';
  imprint.position.set(0, 2, -63);
  imprint.rotation.set(-0.018, 0.015, -0.05);
  imprint.renderOrder = -20;
  imprint.frustumCulled = false;
  group.add(imprint);

  const fog = createFogVeils(uniforms, rng);
  group.add(fog.group);

  const dust = createDust(uniforms, rng);
  group.add(dust.points);

  const pulseCoreA = createPulseCore();
  const pulseCoreB = createPulseCore();
  group.add(pulseCoreA.group, pulseCoreB.group);

  let sourceTexture = placeholder;
  let disposed = false;
  let effectsEnabled = true;
  let compact = false;
  let documentOpen = false;
  let externallySuspended = false;
  let visibility = 1;
  let visibilityTarget = 1;
  let currentCurve = null;
  let eventStart = 0;
  let eventDuration = 5.5;
  let nextEventAt = 3.5 + rng() * 4.5;
  let eventColourA = PALETTE.ice.clone();
  let eventColourB = PALETTE.steel.clone();
  let manualBurst = 0;
  let manualCurve = null;

  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  new THREE.TextureLoader().load(
    SOURCE_URL,
    (texture) => {
      if (disposed) {
        texture.dispose();
        resolveReady(false);
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.anisotropy = Math.min(
        6,
        renderer?.capabilities?.getMaxAnisotropy?.() || 4,
      );
      texture.needsUpdate = true;
      sourceTexture = texture;
      imprintMaterial.uniforms.uMap.value = texture;
      const width = texture.image?.naturalWidth || texture.image?.width || 1024;
      const height = texture.image?.naturalHeight || texture.image?.height || 1024;
      imprintMaterial.uniforms.uTexel.value.set(1 / width, 1 / height);
      resolveReady(true);
    },
    undefined,
    (error) => {
      console.warn('Mechanical source texture could not be loaded.', error);
      resolveReady(false);
    },
  );

  function startEvent(elapsed, forced = false) {
    currentCurve = forced && manualCurve ? manualCurve : makeEventCurve(rng);
    eventStart = elapsed;
    eventDuration = forced ? 4.4 : 4.8 + rng() * 2.7;
    eventColourA = choosePulseColour(rng).clone();
    eventColourB = rng() < 0.72
      ? PALETTE.ice.clone()
      : choosePulseColour(rng).clone();
    uniforms.uPulseColourA.value.copy(eventColourA);
    uniforms.uPulseColourB.value.copy(eventColourB);
  }

  function updatePulse(elapsed) {
    if (!currentCurve && elapsed >= nextEventAt) startEvent(elapsed);
    if (manualBurst > 0.02 && !currentCurve) startEvent(elapsed, true);

    if (!currentCurve) {
      uniforms.uPulseStrengthA.value = 0;
      uniforms.uPulseStrengthB.value = 0;
      pulseCoreA.set(uniforms.uPulsePosA.value, eventColourA, 0);
      pulseCoreB.set(uniforms.uPulsePosB.value, eventColourB, 0);
      return;
    }

    const raw = (elapsed - eventStart) / eventDuration;
    if (raw >= 1) {
      currentCurve = null;
      uniforms.uPulseStrengthA.value = 0;
      uniforms.uPulseStrengthB.value = 0;
      nextEventAt = elapsed + 8 + rng() * 11;
      pulseCoreA.group.visible = false;
      pulseCoreB.group.visible = false;
      return;
    }

    const progress = clamp01(raw);
    const envelope = smooth01(progress / 0.15)
      * (1 - smooth01((progress - 0.78) / 0.22));
    const mainPoint = currentCurve.getPointAt(progress, uniforms.uPulsePosA.value);
    const trailPoint = currentCurve.getPointAt(Math.max(0, progress - 0.105), uniforms.uPulsePosB.value);
    const variation = 0.84 + Math.sin(elapsed * 3.1) * 0.08 + Math.sin(elapsed * 7.7) * 0.035;
    const boost = 1 + manualBurst * 0.65;
    const mainStrength = envelope * variation * boost;
    const trailStrength = envelope * 0.48 * boost;
    uniforms.uPulseStrengthA.value = mainStrength;
    uniforms.uPulseStrengthB.value = trailStrength;
    pulseCoreA.set(mainPoint, eventColourA, mainStrength);
    pulseCoreB.set(trailPoint, eventColourB, trailStrength);
  }

  return {
    group,
    ready,

    setEffectsEnabled(value) {
      effectsEnabled = Boolean(value);
      visibilityTarget = effectsEnabled ? 1 : 0;
      if (effectsEnabled) group.visible = true;
    },

    setSuspended(value) {
      // The world deliberately keeps moving behind the opened CV. Suspension
      // only reduces secondary activity; it never freezes or hides the scene.
      externallySuspended = Boolean(value);
    },

    setDocumentOpen(value) {
      documentOpen = Boolean(value);
      uniforms.uDocumentOpen.value = documentOpen ? 1 : 0;
      externallySuspended = documentOpen;
    },

    setCompact(value) {
      compact = Boolean(value);
      uniforms.uCompact.value = compact ? 1 : 0;
      clusters[4].group.visible = !compact;
      dust.points.geometry.setDrawRange(0, compact ? 1900 : 4200);
    },

    setPointerNdc() {
      // Illumination is intentionally autonomous and does not follow the cursor.
    },

    setPixelRatio(value) {
      dust.material.uniforms.uPixelRatio.value = Math.min(
        1.6,
        Math.max(0.75, Number(value) || 1),
      );
    },

    setAmbient(value) {
      uniforms.uAmbient.value = THREE.MathUtils.clamp(Number(value) || 0, 0.008, 0.08);
    },

    triggerSparseIllumination() {
      manualBurst = 1;
      nextEventAt = 0;
      manualCurve = makeEventCurve(rng);
      return true;
    },

    update(elapsed, delta) {
      const dt = Math.min(0.1, Math.max(0, delta || 0));
      const response = 1 - Math.pow(0.002, dt);
      visibility += (visibilityTarget - visibility) * response;
      uniforms.uVisible.value = visibility;
      uniforms.uTime.value = elapsed;
      manualBurst = Math.max(0, manualBurst - dt / 3.2);

      if (!effectsEnabled && visibility < 0.002) {
        group.visible = false;
        return;
      }
      group.visible = true;

      updatePulse(elapsed);
      const activity = externallySuspended ? 0.82 : 1;

      clusters.forEach((cluster, index) => {
        cluster.group.rotation.z = cluster.rotation.z
          + elapsed * cluster.speed * activity
          + Math.sin(elapsed * cluster.drift + cluster.phase) * 0.018;
        cluster.group.rotation.x = cluster.rotation.x
          + Math.sin(elapsed * cluster.drift * 0.72 + cluster.phase) * 0.012;
        cluster.group.rotation.y = cluster.rotation.y
          + Math.cos(elapsed * cluster.drift * 0.64 + cluster.phase) * 0.017;
        cluster.group.position.x = cluster.home.x
          + Math.sin(elapsed * cluster.drift * 0.41 + cluster.phase) * (0.22 + index * 0.035);
        cluster.group.position.y = cluster.home.y
          + Math.cos(elapsed * cluster.drift * 0.35 + cluster.phase) * (0.16 + index * 0.03);
      });

      imprint.rotation.z = -0.05 + Math.sin(elapsed * 0.0042) * 0.014;
      imprint.rotation.y = 0.015 + Math.sin(elapsed * 0.0031) * 0.018;
      imprint.position.x = Math.sin(elapsed * 0.0027) * 0.75;
      imprint.position.y = 2 + Math.cos(elapsed * 0.0021) * 0.52;
      fog.update(elapsed);

      if (camera) {
        group.position.x += (
          THREE.MathUtils.clamp(camera.position.x * -0.015, -0.75, 0.75)
          - group.position.x
        ) * Math.min(1, dt * 0.52);
        group.position.y += (
          THREE.MathUtils.clamp(camera.position.y * -0.008, -0.45, 0.45)
          - group.position.y
        ) * Math.min(1, dt * 0.52);
      }
    },

    dispose() {
      disposed = true;
      for (const cluster of clusters) cluster.dispose();
      structureMaterial.dispose();
      imprintGeometry.dispose();
      imprintMaterial.dispose();
      fog.dispose();
      dust.dispose();
      pulseCoreA.dispose();
      pulseCoreB.dispose();
      if (sourceTexture !== placeholder) sourceTexture.dispose();
      placeholder.dispose();
      group.clear();
    },
  };
}
