// EPIC_DARK_MACHINE_WORLD_V5_5_2
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
const TMP_WORLD_TO_MACHINE = new THREE.Matrix4();

const PALETTE = Object.freeze({
  ice: new THREE.Color(0xccefff),
  steel: lightColor('fiberBlue'),
  cyan: lightColor('fiber'),
  amber: lightColor('amber'),
  violet: lightColor('violet'),
  red: lightColor('signal'),
});

// Deliberately non-circular gantries. Every cluster consists of long,
// irregular machine rails and cross-members; no ring or centre-spoke geometry
// is generated anywhere in this module.
const GANTRY_BLUEPRINTS = Object.freeze([
  {
    name: 'left-envelope',
    position: [-35, -3, -53],
    rotation: [-0.08, 0.22, -0.34],
    scale: 1.34,
    speed: 0.00310,
    drift: 0.0165,
    span: 43,
    rise: 8.5,
    depth: 5.8,
    slope: 7.5,
    tracks: 4,
    trackGap: 2.7,
    phase: 0.7,
  },
  {
    name: 'right-envelope',
    position: [36, -4, -56],
    rotation: [0.06, -0.21, 2.78],
    scale: 1.38,
    speed: -0.00275,
    drift: 0.0178,
    span: 45,
    rise: 8.0,
    depth: 6.4,
    slope: -6.0,
    tracks: 4,
    trackGap: 2.9,
    phase: 2.2,
  },
  {
    name: 'upper-canopy',
    position: [-8, 27, -67],
    rotation: [0.12, 0.05, -0.68],
    scale: 1.48,
    speed: 0.00220,
    drift: 0.0135,
    span: 54,
    rise: 6.8,
    depth: 7.0,
    slope: 3.5,
    tracks: 5,
    trackGap: 2.5,
    phase: 4.1,
  },
  {
    name: 'lower-bridge',
    position: [10, -28, -71],
    rotation: [-0.11, 0.07, 0.59],
    scale: 1.54,
    speed: -0.00190,
    drift: 0.0118,
    span: 56,
    rise: 7.2,
    depth: 7.8,
    slope: 4.8,
    tracks: 5,
    trackGap: 2.6,
    phase: 5.8,
  },
  {
    name: 'rear-lattice',
    position: [25, 12, -86],
    rotation: [0.05, -0.11, 1.34],
    scale: 1.72,
    speed: 0.00135,
    drift: 0.0092,
    span: 61,
    rise: 9.2,
    depth: 9.0,
    slope: -2.8,
    tracks: 5,
    trackGap: 3.1,
    phase: 7.6,
  },
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
  TMP_DIR.multiplyScalar(1 / length);
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
    uAmbient: { value: 0.014 },
    uWorldToMachine: { value: new THREE.Matrix4() },
    uPulsePosA: { value: new THREE.Vector3(0, 0, -52) },
    uPulsePosB: { value: new THREE.Vector3(0, 0, -52) },
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
      uniform mat4 uWorldToMachine;
      varying vec3 vMachinePosition;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      varying float vMicro;

      void main() {
        vec4 transformed = vec4(position, 1.0);
        vec3 transformedNormal = normal;
        #ifdef USE_INSTANCING
          mat3 instanceBasis = mat3(instanceMatrix);
          vec3 inverseScaleSquared = vec3(
            1.0 / max(dot(instanceBasis[0], instanceBasis[0]), 0.000001),
            1.0 / max(dot(instanceBasis[1], instanceBasis[1]), 0.000001),
            1.0 / max(dot(instanceBasis[2], instanceBasis[2]), 0.000001)
          );
          transformed = instanceMatrix * transformed;
          transformedNormal = instanceBasis
            * (transformedNormal * inverseScaleSquared);
        #endif

        vec4 world = modelMatrix * transformed;
        vec4 viewPosition = viewMatrix * world;
        vMachinePosition = (uWorldToMachine * world).xyz;
        vViewNormal = normalize(normalMatrix * transformedNormal);
        vViewDirection = normalize(-viewPosition.xyz);
        vMicro = 0.5 + 0.5 * sin(
          vMachinePosition.x * 0.31
          + vMachinePosition.y * 0.23
          + vMachinePosition.z * 0.17
          + uTime * 0.13
        );
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uVisible, uCompact, uDocumentOpen, uAmbient;
      uniform vec3 uPulsePosA, uPulsePosB;
      uniform vec3 uPulseColourA, uPulseColourB;
      uniform float uPulseStrengthA, uPulseStrengthB;
      varying vec3 vMachinePosition;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      varying float vMicro;

      float pulseFalloff(vec3 point, vec3 centre, float radius) {
        float distanceToLight = distance(point, centre);
        float core = exp(
          -(distanceToLight * distanceToLight) / (radius * radius)
        );
        float haloRadius = radius * 1.72;
        float halo = exp(
          -(distanceToLight * distanceToLight) / (haloRadius * haloRadius)
        ) * 0.12;
        return core + halo;
      }

      void main() {
        float facing = 0.24 + 0.76 * abs(dot(
          normalize(vViewNormal),
          normalize(vViewDirection)
        ));
        float fresnel = pow(
          1.0 - abs(dot(normalize(vViewNormal), normalize(vViewDirection))),
          2.7
        );

        float a = pulseFalloff(vMachinePosition, uPulsePosA, 7.4)
          * uPulseStrengthA;
        float b = pulseFalloff(vMachinePosition, uPulsePosB, 9.8)
          * uPulseStrengthB;
        float illumination = a + b;
        vec3 pulseColour = (
          uPulseColourA * a + uPulseColourB * b
        ) / max(0.0001, illumination);

        vec3 darkMetal = vec3(0.003, 0.006, 0.010);
        vec3 coldMetal = vec3(0.047, 0.067, 0.086);
        vec3 colour = mix(
          darkMetal,
          coldMetal,
          uAmbient * (0.52 + vMicro * 0.48)
        );
        colour += pulseColour * illumination * (0.42 + facing * 0.68);
        colour += pulseColour * fresnel * illumination * 0.34;
        colour += vec3(0.13, 0.16, 0.19)
          * illumination * vMicro * 0.11;

        float idleAlpha = uAmbient * mix(0.34, 0.15, uCompact);
        float depthVeil = mix(
          0.88,
          0.54,
          smoothstep(38.0, 94.0, -vMachinePosition.z)
        );
        float alpha = (idleAlpha + illumination * 0.86)
          * uVisible
          * mix(1.0, 0.94, uDocumentOpen)
          * (0.52 + facing * 0.48)
          * depthVeil;
        if (alpha < 0.0018) discard;
        gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.94));
      }
    `,
  });
}

function createControlPoints(spec, trackIndex, rng) {
  const points = [];
  const count = 7;
  const bandOffset = (trackIndex - (spec.tracks - 1) * 0.5) * spec.trackGap;
  const phase = spec.phase + trackIndex * 0.73;

  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const edge = Math.sin(Math.PI * t);
    const x = THREE.MathUtils.lerp(-spec.span * 0.5, spec.span * 0.5, t);
    const y = (t - 0.5) * spec.slope
      + Math.sin(t * Math.PI * 1.65 + phase) * spec.rise * 0.46
      + Math.sin(t * Math.PI * 3.1 + phase * 0.61) * spec.rise * 0.15
      + bandOffset;
    const z = Math.cos(t * Math.PI * 1.9 + phase * 0.77) * spec.depth * 0.54
      + Math.sin(t * Math.PI * 3.7 + phase) * spec.depth * 0.16
      + (trackIndex - spec.tracks * 0.5) * 0.42;

    points.push(new THREE.Vector3(
      x + (rng() - 0.5) * edge * 1.4,
      y + (rng() - 0.5) * edge * 1.1,
      z + (rng() - 0.5) * edge * 0.9,
    ));
  }
  return points;
}

function buildGantry(spec, material, railGeometry, jointGeometry, rng) {
  const group = new THREE.Group();
  group.name = `machine-${spec.name}`;
  group.position.fromArray(spec.position);
  group.rotation.set(...spec.rotation);
  group.scale.setScalar(spec.scale);
  group.renderOrder = -15;

  const sampledTracks = [];
  const railPairs = [];
  const jointMatrices = [];
  const anchorPoints = [];
  const segmentCount = Math.max(42, Math.ceil(spec.span / 0.72));

  for (let trackIndex = 0; trackIndex < spec.tracks; trackIndex += 1) {
    const curve = new THREE.CatmullRomCurve3(
      createControlPoints(spec, trackIndex, rng),
      false,
      'centripetal',
      0.42,
    );
    const points = curve.getSpacedPoints(segmentCount);
    sampledTracks.push(points);

    for (let index = 0; index < points.length - 1; index += 1) {
      railPairs.push([
        points[index],
        points[index + 1],
        0.060 + trackIndex * 0.006,
        0.050 + trackIndex * 0.004,
      ]);

      if (index % 7 === 0) {
        const point = points[index].clone();
        anchorPoints.push(point);
        TMP_QUAT.setFromEuler(new THREE.Euler(
          point.y * 0.012,
          point.z * 0.016,
          point.x * 0.008,
        ));
        TMP_SCALE.setScalar(0.13 + (index % 4) * 0.025);
        TMP_MATRIX.compose(point, TMP_QUAT, TMP_SCALE);
        jointMatrices.push(TMP_MATRIX.clone());
      }
    }
  }

  // Cross-members join neighbouring rails. They are short, oblique and never
  // point towards a shared centre.
  for (let trackIndex = 0; trackIndex < sampledTracks.length - 1; trackIndex += 1) {
    const a = sampledTracks[trackIndex];
    const b = sampledTracks[trackIndex + 1];
    for (let index = 4; index < Math.min(a.length, b.length) - 3; index += 8) {
      railPairs.push([
        a[index],
        b[Math.min(b.length - 1, index + (trackIndex % 2 ? 1 : -1))],
        0.048,
        0.042,
      ]);
    }
  }

  // A few long chords make the structure read as one enormous hull. Endpoints
  // are selected from existing rails only; no ray begins at an origin.
  for (let index = 0; index < 22 && anchorPoints.length > 10; index += 1) {
    const start = anchorPoints[Math.floor(rng() * anchorPoints.length)];
    const end = anchorPoints[Math.floor(rng() * anchorPoints.length)];
    if (!start || !end || start.distanceTo(end) < 7.5) continue;
    const middle = start.clone().lerp(end, 0.5);
    middle.x += (rng() - 0.5) * 3.4;
    middle.y += (rng() - 0.5) * 2.8;
    middle.z += (rng() - 0.5) * 3.6;
    railPairs.push([start, middle, 0.042, 0.038]);
    railPairs.push([middle, end, 0.042, 0.038]);
  }

  const rails = new THREE.InstancedMesh(
    railGeometry,
    material,
    Math.max(1, railPairs.length),
  );
  rails.name = `${spec.name}-rails`;
  railPairs.forEach(([start, end, thickness, depth], index) => {
    setBoxBetween(rails, index, start, end, thickness, depth);
  });
  rails.instanceMatrix.needsUpdate = true;
  rails.computeBoundingSphere();
  rails.frustumCulled = true;
  rails.renderOrder = -15;
  group.add(rails);

  const extraJoints = 18;
  const joints = new THREE.InstancedMesh(
    jointGeometry,
    material,
    Math.max(1, jointMatrices.length + extraJoints),
  );
  joints.name = `${spec.name}-joints`;
  let jointIndex = 0;
  for (const matrix of jointMatrices) joints.setMatrixAt(jointIndex++, matrix);
  while (jointIndex < jointMatrices.length + extraJoints) {
    const source = anchorPoints[Math.floor(rng() * anchorPoints.length)]
      || new THREE.Vector3();
    TMP_MID.copy(source).add(new THREE.Vector3(
      (rng() - 0.5) * 1.5,
      (rng() - 0.5) * 1.5,
      (rng() - 0.5) * 1.2,
    ));
    TMP_QUAT.setFromEuler(new THREE.Euler(
      rng() * Math.PI,
      rng() * Math.PI,
      rng() * Math.PI,
    ));
    TMP_SCALE.setScalar(0.10 + rng() * 0.21);
    TMP_MATRIX.compose(TMP_MID, TMP_QUAT, TMP_SCALE);
    joints.setMatrixAt(jointIndex++, TMP_MATRIX);
  }
  joints.instanceMatrix.needsUpdate = true;
  joints.computeBoundingSphere();
  joints.frustumCulled = true;
  joints.renderOrder = -14;
  group.add(joints);

  return {
    group,
    anchors: anchorPoints,
    home: new THREE.Vector3().fromArray(spec.position),
    rotation: new THREE.Euler(...spec.rotation),
    speed: spec.speed,
    drift: spec.drift,
    phase: rng() * Math.PI * 2,
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
      uniform mat4 uWorldToMachine;
      varying vec2 vUv;
      varying vec3 vMachinePosition;

      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(position.x * 0.047 + position.y * 0.033 + uTime * 0.021) * 0.14;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vMachinePosition = (uWorldToMachine * world).xyz;
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
      varying vec3 vMachinePosition;

      float luma(vec3 colour) {
        return dot(colour, vec3(0.2126, 0.7152, 0.0722));
      }

      void main() {
        vec2 uvLeft = clamp(vUv - vec2(uTexel.x, 0.0), 0.0, 1.0);
        vec2 uvRight = clamp(vUv + vec2(uTexel.x, 0.0), 0.0, 1.0);
        vec2 uvDown = clamp(vUv - vec2(0.0, uTexel.y), 0.0, 1.0);
        vec2 uvUp = clamp(vUv + vec2(0.0, uTexel.y), 0.0, 1.0);

        vec4 source = texture2D(uMap, vUv);
        float centreLuma = luma(source.rgb);
        float left = luma(texture2D(uMap, uvLeft).rgb);
        float right = luma(texture2D(uMap, uvRight).rgb);
        float down = luma(texture2D(uMap, uvDown).rgb);
        float up = luma(texture2D(uMap, uvUp).rgb);
        float edge = abs(right - left) + abs(up - down);
        float chroma = max(source.r, max(source.g, source.b))
          - min(source.r, min(source.g, source.b));

        float darkMetal = smoothstep(0.04, 0.60, 0.91 - centreLuma);
        float fineEdge = smoothstep(0.014, 0.12, edge);
        float colouredMetal = smoothstep(0.035, 0.18, chroma);
        float structure = max(
          darkMetal * 0.70,
          max(fineEdge, colouredMetal * 0.70)
        );
        if (centreLuma > 0.78 && chroma < 0.055 && edge < 0.025) {
          structure *= 0.012;
        }

        // Only peripheral, broken machine fragments survive. The original
        // central circular mechanism and its spokes are removed in the shader;
        // the source image itself remains unchanged on disk.
        vec2 centredUv = vUv - 0.5;
        float sourceRadius = length(centredUv);
        float centreVoid = smoothstep(0.285, 0.435, sourceRadius);
        float fragmentA = exp(-dot(
          (vUv - vec2(0.13, 0.55)) * vec2(1.30, 0.80),
          (vUv - vec2(0.13, 0.55)) * vec2(1.30, 0.80)
        ) * 14.0);
        float fragmentB = exp(-dot(
          (vUv - vec2(0.87, 0.47)) * vec2(1.28, 0.84),
          (vUv - vec2(0.87, 0.47)) * vec2(1.28, 0.84)
        ) * 14.5);
        float fragmentC = exp(-dot(
          (vUv - vec2(0.55, 0.10)) * vec2(0.88, 1.42),
          (vUv - vec2(0.55, 0.10)) * vec2(0.88, 1.42)
        ) * 16.0);
        float fragmentD = exp(-dot(
          (vUv - vec2(0.42, 0.91)) * vec2(0.90, 1.36),
          (vUv - vec2(0.42, 0.91)) * vec2(0.90, 1.36)
        ) * 15.0);
        float fragmentWindow = smoothstep(
          0.10,
          0.44,
          max(max(fragmentA, fragmentB), max(fragmentC, fragmentD))
        );
        // Skewed hull bands replace the former radial breakup. No spoke-like
        // pattern can radiate from the image centre anymore.
        float hullNoise = sin(vUv.x * 29.0 + vUv.y * 8.0 + 0.7)
          * cos(vUv.y * 23.0 - vUv.x * 5.0 - 0.3);
        float brokenContinuity = 0.22 + 0.78 * smoothstep(
          -0.28,
          0.62,
          hullNoise
        );
        structure *= centreVoid * fragmentWindow * brokenContinuity;

        float distanceA = distance(vMachinePosition, uPulsePosA);
        float distanceB = distance(vMachinePosition, uPulsePosB);
        float a = exp(-(distanceA * distanceA) / 72.0) * uPulseStrengthA;
        float b = exp(-(distanceB * distanceB) / 132.0) * uPulseStrengthB;
        float reveal = a + b;
        vec3 pulseColour = (
          uPulseColourA * a + uPulseColourB * b
        ) / max(0.0001, reveal);
        float grain = 0.86 + 0.14 * sin(vUv.x * 711.0 + vUv.y * 487.0);

        vec3 metal = source.rgb * (0.002 + uAmbient * 0.010);
        metal += source.rgb * reveal * 0.53;
        metal += pulseColour * structure * reveal * (0.15 + edge * 1.65);
        metal *= grain;

        float edgeFade = smoothstep(0.0, 0.08, vUv.x)
          * smoothstep(0.0, 0.08, vUv.y)
          * smoothstep(0.0, 0.08, 1.0 - vUv.x)
          * smoothstep(0.0, 0.08, 1.0 - vUv.y);
        float depthVeil = mix(
          0.82,
          0.58,
          smoothstep(42.0, 92.0, -vMachinePosition.z)
        );
        float alpha = structure
          * edgeFade
          * (uAmbient * 0.003 + reveal * 0.90)
          * uVisible
          * mix(1.0, 0.58, uCompact)
          * mix(1.0, 0.93, uDocumentOpen)
          * depthVeil;
        if (alpha < 0.0018) discard;
        gl_FragColor = vec4(metal, clamp(alpha, 0.0, 0.90));
      }
    `,
  });
}

function createFogVeils(uniforms, rng) {
  const group = new THREE.Group();
  group.name = 'machine-world-fog';
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  const states = [];

  for (let index = 0; index < 5; index += 1) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: uniforms.uTime,
        uVisible: uniforms.uVisible,
        uCompact: uniforms.uCompact,
        uPhase: { value: rng() * 10 },
        uOpacity: { value: 0.045 + rng() * 0.038 },
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

        float hash(vec2 point) {
          return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 point) {
          vec2 cell = floor(point);
          vec2 local = fract(point);
          local = local * local * (3.0 - 2.0 * local);
          return mix(
            mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x),
            mix(
              hash(cell + vec2(0.0, 1.0)),
              hash(cell + vec2(1.0, 1.0)),
              local.x
            ),
            local.y
          );
        }

        float fbm(vec2 point) {
          float value = 0.0;
          float amplitude = 0.54;
          for (int octave = 0; octave < 4; octave += 1) {
            value += noise(point) * amplitude;
            point = point * 2.03 + vec2(17.3, 9.1);
            amplitude *= 0.49;
          }
          return value;
        }

        void main() {
          vec2 point = (vUv - 0.5) * vec2(2.2, 1.35);
          vec2 flow = vec2(uTime * 0.0032, -uTime * 0.0021) + uPhase;
          float cloud = fbm(point * 2.05 + flow);
          cloud *= fbm(point * 3.8 - flow * 1.5) * 0.72 + 0.34;
          float veil = smoothstep(0.32, 0.78, cloud);
          float vignette = smoothstep(1.12, 0.16, length(point));
          vec3 colour = mix(
            vec3(0.012, 0.022, 0.034),
            vec3(0.043, 0.066, 0.086),
            veil
          );
          float alpha = veil * vignette * uOpacity * uVisible
            * mix(1.0, 0.44, uCompact);
          if (alpha < 0.0018) discard;
          gl_FragColor = vec4(colour, alpha);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (rng() - 0.5) * 38,
      (rng() - 0.5) * 20,
      -34 - index * 10 - rng() * 5,
    );
    mesh.scale.set(78 + rng() * 44, 42 + rng() * 26, 1);
    mesh.rotation.z = (rng() - 0.5) * 0.24;
    mesh.renderOrder = -30 + index;
    mesh.frustumCulled = false;
    group.add(mesh);
    states.push({
      mesh,
      homeX: mesh.position.x,
      homeY: mesh.position.y,
      phase: rng() * Math.PI * 2,
      speed: 0.0013 + rng() * 0.0018,
      index,
    });
  }

  return {
    group,
    setCompact(value) {
      const compact = Boolean(value);
      for (const state of states) {
        state.mesh.visible = !compact || state.index < 3;
      }
    },
    update(elapsed) {
      for (const state of states) {
        state.mesh.position.x = state.homeX
          + Math.sin(elapsed * state.speed + state.phase) * 1.7;
        state.mesh.position.y = state.homeY
          + Math.cos(elapsed * state.speed * 0.78 + state.phase) * 1.0;
      }
    },
    dispose() {
      geometry.dispose();
      for (const state of states) state.mesh.material.dispose();
    },
  };
}

function createDust(uniforms, rng) {
  const count = 7200;
  const compactCount = 3000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 2);
  const sizes = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (rng() - 0.5) * 122;
    positions[index * 3 + 1] = (rng() - 0.5) * 70;
    positions[index * 3 + 2] = -24 - rng() * 66;
    seeds[index * 2] = rng();
    seeds[index * 2 + 1] = rng();
    sizes[index] = 0.42 + Math.pow(rng(), 2.25) * 2.55;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 2));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -52), 88);

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
      uniform mat4 uWorldToMachine;
      uniform vec3 uPulsePosA, uPulsePosB;
      uniform float uPulseStrengthA, uPulseStrengthB;
      varying float vAlpha;
      varying float vMix;

      void main() {
        vec3 point = position;
        point.x += sin(
          uTime * (0.032 + aSeed.x * 0.023) + aSeed.y * 21.0
        ) * (0.18 + aSeed.x * 0.46);
        point.y += cos(
          uTime * (0.025 + aSeed.y * 0.019) + aSeed.x * 17.0
        ) * (0.13 + aSeed.y * 0.39);

        vec4 world = modelMatrix * vec4(point, 1.0);
        vec3 machinePoint = (uWorldToMachine * world).xyz;
        float a = exp(-distance(machinePoint, uPulsePosA) * 0.17)
          * uPulseStrengthA;
        float b = exp(-distance(machinePoint, uPulsePosB) * 0.13)
          * uPulseStrengthB;
        float pulse = a + b;
        float depthVeil = smoothstep(24.0, 90.0, -machinePoint.z);
        vAlpha = (uAmbient * 0.015 + pulse * 1.02)
          * uVisible
          * mix(1.0, 0.34, uCompact)
          * (0.32 + aSeed.x * 0.68)
          * mix(0.88, 0.50, depthVeil);
        vMix = b / max(0.0001, a + b);

        vec4 viewPosition = viewMatrix * world;
        gl_PointSize = min(
          8.6,
          aSize * uPixelRatio
            * (164.0 / max(1.0, -viewPosition.z))
            * (0.56 + pulse * 2.45)
        );
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uPulseColourA, uPulseColourB;
      varying float vAlpha;
      varying float vMix;

      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float distanceToCentre = length(point);
        if (distanceToCentre > 0.5) discard;
        float core = smoothstep(0.5, 0.0, distanceToCentre);
        vec3 colour = mix(uPulseColourA, uPulseColourB, vMix);
        colour = mix(vec3(0.065, 0.10, 0.14), colour, 0.84);
        float alpha = vAlpha * core * core;
        if (alpha < 0.0015) discard;
        gl_FragColor = vec4(colour, alpha);
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
    setCompact(value) {
      geometry.setDrawRange(0, value ? compactCount : count);
    },
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
  const coreGeometry = new THREE.IcosahedronGeometry(0.25, 2);
  const haloGeometry = new THREE.IcosahedronGeometry(0.84, 2);
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.scale.setScalar(2.25);
  group.add(core, halo);
  group.visible = false;

  return {
    group,
    set(position, colour, strength, visibility) {
      const effective = Math.max(0, strength * visibility);
      group.position.copy(position);
      group.visible = effective > 0.004;
      coreMaterial.color.copy(colour);
      haloMaterial.color.copy(colour);
      coreMaterial.opacity = Math.min(0.86, effective * 0.66);
      haloMaterial.opacity = Math.min(0.14, effective * 0.095);
      core.scale.setScalar(0.78 + effective * 0.48);
      halo.scale.setScalar(2.15 + effective * 1.15);
    },
    hide() {
      group.visible = false;
      coreMaterial.opacity = 0;
      haloMaterial.opacity = 0;
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
  if (roll < 0.52) return PALETTE.ice;
  if (roll < 0.75) return PALETTE.steel;
  if (roll < 0.87) return PALETTE.amber;
  if (roll < 0.97) return PALETTE.violet;
  return PALETTE.red;
}

function sampleMachineAnchor(clusters, rng, excludedIndex = -1) {
  let clusterIndex = Math.floor(rng() * clusters.length) % clusters.length;
  if (clusters.length > 1 && clusterIndex === excludedIndex) {
    clusterIndex = (clusterIndex + 1 + Math.floor(rng() * (clusters.length - 1)))
      % clusters.length;
  }
  const cluster = clusters[clusterIndex];
  const local = cluster.anchors[
    Math.floor(rng() * cluster.anchors.length) % cluster.anchors.length
  ]?.clone() || new THREE.Vector3();
  cluster.group.updateMatrix();
  local.applyMatrix4(cluster.group.matrix);
  local.x += (rng() - 0.5) * 5.5;
  local.y += (rng() - 0.5) * 4.0;
  local.z += (rng() - 0.5) * 3.5;
  return { point: local, clusterIndex };
}

function makeEventCurve(clusters, rng) {
  const startSample = sampleMachineAnchor(clusters, rng);
  let endSample = sampleMachineAnchor(clusters, rng, startSample.clusterIndex);
  for (
    let attempt = 0;
    attempt < 6 && startSample.point.distanceTo(endSample.point) < 34;
    attempt += 1
  ) {
    endSample = sampleMachineAnchor(clusters, rng, startSample.clusterIndex);
  }

  const start = startSample.point;
  const end = endSample.point;
  const direction = end.clone().sub(start);
  const distance = Math.max(1, direction.length());
  const side = new THREE.Vector3(-direction.y, direction.x, 0).normalize();
  if (side.lengthSq() < 0.001) side.set(1, 0, 0);
  const depthAxis = new THREE.Vector3(0, 0, 1);
  const sideBend = Math.min(11, distance * 0.18) * (rng() < 0.5 ? -1 : 1);
  const depthBend = (rng() - 0.5) * Math.min(9, distance * 0.14);

  const controlA = start.clone().lerp(end, 0.31)
    .addScaledVector(side, sideBend)
    .addScaledVector(depthAxis, depthBend);
  const middle = start.clone().lerp(end, 0.53)
    .addScaledVector(side, -sideBend * 0.34)
    .add(new THREE.Vector3(
      (rng() - 0.5) * 3.6,
      (rng() - 0.5) * 3.2,
      (rng() - 0.5) * 3.8,
    ));
  const controlB = start.clone().lerp(end, 0.75)
    .addScaledVector(side, sideBend * 0.52)
    .addScaledVector(depthAxis, -depthBend * 0.48);

  return new THREE.CatmullRomCurve3(
    [start, controlA, middle, controlB, end],
    false,
    'centripetal',
    0.44,
  );
}

export function createProceduralOrreryField({ camera = null, renderer = null } = {}) {
  const group = new THREE.Group();
  group.name = 'oversized-dark-machine-world-v5.5.2';
  group.userData.kind = 'oversized-dark-machine-world-v5.5.2';

  const rng = makeRng(0x20260902);
  const uniforms = makeSharedUniforms();
  const structureMaterial = makeStructureMaterial(uniforms);
  const railGeometry = new THREE.BoxGeometry(1, 1, 1);
  const jointGeometry = new THREE.IcosahedronGeometry(1, 1);
  const clusters = GANTRY_BLUEPRINTS.map((spec) => buildGantry(
    spec,
    structureMaterial,
    railGeometry,
    jointGeometry,
    rng,
  ));
  for (const cluster of clusters) group.add(cluster.group);

  const placeholder = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 0]),
    1,
    1,
    THREE.RGBAFormat,
  );
  placeholder.needsUpdate = true;

  const imprintGeometry = new THREE.PlaneGeometry(128, 128, 40, 40);
  const imprintMaterial = makeImprintMaterial(placeholder, uniforms);
  const imprint = new THREE.Mesh(imprintGeometry, imprintMaterial);
  imprint.name = 'giant-mechanical-imprint';
  imprint.position.set(0, 2, -65);
  imprint.rotation.set(-0.018, 0.015, -0.07);
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
  let eventDuration = 5.2;
  let nextEventAt = 5.0 + rng() * 5.5;
  let eventColourA = PALETTE.ice.clone();
  let eventColourB = PALETTE.steel.clone();
  let forceEvent = false;
  let manualBurst = 0;
  let lastElapsed = 0;

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

  function clearPulse() {
    currentCurve = null;
    uniforms.uPulseStrengthA.value = 0;
    uniforms.uPulseStrengthB.value = 0;
    pulseCoreA.hide();
    pulseCoreB.hide();
  }

  function startEvent(elapsed, forced = false) {
    const eventClusters = compact ? clusters.slice(0, 4) : clusters;
    currentCurve = makeEventCurve(eventClusters, rng);
    eventStart = elapsed;
    eventDuration = forced ? 4.45 : 4.7 + rng() * 1.8;
    eventColourA = choosePulseColour(rng).clone();
    eventColourB = rng() < 0.76
      ? PALETTE.ice.clone()
      : choosePulseColour(rng).clone();
    uniforms.uPulseColourA.value.copy(eventColourA);
    uniforms.uPulseColourB.value.copy(eventColourB);
  }

  function updatePulse(elapsed) {
    if (forceEvent) {
      forceEvent = false;
      startEvent(elapsed, true);
    } else if (!currentCurve && elapsed >= nextEventAt) {
      startEvent(elapsed, false);
    }

    if (!currentCurve) {
      uniforms.uPulseStrengthA.value = 0;
      uniforms.uPulseStrengthB.value = 0;
      pulseCoreA.hide();
      pulseCoreB.hide();
      return;
    }

    const raw = (elapsed - eventStart) / eventDuration;
    if (raw >= 1) {
      clearPulse();
      nextEventAt = elapsed + 8.0 + rng() * 11.0;
      return;
    }

    const progress = clamp01(raw);
    const envelope = smooth01(progress / 0.14)
      * (1 - smooth01((progress - 0.80) / 0.20));
    const mainPoint = currentCurve.getPointAt(
      progress,
      uniforms.uPulsePosA.value,
    );
    const trailPoint = currentCurve.getPointAt(
      Math.max(0, progress - 0.085),
      uniforms.uPulsePosB.value,
    );
    const variation = 0.86
      + Math.sin(elapsed * 2.8) * 0.07
      + Math.sin(elapsed * 6.9) * 0.028;
    const boost = 1 + manualBurst * 0.56;
    const mainStrength = envelope * variation * boost;
    const trailStrength = envelope * 0.42 * boost;
    uniforms.uPulseStrengthA.value = mainStrength;
    uniforms.uPulseStrengthB.value = trailStrength;
    pulseCoreA.set(mainPoint, eventColourA, mainStrength, visibility);
    pulseCoreB.set(trailPoint, eventColourB, trailStrength, visibility);
  }

  function syncMachineSpace() {
    group.updateWorldMatrix(true, false);
    TMP_WORLD_TO_MACHINE.copy(group.matrixWorld).invert();
    uniforms.uWorldToMachine.value.copy(TMP_WORLD_TO_MACHINE);
  }

  return {
    group,
    ready,

    setEffectsEnabled(value) {
      effectsEnabled = Boolean(value);
      visibilityTarget = effectsEnabled ? 1 : 0;
      if (!effectsEnabled) {
        visibility = 0;
        uniforms.uVisible.value = 0;
        forceEvent = false;
        manualBurst = 0;
        clearPulse();
        group.visible = false;
      } else {
        group.visible = true;
        nextEventAt = Math.max(nextEventAt, lastElapsed + 2.8);
      }
    },

    setSuspended(value) {
      // The world stays alive behind an opened CV; only secondary motion is
      // reduced so the document remains legible.
      externallySuspended = Boolean(value);
    },

    setDocumentOpen(value) {
      documentOpen = Boolean(value);
      uniforms.uDocumentOpen.value = documentOpen ? 1 : 0;
    },

    setCompact(value) {
      const nextCompact = Boolean(value);
      const changed = nextCompact !== compact;
      compact = nextCompact;
      uniforms.uCompact.value = compact ? 1 : 0;
      clusters.forEach((cluster, index) => {
        cluster.group.visible = !compact || index < 4;
      });
      dust.setCompact(compact);
      fog.setCompact(compact);
      if (changed && currentCurve) {
        // A running pulse may still target the cluster that compact mode just
        // hid. Restart later on a point that is actually visible.
        clearPulse();
        forceEvent = false;
        nextEventAt = lastElapsed + 1.6;
      }
    },

    setPointerNdc() {
      // The illumination is autonomous and intentionally ignores the cursor.
    },

    setPixelRatio(value) {
      dust.material.uniforms.uPixelRatio.value = Math.min(
        1.6,
        Math.max(0.75, Number(value) || 1),
      );
    },

    setAmbient(value) {
      uniforms.uAmbient.value = THREE.MathUtils.clamp(
        Number(value) || 0,
        0.005,
        0.050,
      );
    },

    triggerSparseIllumination() {
      if (!effectsEnabled || disposed) return false;
      manualBurst = 1;
      clearPulse();
      forceEvent = true;
      group.visible = true;
      return true;
    },

    update(elapsed, delta) {
      lastElapsed = Number.isFinite(elapsed) ? elapsed : lastElapsed;
      const dt = Math.min(0.1, Math.max(0, delta || 0));
      const response = 1 - Math.pow(0.002, dt);
      visibility += (visibilityTarget - visibility) * response;
      uniforms.uVisible.value = visibility;
      uniforms.uTime.value = elapsed;
      manualBurst = Math.max(0, manualBurst - dt / 2.8);

      if (!effectsEnabled && visibility < 0.002) {
        group.visible = false;
        return;
      }
      group.visible = true;

      const activity = externallySuspended || documentOpen ? 0.84 : 1;
      clusters.forEach((cluster, index) => {
        cluster.group.rotation.z = cluster.rotation.z
          + elapsed * cluster.speed * activity
          + Math.sin(elapsed * cluster.drift + cluster.phase) * 0.015;
        cluster.group.rotation.x = cluster.rotation.x
          + Math.sin(elapsed * cluster.drift * 0.72 + cluster.phase) * 0.010;
        cluster.group.rotation.y = cluster.rotation.y
          + Math.cos(elapsed * cluster.drift * 0.64 + cluster.phase) * 0.014;
        cluster.group.position.x = cluster.home.x
          + Math.sin(elapsed * cluster.drift * 0.41 + cluster.phase)
            * (0.34 + index * 0.055);
        cluster.group.position.y = cluster.home.y
          + Math.cos(elapsed * cluster.drift * 0.35 + cluster.phase)
            * (0.24 + index * 0.045);
      });

      imprint.rotation.z = -0.07 + Math.sin(elapsed * 0.0025) * 0.010;
      imprint.rotation.y = 0.015 + Math.sin(elapsed * 0.0020) * 0.014;
      imprint.position.x = Math.sin(elapsed * 0.0017) * 1.05;
      imprint.position.y = 2 + Math.cos(elapsed * 0.0014) * 0.72;
      fog.update(elapsed);

      if (camera) {
        group.position.x += (
          THREE.MathUtils.clamp(camera.position.x * -0.015, -0.72, 0.72)
          - group.position.x
        ) * Math.min(1, dt * 0.50);
        group.position.y += (
          THREE.MathUtils.clamp(camera.position.y * -0.008, -0.43, 0.43)
          - group.position.y
        ) * Math.min(1, dt * 0.50);
      }

      syncMachineSpace();
      updatePulse(elapsed);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      clearPulse();
      structureMaterial.dispose();
      railGeometry.dispose();
      jointGeometry.dispose();
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
