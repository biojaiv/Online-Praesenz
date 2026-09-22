// PEDESTAL_HOLOGRAM_VOLUME_V6_2_2
import * as THREE from 'three';
import { LIGHT_PALETTE } from './palette.js';

const CARD_KEYS = Object.freeze(['abschluss', 'projekte', 'lebenslauf']);
const CARD_ACCENTS = Object.freeze({
  abschluss: LIGHT_PALETTE.fiberBlue,
  projekte: LIGHT_PALETTE.fiberBlue,
  lebenslauf: LIGHT_PALETTE.fiberBlue,
});
const ADJUSTABLE_KINDS = new Set(['ring-jet', 'coming-soon', 'resume-frame', 'card-label']);

function hash(index, salt = 0) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

function findPedestalTop(holder, key) {
  const accentRing = holder.children.find((child) => child.isLine) || null;
  const hit = holder.children.find(
    (child) => child.isMesh && child.userData?.key === key,
  ) || null;

  let surfaceY = accentRing ? accentRing.position.y - 0.035 : -5.25;
  let radius = 3.05;

  if (hit?.geometry) {
    hit.geometry.computeBoundingBox();
    const bounds = hit.geometry.boundingBox;
    if (bounds) {
      radius = Math.max(
        2.45,
        Math.min(3.7, (bounds.max.x - bounds.min.x) * 0.47),
      );
    }
  }

  if (!Number.isFinite(surfaceY)) surfaceY = -5.25;
  return { surfaceY, radius };
}

function collectAdjustmentTargets(holder) {
  return holder.children.filter((child) => (
    ADJUSTABLE_KINDS.has(child.userData?.kind)
    || child.name === 'resumeProjection'
  ));
}

function captureAdjustmentBaselines(state) {
  state.adjustmentTargets = collectAdjustmentTargets(state.holder);
  state.volumeBaseX = state.volume.group.position.x;
  state.adjustmentBaselines = state.adjustmentTargets.map((object) => ({
    object,
    x: object.position.x,
    z: object.position.z,
  }));
}

function restoreAdjustmentBaselines(state) {
  if (!state.adjustmentBaselines) return;
  state.volume.group.position.x = state.volumeBaseX ?? 0;
  for (const baseline of state.adjustmentBaselines) {
    const { object } = baseline;
    if (!object?.parent) continue;
    object.position.x = baseline.x;
    object.position.z = baseline.z;
  }
  state.adjustmentBaselines = null;
}

function makeVolumeMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      uniform float uTime, uAdjustment, uSeed;
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;

      void main() {
        vUv = uv;
        vec3 point = position;
        float syncJitter = uAdjustment
          * sin((position.y + uTime * 0.82 + uSeed) * 91.0)
          * 0.024;
        point.x += syncJitter;
        point.z -= syncJitter * 0.58;

        vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
        vViewNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime, uIntensity, uAdjustment, uAdjustProgress;
      uniform float uReaderFactor, uCompact, uSeed, uPlaneWeight;
      uniform vec3 uAccent;
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;

      float hash(vec2 point) {
        return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        // Several crossed, softly feathered planes create volume without a
        // visible cone shell. The density is already nearly zero at every
        // geometry edge, so no straight cutoff line can appear.
        float horizontalDistance = abs(vUv.x - 0.5) * 2.0;
        float horizontalCore = exp(
          -horizontalDistance * horizontalDistance * 2.85
        );
        float horizontalFeather = 1.0 - smoothstep(
          0.68,
          1.0,
          horizontalDistance
        );
        float horizontalWindow = horizontalCore * horizontalFeather;
        float verticalWindow = smoothstep(0.0, 0.050, vUv.y)
          * (1.0 - smoothstep(0.70, 1.0, vUv.y));
        float fieldWindow = horizontalWindow * verticalWindow;

        // Idle scanlines and grain are static. Temporal brightness changes are
        // confined to the occasional bottom-to-top adjustment event.
        float staticScanline = 0.970 + 0.030 * sin(
          vUv.y * 690.0 + uSeed * 8.0
        );
        float movingScanline = 0.88 + 0.12 * sin(
          vUv.y * 690.0 - uTime * 5.4 + uSeed * 8.0
        );
        float adjustmentAmount = clamp(uAdjustment, 0.0, 1.0);
        float scanline = mix(staticScanline, movingScanline, adjustmentAmount);
        // A literal steady base prevents any idle whole-field luminance pulse.
        float steadyOutput = 1.0;
        float adjustmentFlutter = mix(
          steadyOutput,
          0.955 + 0.045 * sin(uTime * 7.2 + uSeed * 11.0),
          adjustmentAmount
        );

        // Old-TV vertical synchronisation remains local to this hologram.
        float rollDistance = abs(vUv.y - uAdjustProgress);
        float rollCore = exp(-rollDistance * rollDistance / 0.00092);
        float rollHalo = exp(-rollDistance * rollDistance / 0.0090) * 0.24;
        float roll = (rollCore + rollHalo) * uAdjustment;

        float facing = 0.72 + 0.28 * abs(dot(
          normalize(vViewNormal),
          normalize(vViewDirection)
        ));
        float staticGrain = 0.965 + hash(
          floor(vUv * vec2(240.0, 420.0)) + vec2(uSeed * 17.0)
        ) * 0.035;
        float movingGrain = 0.91 + hash(
          floor(vUv * vec2(240.0, 420.0))
            + floor(uTime * 9.0)
            + vec2(uSeed * 17.0)
        ) * 0.09;
        float grain = mix(
          staticGrain,
          movingGrain,
          clamp(uAdjustment, 0.0, 1.0)
        );

        // Saturated cyan/accent colour only; no white flash elements.
        vec3 cyan = vec3(0.10, 0.67, 0.96);
        vec3 syncColour = mix(vec3(0.05, 0.78, 0.98), uAccent, 0.58);
        vec3 colour = mix(cyan, uAccent, 0.46);
        colour = mix(colour, syncColour, rollCore * 0.46);

        float alpha = fieldWindow
          * (0.0105 + uIntensity * 0.034)
          * facing
          * scanline
          * adjustmentFlutter
          * grain
          * uPlaneWeight;
        alpha += fieldWindow * roll
          * (0.016 + uIntensity * 0.034)
          * uPlaneWeight;
        alpha *= uReaderFactor * mix(1.0, 0.78, uCompact);
        if (alpha < 0.0012) discard;
        gl_FragColor = vec4(colour * (0.82 + roll * 0.72), alpha);
      }
    `,
  });
}

function makeFloorMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
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
      uniform float uIntensity, uAdjustment, uReaderFactor, uCompact;
      uniform vec3 uAccent;
      varying vec2 vUv;

      void main() {
        vec2 point = (vUv - 0.5) * 2.0;
        float radius = length(point);

        // The enlarged plane and Gaussian tail remove the former circular
        // cutoff. Density reaches zero naturally before the plane boundary.
        float centre = exp(-radius * radius * 4.6);
        float feather = 1.0 - smoothstep(0.70, 1.42, radius);
        float alpha = centre * feather
          * (0.060 + uIntensity * 0.18 + uAdjustment * 0.030)
          * uReaderFactor
          * mix(1.0, 0.78, uCompact);
        if (alpha < 0.0012) discard;
        vec3 colour = mix(vec3(0.07, 0.64, 0.92), uAccent, 0.52);
        gl_FragColor = vec4(colour, alpha);
      }
    `,
  });
}

function makeHologramParticles(uniforms, seed, reduced) {
  const count = reduced ? 760 : 2200;
  const compactCount = reduced ? count : 1100;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(count * 3), 3),
  );
  const seeds = new Float32Array(count * 4);
  const sizes = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    seeds[index * 4] = hash(index, seed + 1.3);
    seeds[index * 4 + 1] = hash(index, seed + 4.9);
    seeds[index * 4 + 2] = hash(index, seed + 9.7);
    seeds[index * 4 + 3] = hash(index, seed + 17.1);
    sizes[index] = 0.42 + Math.pow(hash(index, seed + 28.4), 2.1) * 2.65;
  }

  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.7);

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
      attribute vec4 aSeed;
      attribute float aSize;
      uniform float uTime, uIntensity, uAdjustment, uAdjustProgress;
      uniform float uPixelRatio, uCompact, uSeed;
      varying float vAlpha, vHeat, vTint;

      void main() {
        float speed = 0.020 + aSeed.w * 0.040;
        float travel = fract(aSeed.z + uTime * speed);
        // Start almost directly on the pedestal's highest surface; there is
        // no visually empty gap below the hologram field.
        float y = mix(-0.4992, 0.49, travel);
        float radius = sqrt(aSeed.y) * (0.84 - travel * 0.18);
        float angle = aSeed.x * 6.2831853
          + uTime * mix(-0.35, 0.42, aSeed.w)
          + sin(uTime * 0.24 + aSeed.z * 41.0) * 0.66;
        float turbulence = sin(uTime * 1.7 + aSeed.y * 67.0 + travel * 19.0)
          + cos(uTime * 1.1 - aSeed.x * 53.0 + travel * 31.0) * 0.58;

        vec3 point;
        point.x = cos(angle) * radius
          + turbulence * 0.035 * (0.35 + travel);
        point.z = sin(angle) * radius * 0.72
          + cos(uTime * 0.61 + aSeed.x * 47.0) * 0.034;
        point.y = y + turbulence * 0.010;

        float roll = exp(-abs((y + 0.5) - uAdjustProgress) * 24.0)
          * uAdjustment;
        float sparkBase = pow(max(0.0, sin(
          uTime * (1.7 + aSeed.w * 2.2)
          + aSeed.x * 73.0
          + aSeed.y * 31.0
        )), 18.0);
        // Spark brightness is event-bound. Particles keep moving at idle,
        // but do not blink rhythmically across the whole hologram volume.
        float spark = sparkBase * uAdjustment * 0.62;
        float edge = 1.0 - smoothstep(0.68, 0.92, radius);
        float verticalFade = smoothstep(-0.4995, -0.480, y)
          * (1.0 - smoothstep(0.40, 0.49, y));

        vHeat = max(roll, spark * 0.30);
        vTint = aSeed.w;
        vAlpha = edge * verticalFade
          * (0.042 + uIntensity * 0.145 + vHeat * 0.145)
          * mix(1.0, 0.78, uCompact);

        vec4 modelView = modelViewMatrix * vec4(point, 1.0);
        gl_PointSize = min(
          7.2,
          aSize * uPixelRatio
            * (74.0 / max(5.0, -modelView.z))
            * (0.84 + uIntensity * 0.92 + vHeat * 1.25)
        );
        gl_Position = projectionMatrix * modelView;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uAccent;
      uniform float uReaderFactor;
      varying float vAlpha, vHeat, vTint;

      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float distanceToCentre = length(point);
        if (distanceToCentre > 0.5) discard;
        float core = smoothstep(0.5, 0.02, distanceToCentre);
        vec3 cold = vec3(0.08, 0.70, 0.98);
        vec3 energised = mix(vec3(0.02, 0.82, 0.96), uAccent, 0.70);
        vec3 colour = mix(cold, uAccent, 0.30 + vTint * 0.48);
        colour = mix(colour, energised, vHeat * 0.46);
        float alpha = core * core * vAlpha * uReaderFactor;
        if (alpha < 0.0012) discard;
        gl_FragColor = vec4(colour * (0.92 + vHeat * 1.18), alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'pedestal-hologram-particles';
  points.frustumCulled = false;
  points.renderOrder = 9;

  return {
    points,
    geometry,
    material,
    setCompact(value) {
      geometry.setDrawRange(0, value ? compactCount : count);
    },
  };
}

function makeHologramVolume(accent, seed, reduced) {
  const group = new THREE.Group();
  group.name = 'pedestal-hologram-volume';
  group.userData.kind = 'pedestal-hologram-volume-v6.2.2';

  const uniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 0.42 },
    uAdjustment: { value: 0 },
    uAdjustProgress: { value: 0 },
    uReaderFactor: { value: 1 },
    uCompact: { value: 0 },
    uAccent: { value: new THREE.Color(accent) },
    uSeed: { value: seed },
    uPlaneWeight: { value: reduced ? 0.58 : 0.40 },
  };

  const volumeMaterial = makeVolumeMaterial(uniforms);

  // Intersecting feathered planes form a volume without a hard cone shell.
  const planeGeometry = new THREE.PlaneGeometry(
    1.92,
    1,
    reduced ? 1 : 2,
    reduced ? 18 : 42,
  );
  const planeCount = reduced ? 3 : 5;
  for (let index = 0; index < planeCount; index += 1) {
    const plane = new THREE.Mesh(planeGeometry, volumeMaterial);
    plane.name = `hologram-volume-plane-${index}`;
    plane.rotation.y = index * Math.PI / planeCount;
    plane.renderOrder = 5;
    plane.frustumCulled = false;
    group.add(plane);
  }

  const floorMaterial = makeFloorMaterial({
    uIntensity: uniforms.uIntensity,
    uAdjustment: uniforms.uAdjustment,
    uReaderFactor: uniforms.uReaderFactor,
    uCompact: uniforms.uCompact,
    uAccent: uniforms.uAccent,
  });
  const floorGeometry = new THREE.PlaneGeometry(2.8, 2.8, 1, 1);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.name = 'hologram-volume-floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.4992;
  floor.renderOrder = 7;
  group.add(floor);

  const particles = makeHologramParticles(uniforms, seed, reduced);
  group.add(particles.points);

  const lightColour = new THREE.Color(0x159fd6).lerp(
    new THREE.Color(accent),
    0.62,
  );
  // Saturated local fill light: enough to separate foreground geometry,
  // without bleaching the hologram into white.
  const light = new THREE.PointLight(lightColour, 0, 15, 2.4);
  light.name = 'pedestal-hologram-light';
  light.castShadow = false;
  light.position.set(0, -0.34, 0.26);
  group.add(light);

  return {
    group,
    uniforms,
    particles,
    light,
    planeGeometry,
    floorGeometry,
    volumeMaterial,
    floorMaterial,
    setCompact(value) {
      uniforms.uCompact.value = value ? 1 : 0;
      particles.setCompact(value);
    },
    dispose() {
      particles.geometry.dispose();
      particles.material.dispose();
      planeGeometry.dispose();
      floorGeometry.dispose();
      volumeMaterial.dispose();
      floorMaterial.dispose();
      group.clear();
    },
  };
}

export function createHologramField({ cards, reduced = false } = {}) {
  const root = cards?.group;
  if (!root) {
    return {
      setRoute() {}, setReaderOpen() {}, setCompact() {}, pulseAll() {},
      setPixelRatio() {}, refreshAnchors() {}, update() {}, dispose() {},
    };
  }

  const states = [];
  let activeRoot = 'home';
  let readerOpen = false;
  let compact = false;
  let globalPulseRemaining = 0;
  let globalPulseDuration = 0;
  let nextAdjustmentAt = 4.2;
  let lastElapsed = 0;
  let forcedAdjustmentKey = null;
  let disposed = false;

  CARD_KEYS.forEach((key, index) => {
    const holder = root.getObjectByName(`card-${key}`);
    if (!holder) return;
    const volume = makeHologramVolume(
      CARD_ACCENTS[key],
      index + 2.618,
      reduced,
    );
    holder.add(volume.group);
    states.push({
      key,
      holder,
      volume,
      adjustmentTargets: collectAdjustmentTargets(holder),
      adjustmentBaselines: null,
      volumeBaseX: 0,
      intensity: 0.48,
      target: 0.48,
      localPulse: 0,
      surfaceY: -5.25,
      height: key !== 'projekte' ? 13.0 : 11.6,
      adjustmentStart: -1,
      adjustmentDuration: 1.45,
      seed: index + 2.618,
    });
  });

  function refreshAdjustmentTargets() {
    for (const state of states) {
      restoreAdjustmentBaselines(state);
      state.adjustmentStart = -1;
      state.adjustmentTargets = collectAdjustmentTargets(state.holder);
    }
  }

  function refreshAnchors() {
    if (disposed) return;
    for (const state of states) {
      const anchor = findPedestalTop(state.holder, state.key);
      state.surfaceY = anchor.surfaceY;
      state.height = state.key !== 'projekte' ? 13.0 : 11.6;
      state.volume.group.position.set(
        0,
        anchor.surfaceY + state.height * 0.5 + 0.008,
        0,
      );
      state.volume.group.scale.set(
        anchor.radius * 1.25,
        state.height,
        anchor.radius * 0.90,
      );
      state.volume.light.distance = Math.max(10.5, state.height * 1.05);
      state.volume.light.decay = 2.6;
    }
    refreshAdjustmentTargets();
  }

  refreshAnchors();
  cards.ready?.then(() => {
    refreshAnchors();
    window.setTimeout(refreshAnchors, 180);
  }).catch(() => {});

  function startAdjustment(state, elapsed) {
    for (const candidate of states) {
      restoreAdjustmentBaselines(candidate);
      candidate.adjustmentStart = -1;
    }
    captureAdjustmentBaselines(state);
    state.adjustmentStart = elapsed;
    state.adjustmentDuration = 0.64 + hash(
      Math.floor(elapsed * 10),
      state.seed * 5.3,
    ) * 0.32;
    nextAdjustmentAt = elapsed
      + 7
      + hash(Math.floor(elapsed * 7), state.seed * 9.7) * 7;
  }

  function selectAdjustmentState(elapsed) {
    if (forcedAdjustmentKey) {
      const forced = states.find((state) => state.key === forcedAdjustmentKey);
      forcedAdjustmentKey = null;
      if (forced) return forced;
    }
    // Ein geoeffneter Bereich wird gelesen: kein Synchronlauf, kein heller
    // Balken ueber dem Text. Der Effekt bleibt der Uebersicht vorbehalten.
    if (activeRoot !== 'home') return null;
    if (!states.length) return null;
    const index = Math.floor(hash(Math.floor(elapsed * 3.1), 11.7) * states.length)
      % states.length;
    return states[index];
  }

  function applyContentAdjustment(state, amount, elapsed) {
    if (!state.adjustmentBaselines) captureAdjustmentBaselines(state);
    const shift = Math.sin(elapsed * 67.0 + state.seed * 13.0)
      * amount
      * 0.14;
    const depthShift = Math.sin(elapsed * 91.0 + state.seed * 7.0)
      * amount
      * 0.03;
    state.volume.group.position.x = state.volumeBaseX + shift;
    for (const baseline of state.adjustmentBaselines || []) {
      const { object } = baseline;
      if (!object?.parent) continue;
      const primary = object.name === 'resumeProjection'
        || object.userData?.kind === 'resume-frame';
      const factor = primary ? 1 : 0.66;
      object.position.x = baseline.x + shift * factor;
      object.position.z = baseline.z + depthShift * factor;
    }
  }

  function resetContentAdjustment(state) {
    restoreAdjustmentBaselines(state);
  }

  return {
    setRoute(route) {
      const nextRoot = String(route || 'home').split('/')[0] || 'home';
      const routeChanged = nextRoot !== activeRoot;
      activeRoot = nextRoot;

      if (routeChanged) {
        // Route changes invalidate any adjustment that was captured against a
        // different pedestal. Restore every baseline before selecting a new
        // local event.
        forcedAdjustmentKey = null;
        for (const state of states) {
          state.adjustmentStart = -1;
          resetContentAdjustment(state);
        }
      }

      for (const state of states) {
        state.target = activeRoot === 'home'
          ? 0.66
          : state.key === activeRoot
            ? 1.22
            : 0.32;
        if (state.key === activeRoot) state.localPulse = 1;
      }

      // Kein erzwungener Synchronlauf beim Fokus: das Dokument soll ruhig
      // stehen, sobald man es liest.
      forcedAdjustmentKey = null;
      nextAdjustmentAt = Math.max(nextAdjustmentAt, lastElapsed + 3.4);
    },

    setReaderOpen(value) {
      const nextReaderOpen = Boolean(value);
      const changed = nextReaderOpen !== readerOpen;
      readerOpen = nextReaderOpen;
      if (readerOpen) {
        forcedAdjustmentKey = null;
        for (const state of states) {
          state.adjustmentStart = -1;
          resetContentAdjustment(state);
        }
      } else if (changed) {
        // Returning from the flat reader should be calm; do not fire an
        // adjustment in the same frame as the projection reappears.
        nextAdjustmentAt = Math.max(nextAdjustmentAt, lastElapsed + 3.0);
      }
    },

    setCompact(value) {
      const nextCompact = Boolean(value);
      if (nextCompact === compact) return;
      compact = nextCompact;
      for (const state of states) {
        state.volume.setCompact(compact);
        // A layout/DPR change must not keep applying stale captured offsets.
        state.adjustmentStart = -1;
        resetContentAdjustment(state);
      }
      forcedAdjustmentKey = null;
      nextAdjustmentAt = Math.max(nextAdjustmentAt, lastElapsed + 2.5);
    },

    pulseAll(duration = 2000) {
      const seconds = Math.max(0.4, duration / 1000);
      globalPulseRemaining = Math.max(globalPulseRemaining, seconds);
      globalPulseDuration = Math.max(globalPulseDuration, seconds);
      for (const state of states) {
        state.localPulse = 1;
        state.adjustmentStart = -1;
        resetContentAdjustment(state);
      }
      // A section prompt only brightens the fields. It must neither continue,
      // restart nor schedule a TV-adjustment while the user is choosing.
      forcedAdjustmentKey = null;
      nextAdjustmentAt = Math.max(
        nextAdjustmentAt,
        lastElapsed + seconds + 1.25,
      );
    },

    setPixelRatio(value) {
      const ratio = Math.max(0.65, Math.min(1.8, Number(value) || 1));
      for (const state of states) {
        state.volume.particles.material.uniforms.uPixelRatio.value = ratio;
      }
    },

    refreshAnchors,

    update(elapsed, delta) {
      if (disposed) return;
      const dt = Math.min(0.1, Math.max(0, delta || 0));
      lastElapsed = Math.max(lastElapsed, Number(elapsed) || 0);
      const response = reduced ? 1 : 1 - Math.pow(0.006, dt);
      globalPulseRemaining = Math.max(0, globalPulseRemaining - dt);
      const globalPulseProgress = globalPulseDuration > 0
        ? 1 - globalPulseRemaining / globalPulseDuration
        : 1;
      const globalPulse = globalPulseRemaining > 0
        ? Math.sin(Math.PI * Math.max(0, Math.min(1, globalPulseProgress)))
        : 0;
      if (globalPulseRemaining <= 0) globalPulseDuration = 0;

      const activeAdjustment = states.some((state) => state.adjustmentStart >= 0);
      if (!reduced && !readerOpen && !activeAdjustment && elapsed >= nextAdjustmentAt) {
        const state = selectAdjustmentState(elapsed);
        if (state) startAdjustment(state, elapsed);
      }

      for (const state of states) {
        let adjustProgress = 0;
        let adjustment = 0;
        if (!reduced && state.adjustmentStart >= 0) {
          adjustProgress = (elapsed - state.adjustmentStart)
            / state.adjustmentDuration;
          if (adjustProgress >= 1) {
            state.adjustmentStart = -1;
            adjustProgress = 0;
            adjustment = 0;
            resetContentAdjustment(state);
          } else {
            const envelope = Math.sin(Math.PI * Math.max(0, adjustProgress));
            adjustment = Math.pow(Math.max(0, envelope), 0.72);
            applyContentAdjustment(state, adjustment, elapsed);
          }
        } else if (reduced && state.adjustmentBaselines) {
          resetContentAdjustment(state);
        }

        state.localPulse *= Math.pow(0.068, dt);
        const readerFactor = readerOpen && state.key === activeRoot ? 0.46 : 1;
        const pulseBoost = Math.max(globalPulse * 0.48, state.localPulse * 0.52);
        const target = Math.min(1.52, (state.target + pulseBoost) * readerFactor);
        state.intensity += (target - state.intensity) * response;

        const uniforms = state.volume.uniforms;
        uniforms.uTime.value = reduced ? 0 : elapsed;
        uniforms.uIntensity.value = state.intensity;
        uniforms.uAdjustment.value = adjustment;
        uniforms.uAdjustProgress.value = Math.max(0, Math.min(1, adjustProgress));
        uniforms.uReaderFactor.value = readerFactor;
        uniforms.uCompact.value = compact ? 1 : 0;

        // Cross-plane overlap remains static at idle. Only the local TV-sync
        // adjustment may introduce a very small rotational disturbance.
        state.volume.group.rotation.y = Math.sin(
          elapsed * 0.31 + state.seed,
        ) * 0.004 * adjustment;
        const compactLightFactor = compact ? 0.72 : 1;
        state.volume.light.intensity = (
          0.85
          + state.intensity * 3.9
          + pulseBoost * 1.25
          + adjustment * 0.38
        ) * readerFactor * compactLightFactor;
        state.volume.group.visible = state.intensity > 0.015;
      }
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const state of states) {
        resetContentAdjustment(state);
        state.holder.remove(state.volume.group);
        state.volume.dispose();
      }
      states.length = 0;
    },
  };
}
