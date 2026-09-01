import * as THREE from 'three';
import { lightColor } from './palette.js';
import { PRIMARY, RUNES } from './runes.js';

const POOL_SIZE = 6;
const PARTICLES = 34;

// EVENT_TIMING_V4_1
// The endpoint event is deliberately 30% longer than the previous 3.05 s
// sequence. Most of the added time sits in the burst/hold/morph stage so the
// code branch can still leave quickly once it has formed.
const EFFECT_DURATION = 3.965;
const BURST_DURATION = 0.546;
const HOLD_END = 1.144;
const MORPH_END = 1.586;
const CONTENT_START = 1.092;
const RUNE_FADE_START = 1.72;
const CODE_RISE_END = 2.82;
const CODE_WALL_START = 2.24;
const CODE_WALL_END = 3.04;

// The resolved payload is intentionally close to the particle-cloud footprint
// instead of becoming a large floating panel.
const CODE_CANVAS_WIDTH = 360;
const CODE_CANVAS_HEIGHT = 144;
const CONTENT_PLANE_WIDTH = 24;
const CONTENT_PLANE_HEIGHT = CONTENT_PLANE_WIDTH * (CODE_CANVAS_HEIGHT / CODE_CANVAS_WIDTH);
const CONTENT_BASE_Y = 5.6;

// SACRED_DISTRIBUTION_V4_2
// Successive payloads use a golden-angle disk. The offset stays inside the
// particle cloud, so the rune/code still reads as a transformation of those
// particles while concurrent events do not pile up on one central pixel.
const PHI = (1 + Math.sqrt(5)) / 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const PAYLOAD_RADIUS_MIN = 0.9;
const PAYLOAD_RADIUS_MAX = 3.4;

function payloadOffset(sequence, routeId, compact) {
  const index = Math.max(1, sequence + Math.abs(routeId % 7));
  const fraction = ((index / PHI) % 1 + 1) % 1;
  const radius = THREE.MathUtils.lerp(
    PAYLOAD_RADIUS_MIN,
    PAYLOAD_RADIUS_MAX,
    Math.sqrt(fraction),
  ) * (compact ? 0.62 : 1);
  const angle = index * GOLDEN_ANGLE;
  return new THREE.Vector2(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius * 0.56,
  );
}

const CODE_FRAGMENTS = Object.freeze([
  ['route.next();', 'commit(node);', 'signal.fade();'],
  ['for (hop of path)', 'clock.tick(hop);', 'return edge;'],
  ['0x2A :: SYN/ACK', 'depth = lerp(t);', 'buffer.clear();'],
  ['await bus.flush();', 'state = resolved;', 'return 0;'],
  ['edge.reduce(node)', 'phase ^= seed;', 'cache.flush();'],
]);

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0, edge1, value) {
  const x = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return x * x * (3 - 2 * x);
}

function palette(tint) {
  return tint > 0.5
    ? { primary: '#ffd98a', secondary: '#bce7ff' }
    : { primary: '#9beeff', secondary: '#e3fbff' };
}

function clearCanvas(context) {
  context.clearRect(0, 0, CODE_CANVAS_WIDTH, CODE_CANVAS_HEIGHT);
  context.globalAlpha = 1;
  context.shadowBlur = 0;
  context.lineCap = 'round';
  context.lineJoin = 'round';
}

function drawCode(context, tint, routeId) {
  clearCanvas(context);
  const lines = CODE_FRAGMENTS[Math.abs(routeId) % CODE_FRAGMENTS.length];
  const { primary, secondary } = palette(tint);

  context.textBaseline = 'top';
  context.font = '600 18px "Courier New", monospace';
  context.shadowBlur = 9;
  context.shadowColor = primary;
  lines.forEach((line, index) => {
    context.globalAlpha = 0.94 - index * 0.13;
    context.fillStyle = index === 0 ? primary : secondary;
    context.fillText(line, 24, 25 + index * 31);
  });
  context.globalAlpha = 1;
  context.shadowBlur = 0;
}

function drawRune(context, tint, routeId) {
  clearCanvas(context);
  const key = PRIMARY[Math.abs(routeId) % PRIMARY.length];
  const rune = RUNES[key];
  const { primary, secondary } = palette(tint);
  const cx = CODE_CANVAS_WIDTH * 0.5;
  const cy = CODE_CANVAS_HEIGHT * 0.5;
  const radius = 62;

  // The rune is static in orientation. Blink/float/fade are handled by the
  // event state below; no rotation is introduced here.
  for (const [width, alpha, color, blur] of [
    [9, 0.18, primary, 18],
    [4.2, 0.88, primary, 11],
    [1.8, 0.98, secondary, 3],
  ]) {
    context.beginPath();
    for (const [x1, y1, x2, y2] of rune.strokes) {
      context.moveTo(cx + x1 * radius, cy - y1 * radius);
      context.lineTo(cx + x2 * radius, cy - y2 * radius);
    }
    context.globalAlpha = alpha;
    context.strokeStyle = color;
    context.lineWidth = width;
    context.shadowBlur = blur;
    context.shadowColor = primary;
    context.stroke();
  }
  context.globalAlpha = 1;
  context.shadowBlur = 0;
}

function drawResolvedPayload(context, tint, routeId, sequence) {
  // Strict two-way resolution: roughly half of all endpoints become a rune,
  // the other half compact code fragments.
  const rune = (Math.abs(routeId) + sequence) % 2 === 0;
  if (rune) drawRune(context, tint, routeId + sequence);
  else drawCode(context, tint, routeId);
  return rune ? 'rune' : 'code';
}

function runeBlink(seconds) {
  // A visible electronic flicker rather than a slow opacity pulse.
  const wave = 0.5 + 0.5 * Math.sin(seconds * 17.5);
  return 0.24 + 0.76 * Math.pow(wave, 1.7);
}

function makeSlot(index) {
  const group = new THREE.Group();
  group.visible = false;
  group.userData.kind = 'endpoint-light-firework';

  const positions = new Float32Array(PARTICLES * 3);
  const directions = new Float32Array(PARTICLES * 3);
  const seeds = new Float32Array(PARTICLES);
  for (let i = 0; i < PARTICLES; i += 1) {
    const angle = (i / PARTICLES) * Math.PI * 2 + index * 0.37;
    const elevation = ((i * 0.61803398875) % 1 - 0.5) * 0.82;
    const radial = Math.sqrt(Math.max(0.08, 1 - elevation * elevation));
    directions[i * 3] = Math.cos(angle) * radial;
    directions[i * 3 + 1] = elevation + 0.22;
    directions[i * 3 + 2] = Math.sin(angle) * 0.26;
    seeds[i] = ((i * 0.754877666 + index * 0.271) % 1 + 1) % 1;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('aDirection', new THREE.BufferAttribute(directions, 3));
  particleGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const particleUniforms = {
    uBurst: { value: 0 },
    uOpacity: { value: 0 },
    uPixelRatio: { value: 1 },
    uCompact: { value: 0 },
    uColor: { value: lightColor('fiber').clone() },
  };
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: particleUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */`
      attribute vec3 aDirection;
      attribute float aSeed;
      uniform float uBurst, uOpacity, uPixelRatio, uCompact;
      varying float vOpacity, vSeed;
      void main() {
        float t = clamp(uBurst, 0.0, 1.0);
        float travel = (1.0 - pow(1.0 - t, 2.8)) * (5.6 + aSeed * 8.4);
        vec3 p = position + aDirection * travel;
        p.y += t * t * (1.7 + aSeed * 2.4);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float perspective = 500.0 / max(280.0, -mv.z);
        gl_PointSize = (3.2 + aSeed * 3.6) * uPixelRatio
          * perspective * max(0.0, uOpacity) * mix(1.0, 0.72, uCompact);
        gl_Position = projectionMatrix * mv;
        vOpacity = uOpacity;
        vSeed = aSeed;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying float vOpacity, vSeed;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        if (d > 0.5) discard;
        float core = 1.0 - smoothstep(0.0, 0.16, d);
        float halo = 1.0 - smoothstep(0.10, 0.5, d);
        vec3 color = mix(uColor, vec3(1.0), core * 0.82);
        float alpha = (core + halo * 0.62) * vOpacity * (0.72 + vSeed * 0.28);
        gl_FragColor = vec4(color * (1.1 + core), alpha);
      }
    `,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;
  particles.renderOrder = 4;
  group.add(particles);

  const canvas = document.createElement('canvas');
  canvas.width = CODE_CANVAS_WIDTH;
  canvas.height = CODE_CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  // CONTENT_WALL_MASK_V4_1
  // A sharp UV curtain removes the top of the code block while it travels
  // upwards. This reads like the code passing behind an invisible wall rather
  // than merely fading in open space.
  const contentUniforms = {
    uMap: { value: texture },
    uOpacity: { value: 0 },
    uClipTop: { value: 1 },
  };
  const contentMaterial = new THREE.ShaderMaterial({
    uniforms: contentUniforms,
    transparent: true,
    depthWrite: false,
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
      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform float uClipTop;
      varying vec2 vUv;
      void main() {
        if (vUv.y > uClipTop) discard;
        vec4 texel = texture2D(uMap, vUv);
        if (texel.a < 0.01) discard;
        gl_FragColor = vec4(texel.rgb * (1.0 + texel.a * 0.35), texel.a * uOpacity);
      }
    `,
  });
  const content = new THREE.Mesh(
    new THREE.PlaneGeometry(CONTENT_PLANE_WIDTH, CONTENT_PLANE_HEIGHT),
    contentMaterial,
  );
  content.position.set(0, CONTENT_BASE_Y, 1.8);
  content.renderOrder = 5;
  content.frustumCulled = false;
  group.add(content);

  return {
    group,
    particleGeometry,
    particleMaterial,
    particleUniforms,
    content,
    contentMaterial,
    contentUniforms,
    texture,
    context,
    elapsed: EFFECT_DURATION,
    active: false,
    payloadKind: 'code',
    payloadOffset: new THREE.Vector2(),
  };
}

export function createEndpointBurstCode() {
  const group = new THREE.Group();
  group.userData.kind = 'endpoint-burst-rune-code';
  const slots = Array.from({ length: POOL_SIZE }, (_, index) => makeSlot(index));
  for (const slot of slots) group.add(slot.group);

  let suspended = false;
  let compact = false;
  let cursor = 0;
  let sequence = 0;

  function clearSlot(slot) {
    slot.active = false;
    slot.elapsed = EFFECT_DURATION;
    slot.group.visible = false;
    slot.contentUniforms.uOpacity.value = 0;
    slot.contentUniforms.uClipTop.value = 1;
    slot.particleUniforms.uBurst.value = 0;
    slot.particleUniforms.uOpacity.value = 0;
  }

  function clear() {
    for (const slot of slots) clearSlot(slot);
  }

  return {
    group,

    trigger({ point, tint = 0, routeId = -1 } = {}) {
      if (suspended || !point) return false;
      let slot = slots.find((candidate) => !candidate.active);
      if (!slot) {
        slot = slots[cursor % slots.length];
        cursor += 1;
      }

      sequence += 1;
      slot.group.position.copy(point);
      slot.group.visible = true;
      slot.active = true;
      slot.elapsed = 0;
      slot.particleUniforms.uBurst.value = 0;
      slot.particleUniforms.uOpacity.value = 1;
      slot.particleUniforms.uColor.value.copy(
        tint > 0.5 ? lightColor('amber') : lightColor('fiber'),
      );
      slot.payloadKind = drawResolvedPayload(slot.context, tint, routeId, sequence);
      slot.payloadOffset.copy(payloadOffset(sequence, routeId, compact));
      slot.texture.needsUpdate = true;
      slot.contentUniforms.uOpacity.value = 0;
      slot.contentUniforms.uClipTop.value = 1;
      slot.content.position.x = slot.payloadOffset.x;
      slot.content.position.y = CONTENT_BASE_Y + slot.payloadOffset.y;
      const baseScale = compact ? 0.74 : 1;
      const kindScale = slot.payloadKind === 'rune' ? 1.34 : 1;
      slot.content.scale.setScalar(baseScale * kindScale);
      return true;
    },

    setSuspended(value) {
      suspended = Boolean(value);
      group.visible = !suspended;
      if (suspended) clear();
    },

    setCompact(value) {
      compact = Boolean(value);
      for (const slot of slots) {
        slot.particleUniforms.uCompact.value = compact ? 1 : 0;
      }
    },

    setPixelRatio(value) {
      const ratio = Math.max(0.75, Number(value) || 1);
      for (const slot of slots) slot.particleUniforms.uPixelRatio.value = ratio;
    },

    clear,

    update(_elapsed, delta) {
      if (suspended) return;
      const dt = Math.min(delta, 0.1);
      for (const slot of slots) {
        if (!slot.active) continue;
        slot.elapsed += dt;
        const seconds = slot.elapsed;

        // Phase 1: the particle explosion decelerates into a literal hold.
        // Once uBurst reaches 1 the shader no longer changes particle position.
        slot.particleUniforms.uBurst.value = clamp01(seconds / BURST_DURATION);

        // Phase 2: particles stay visible, then cross-fade into exactly one
        // resolved payload at their own position.
        const particleFade = 1 - smoothstep(HOLD_END, MORPH_END, seconds);
        slot.particleUniforms.uOpacity.value = particleFade;
        const appear = smoothstep(CONTENT_START, MORPH_END, seconds);
        const payloadT = clamp01((seconds - MORPH_END) / Math.max(0.001, EFFECT_DURATION - MORPH_END));
        const baseScale = compact ? 0.74 : 1;

        if (slot.payloadKind === 'rune') {
          // Branch 1: a static rune forms, immediately starts flickering, floats
          // only a little and disappears continuously. No rotation and no long
          // upward code-like travel.
          const fade = 1 - smoothstep(RUNE_FADE_START, EFFECT_DURATION, seconds);
          const blink = runeBlink(Math.max(0, seconds - MORPH_END));
          slot.contentUniforms.uOpacity.value = appear * fade * blink * (compact ? 0.66 : 0.92);
          slot.contentUniforms.uClipTop.value = 1;
          slot.content.position.x = slot.payloadOffset.x;
          slot.content.position.y = CONTENT_BASE_Y + slot.payloadOffset.y
            + payloadT * (compact ? 0.9 : 1.35)
            + Math.sin(payloadT * Math.PI * 5.5) * (compact ? 0.22 : 0.38);
          slot.content.scale.setScalar(
            baseScale * 1.34 * (0.985 + Math.sin(payloadT * Math.PI * 4.0) * 0.025),
          );
        } else {
          // Branch 2: compact code coalesces from the particle cloud, then moves
          // upward quickly. The UV curtain eats the top edge first, producing
          // the requested "behind an invisible wall" disappearance.
          const codeT = smoothstep(MORPH_END, CODE_RISE_END, seconds);
          const wall = smoothstep(CODE_WALL_START, CODE_WALL_END, seconds);
          const tailFade = 1 - smoothstep(CODE_WALL_END - 0.18, EFFECT_DURATION, seconds);
          slot.contentUniforms.uOpacity.value = appear * tailFade * (compact ? 0.64 : 0.88);
          slot.contentUniforms.uClipTop.value = 1 - wall;
          slot.content.position.x = slot.payloadOffset.x;
          slot.content.position.y = CONTENT_BASE_Y + slot.payloadOffset.y
            + codeT * (compact ? 8.2 : 12.8);
          slot.content.scale.setScalar(baseScale * (0.96 + codeT * 0.04));
        }

        if (seconds >= EFFECT_DURATION) clearSlot(slot);
      }
    },

    dispose() {
      for (const slot of slots) {
        slot.particleGeometry.dispose();
        slot.particleMaterial.dispose();
        slot.content.geometry.dispose();
        slot.contentMaterial.dispose();
        slot.texture.dispose();
      }
    },
  };
}
