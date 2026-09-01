import * as THREE from 'three';
import { createProceduralOrreryField } from './proceduralOrreryField.js'; // PROCEDURAL_ORRERY_FIELD_V4_8
import { lightColor } from './palette.js';
import { createMotherboardSignalRoutes } from './motherboardSignalRoutes.js';
import { createEndpointBurstCode } from './endpointBurstCode.js';
import { createUpperRightTelemetry } from './upperRightTelemetry.js'; // UPPER_RIGHT_TELEMETRY_V4_5

const MOTHERBOARD_URL = new URL(
  '../../Elemente/Motherboard/motherboard-universe.jpg',
  import.meta.url,
).href;

/**
 * Hintergrund-Szenerie: architektonische Circuit-Tiefe.
 *
 * Das gelieferte quadratische Motiv bleibt die einzige Bildvorlage. Sichtbare
 * Impulse laufen ausschliesslich auf fest nachgezeichneten Boden- und
 * Fluchtlinien dieses Motivs. Die Bahnen beginnen im nahen Vordergrund und
 * ziehen zum zentralen Fluchtpunkt in die Raumtiefe; freie Bildflaechen werden
 * nicht mit erfundenen Zufallsrouten ueberquert.
 *
 * Der Zustand der Impulsbahnen bleibt GPU-seitig in einer kleinen DataTexture.
 * Ein fester Pool aus Reveal-Stempeln bildet den nachleuchtenden Schweif auf
 * der Motherboard-Ebene ab. Die Stempel werden kamera-projiziert, damit der
 * sichtbare Reveal auch bei Tiefenstaffelung und Kamerafahrten direkt unter
 * dem Impuls liegt.
 *   R = Kopfposition 0..1   (-1 = Bahn ruht)
 *   G = Impulslaenge
 *   B = Farbton (0 = blaugruen, 1 = bernstein)
 *   A = perspektivische Impulsskalierung
 */

const FIB = [3, 5, 8, 13, 21, 34, 55];

const MAX_ACTIVE   = 1;
const SPAWN_MIN    = 4.2;
const SPAWN_MAX    = 9.5;

const BOARD_ASPECT = 1;
const BOARD_WIDTH = 1040;
const BOARD_HEIGHT = BOARD_WIDTH / BOARD_ASPECT;
const BOARD_Y = 0;
const BOARD_Z = -1120;
const TRACE_DOMAIN_X = 160;
const TRACE_DOMAIN_Y = 96;
const BOARD_REVEAL_SLOTS = 52;
const BOARD_REVEAL_RADIUS = 0.052;
const BOARD_REVEAL_DECAY = 3.12;

// LOCAL_ARCHITECTURE_REVEAL_V4_2
// Architectural contours never pulse as a full-image layer. They are revealed
// only underneath the same short-lived stamps written by travelling signals.

// MOTHERBOARD_DEPTH_PERSPECTIVE_V1_9
// One-point perspective for the complete image-guided layer.
// The lower edge remains nearer while the routed floor lines recede physically.
const BOARD_PERSPECTIVE_TILT = -0.235;
const BOARD_PERSPECTIVE_Y_COMPENSATION =
  BOARD_Z * Math.sin(BOARD_PERSPECTIVE_TILT);
const BOARD_PERSPECTIVE_Z_COMPENSATION =
  BOARD_Z * (1 - Math.cos(BOARD_PERSPECTIVE_TILT));

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/** Leiterbahn: achsenparallel mit gelegentlichen 45-Grad-Schraegen. */
function routeTrace(rng, origin, layer) {
  const pts = [origin.clone()];
  // Roughly one route in four becomes a long-distance signal corridor.
  // It uses more segments and slightly larger Fibonacci-derived steps, but
  // preserves the same orthogonal/45-degree visual language.
  const longRoute = rng() < 0.24;
  const segments = longRoute
    ? 8 + Math.floor(rng() * 5)
    : 3 + Math.floor(rng() * 4);
  const lengthScale = longRoute ? 1.48 : 1;
  const dir = new THREE.Vector2(rng() < 0.5 ? 1 : -1, 0);

  for (let i = 0; i < segments; i++) {
    const len = (FIB[1 + Math.floor(rng() * 4)] / 7)
      * (1 + layer * 0.3)
      * lengthScale;
    const last = pts[pts.length - 1];
    pts.push(new THREE.Vector3(last.x + dir.x * len, last.y + dir.y * len, last.z));

    const turn = rng();
    if (turn < 0.5) {
      dir.set(0, rng() < 0.5 ? 1 : -1);
    } else if (turn < 0.72) {
      const s = 0.7071;
      dir.set(dir.x !== 0 ? Math.sign(dir.x) * s : (rng() < 0.5 ? s : -s),
              dir.y !== 0 ? Math.sign(dir.y) * s : (rng() < 0.5 ? s : -s));
    }
  }
  return pts;
}

export function createBackground({ camera = null, layers = 3, tracesPerLayer = 10, seed = 20260802 } = {}) {
  const group = new THREE.Group();
  const proceduralOrrery = createProceduralOrreryField({ camera });
  group.add(proceduralOrrery.group);
  // Motherboard und Impulsbahnen bilden die nahe Ebene. Sie tritt hinter
  // dem geoeffneten Lebenslauf zurueck. Sterne und Nebel bleiben dagegen
  // immer stehen — der Raum verschwindet nie.
  const traceGroup = new THREE.Group();
  group.add(traceGroup);

  // Rotate the whole motherboard subsystem, not only the board mesh.
  // This keeps board, fixed signal routes, terminals and code aligned.
  traceGroup.rotation.x = BOARD_PERSPECTIVE_TILT;
  traceGroup.position.y = BOARD_PERSPECTIVE_Y_COMPENSATION;
  traceGroup.position.z = BOARD_PERSPECTIVE_Z_COMPENSATION;

  const rng = makeRng(seed);

  const traces = [];
  const linePos = [], lineDist = [], lineId = [], lineDim = [];


  for (let l = 0; l < layers; l++) {
    const depth = -22 - l * 15;
    const spreadX = 40 + l * 16;
    const spreadY = 22 + l * 9;
    const dim = 0.72 - l * 0.18;

    for (let t = 0; t < tracesPerLayer; t++) {
      const id = traces.length;
      const origin = new THREE.Vector3(
        (rng() - 0.5) * spreadX * 2,
        (rng() - 0.5) * spreadY * 2,
        depth + (rng() - 0.5) * 5
      );
      const pts = routeTrace(rng, origin, l);

      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
      const total = cum[cum.length - 1];
      if (total < 1) continue;

      traces.push({ id, total, dim, pts, cum, longRoute: pts.length >= 9 });

      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
        lineDist.push(cum[i] / total, cum[i + 1] / total);
        lineId.push(id, id);
        lineDim.push(dim, dim);
      }

    }
  }

  /* ---------- Zustandstextur ---------- */

  const count = traces.length;
  const stateData = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) stateData[i * 4] = -1;

  const stateTex = new THREE.DataTexture(stateData, count, 1, THREE.RGBAFormat, THREE.FloatType);
  stateTex.minFilter = stateTex.magFilter = THREE.NearestFilter;
  stateTex.needsUpdate = true;

  const shared = {
    uState: { value: stateTex },
    uCount: { value: count },
    uTime:  { value: 0 },
    uAmbient: { value: 0.18 },   // Kompatibilitaet fuer die bestehende Intro-Schnittstelle.
    uAmber: { value: lightColor('amber') },
    uCyan:  { value: lightColor('fiber') },
    uBase:  { value: lightColor('base') },
  };

  const SAMPLE = /* glsl */`
    uniform sampler2D uState;
    uniform float uCount;
    vec4 fetchState(float id) {
      return texture2D(uState, vec2((id + 0.5) / uCount, 0.5));
    }
  `;

  /* ---------- Leiterbahnen ---------- */

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  lineGeo.setAttribute('aDist',    new THREE.Float32BufferAttribute(lineDist, 1));
  lineGeo.setAttribute('aId',      new THREE.Float32BufferAttribute(lineId, 1));
  lineGeo.setAttribute('aDim',     new THREE.Float32BufferAttribute(lineDim, 1));

  const legacyTraceLines = new THREE.LineSegments(lineGeo, new THREE.ShaderMaterial({
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      ${SAMPLE}
      attribute float aDist, aId, aDim;
      varying float vDist, vHead, vPulse, vDim, vTint;
      void main() {
        vec4 st = fetchState(aId);
        vDist = aDist; vHead = st.r; vPulse = st.g; vTint = st.b; vDim = aDim;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uAmber, uCyan, uBase;
      varying float vDist, vHead, vPulse, vDim, vTint;
      void main() {
        float base = 0.012 * vDim;
        float energy = 0.0;
        if (vHead >= 0.0) {
          float behind = vHead - vDist;
          if (behind >= 0.0) energy = exp(-behind / max(vPulse, 0.001) * 2.4);
          energy += smoothstep(0.025, 0.0, -behind) * 0.5;
          energy = clamp(energy, 0.0, 1.5) * vDim;
        }
        vec3 hot = mix(uCyan, uAmber, vTint);
        float a = base + energy * 0.9;
        if (a < 0.005) discard;
        gl_FragColor = vec4(uBase * base + hot * energy, a);
      }
    `,
  }));
  // v1.8: the old procedural paths remain allocated only for compatibility
  // with the existing state texture, but they are never rendered. Visible
  // signal energy now exists exclusively on motherboardSignalRoutes.js lanes.
  legacyTraceLines.visible = false;
  traceGroup.add(legacyTraceLines);

  /* ---------- Motherboard-Universum ---------- */

  // Die gelieferte Motherboard-Grafik ist keine sichtbare Tapete. Sie liegt
  // als dunkle Struktur im Raum und wird nur dort lesbar, wo ein bestehender
  // Leiterbahnimpuls vorbeizieht. Mehrere kurzlebige Reveal-Stempel bilden
  // den Schweif; danach faellt der Bereich wieder vollstaendig ins Dunkel.
  const boardTexture = new THREE.TextureLoader().load(
    MOTHERBOARD_URL,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
    },
    undefined,
    (error) => console.warn('Architektur-Hintergrund konnte nicht geladen werden:', error),
  );
  boardTexture.colorSpace = THREE.SRGBColorSpace;
  boardTexture.minFilter = THREE.LinearFilter;
  boardTexture.magFilter = THREE.LinearFilter;
  boardTexture.generateMipmaps = false;

  const boardRevealUniforms = Array.from(
    { length: BOARD_REVEAL_SLOTS },
    () => new THREE.Vector4(-2, -2, 0, 0),
  );
  const boardUniforms = {
    uBoard: { value: boardTexture },
    uReveal: { value: boardRevealUniforms },
    uCompact: { value: 0 },
    uAmber: shared.uAmber,
    uCyan: shared.uCyan,
    uPointerScan: { value: new THREE.Vector4(-2, -2, 0, 0) },
  };

  const boardMaterial = new THREE.ShaderMaterial({
    uniforms: boardUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uBoard;
      uniform vec4 uReveal[${BOARD_REVEAL_SLOTS}];
      uniform vec3 uAmber, uCyan;
      uniform float uCompact;
      uniform vec4 uPointerScan;
      varying vec2 vUv;

      float luma(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
      }

      void main() {
        vec3 source = texture2D(uBoard, vUv).rgb;
        float detail = max(source.r, max(source.g, source.b));

        // Image-space edge detector only. It never creates a global sweep.
        // The edge energy is multiplied by the local signal reveal below, so
        // a building/circuit contour can brighten only where an impulse is
        // actually travelling across that element.
        vec2 texel = vec2(1.0 / 1024.0, 1.0 / 1024.0);
        float lumL = luma(texture2D(uBoard, clamp(vUv - vec2(texel.x, 0.0), 0.0, 1.0)).rgb);
        float lumR = luma(texture2D(uBoard, clamp(vUv + vec2(texel.x, 0.0), 0.0, 1.0)).rgb);
        float lumD = luma(texture2D(uBoard, clamp(vUv - vec2(0.0, texel.y), 0.0, 1.0)).rgb);
        float lumU = luma(texture2D(uBoard, clamp(vUv + vec2(0.0, texel.y), 0.0, 1.0)).rgb);
        float edge = smoothstep(0.018, 0.115, abs(lumR - lumL) + abs(lumU - lumD));
        float architectureZone = smoothstep(0.34, 0.52, vUv.y);

        float reveal = 0.0;
        float tint = 0.0;
        vec2 aspect = vec2(${BOARD_ASPECT.toFixed(6)}, 1.0);
        const float innerRadius2 = 0.000036;
        const float outerRadius2 = ${(BOARD_REVEAL_RADIUS * BOARD_REVEAL_RADIUS).toFixed(6)};

        for (int i = 0; i < ${BOARD_REVEAL_SLOTS}; i++) {
          vec4 stamp = uReveal[i];
          if (stamp.z <= 0.001) continue;

          vec2 delta = (vUv - stamp.xy) * aspect;
          float distance2 = dot(delta, delta);
          float local = (1.0 - smoothstep(innerRadius2, outerRadius2, distance2))
                      * stamp.z;
          if (local > reveal) {
            reveal = local;
            tint = stamp.w;
          }
        }

        // POINTER_DWELL_SCAN_V4_3: stationary cursor -> local charge only.
        vec2 pointerDelta = (vUv - uPointerScan.xy) * aspect;
        float pointerDistance = length(pointerDelta);
        float pointerRingRadius = mix(0.010, 0.105, clamp(uPointerScan.w, 0.0, 1.0));
        float pointerRing = (1.0 - smoothstep(0.004, 0.015, abs(pointerDistance - pointerRingRadius)))
          * clamp(uPointerScan.z, 0.0, 1.0);
        float pointerCore = (1.0 - smoothstep(0.0, 0.030, pointerDistance))
          * clamp(uPointerScan.z, 0.0, 1.0) * 0.28;
        float ghost = 0.00072 * mix(1.0, 0.52, uCompact);
        float signal = smoothstep(0.10, 0.95, detail);
        vec3 impulse = mix(uCyan, uAmber, tint);

        // Local contour reinforcement. No timer, no full-frame architecture
        // envelope: outline exists only inside a travelling reveal stamp.
        float outline = edge
          * architectureZone
          * smoothstep(0.08, 0.78, reveal)
          * mix(1.0, 0.58, uCompact);
        float pointerOutline = edge * (pointerRing + pointerCore)
          * mix(1.0, 0.52, uCompact);

        if (detail < 0.025 && reveal < 0.002 && outline < 0.002 && pointerOutline < 0.002) discard;

        vec3 color = source * (0.048 + reveal * 0.86)
                   + impulse * signal * reveal * 0.18
                   + impulse * outline * 0.72
                   + source * outline * 0.24
                   + mix(uCyan, uAmber, 0.22) * pointerOutline * 0.54
                   + source * pointerOutline * 0.18;
        float alpha = detail * (ghost + reveal * 0.39) + outline * 0.16 + pointerOutline * 0.11;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const boardMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(BOARD_WIDTH, BOARD_HEIGHT),
    boardMaterial,
  );
  boardMesh.position.set(0, BOARD_Y, BOARD_Z);
  boardMesh.renderOrder = -2;
  traceGroup.add(boardMesh);

  // The supplied background itself is the path atlas. A fixed image-space
  // route set follows its connected floor traces toward the central vanishing
  // zone. At each terminal point the shrinking signal resolves into a short,
  // local light-particle burst; the code fragment rises out of that burst and
  // is gone again within the same compact event.
  const endpointBurst = createEndpointBurstCode();
  traceGroup.add(endpointBurst.group);

  // UPPER_RIGHT_TELEMETRY_V4_5
  // Sparse network telemetry occupies the visually quiet upper-right depth
  // field. It is deliberately technical (not sacred geometry) and reacts to
  // actual signal terminations plus deliberate pointer focus.
  const upperRightTelemetry = createUpperRightTelemetry({
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    boardZ: BOARD_Z,
  });
  traceGroup.add(upperRightTelemetry.group);

  const boardSignals = createMotherboardSignalRoutes({
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    boardY: BOARD_Y,
    boardZ: BOARD_Z,
    onReveal: stampBoardReveal,
    onTerminate(point, tint, meta) {
      endpointBurst.trigger({
        point,
        tint,
        routeId: meta?.routeId ?? -1,
      });
      upperRightTelemetry.trigger({
        tint,
        routeId: meta?.routeId ?? -1,
      });
    },
  });
  traceGroup.add(boardSignals.group);
  let effectsEnabled = true;

  const boardTrail = Array.from({ length: BOARD_REVEAL_SLOTS }, () => ({
    u: -2,
    v: -2,
    strength: 0,
    tint: 0,
  }));
  let boardTrailCursor = 0;
  let documentOpen = false;
  let symbolOnly = false;

  // HYBRID_ORRERY_STARTUP_V5_1
  function syncEndpointSuppression() {
    // Motherboard bursts and telemetry stay out of the CV text field.
    const localEffectsSuspended = !effectsEnabled || symbolOnly || documentOpen;
    endpointBurst.setSuspended(localEffectsSuspended);
    upperRightTelemetry.setSuspended(localEffectsSuspended);

    // The mechanical background is part of the world, not of the text layer.
    // It is hidden only for the intro/effect lock and therefore keeps moving
    // behind the CV when the camera is close to the projection.
    proceduralOrrery.setSuspended(!effectsEnabled || symbolOnly);
  }
  const tracePoint = new THREE.Vector3();

  // Projection helpers: the pulse can live on a much nearer/farther Z layer
  // than the motherboard plane. Projecting through the active camera and
  // ray-intersecting the actual board plane keeps the revealed image area
  // visually under the pulse during home view, parallax and card focus.
  const boardRaycaster = new THREE.Raycaster();
  const boardNdc = new THREE.Vector2();
  const boardWorldPoint = new THREE.Vector3();
  const boardHit = new THREE.Vector3();
  const boardLocal = new THREE.Vector3();
  const boardWorldPosition = new THREE.Vector3();
  const boardNormal = new THREE.Vector3(0, 0, 1);
  const boardWorldQuaternion = new THREE.Quaternion();
  const boardPlane = new THREE.Plane();
  const boardWorldInverse = new THREE.Matrix4();
  let boardProjectionReady = false;

  function pointOnTrace(trace, progress, out = tracePoint) {
    const target = THREE.MathUtils.clamp(progress, 0, 1) * trace.total;
    const pts = trace.pts;
    const cum = trace.cum;
    let segment = 0;
    while (segment < cum.length - 2 && cum[segment + 1] < target) segment++;
    const start = cum[segment];
    const end = cum[segment + 1];
    const local = end > start ? (target - start) / (end - start) : 0;
    return out.copy(pts[segment]).lerp(pts[segment + 1], local);
  }

  function prepareBoardProjection() {
    if (!camera) {
      boardProjectionReady = false;
      return;
    }

    camera.updateMatrixWorld();
    group.updateMatrixWorld(true);
    boardMesh.updateWorldMatrix(true, false);
    boardWorldInverse.copy(boardMesh.matrixWorld).invert();
    boardMesh.getWorldPosition(boardWorldPosition);
    boardMesh.getWorldQuaternion(boardWorldQuaternion);
    boardNormal.set(0, 0, 1).applyQuaternion(boardWorldQuaternion).normalize();
    boardPlane.setFromNormalAndCoplanarPoint(boardNormal, boardWorldPosition);
    boardProjectionReady = true;
  }

  const projectedUv = new THREE.Vector2();

  function projectPointToBoardUv(point, out = projectedUv) {
    let u;
    let v;

    if (boardProjectionReady && camera) {
      boardWorldPoint.copy(point).applyMatrix4(traceGroup.matrixWorld);
      boardWorldPoint.project(camera);
      boardNdc.set(boardWorldPoint.x, boardWorldPoint.y);

      if (Math.abs(boardNdc.x) > 1.08 || Math.abs(boardNdc.y) > 1.08) return null;

      boardRaycaster.setFromCamera(boardNdc, camera);
      if (!boardRaycaster.ray.intersectPlane(boardPlane, boardHit)) return null;
      boardLocal.copy(boardHit).applyMatrix4(boardWorldInverse);
      u = boardLocal.x / BOARD_WIDTH + 0.5;
      v = boardLocal.y / BOARD_HEIGHT + 0.5;
    } else {
      u = point.x / TRACE_DOMAIN_X + 0.5;
      v = point.y / TRACE_DOMAIN_Y + 0.5;
    }

    if (u < -0.04 || u > 1.04 || v < -0.04 || v > 1.04) return null;
    return out.set(u, v);
  }

  function stampBoardReveal(point, tint, strength = 1) {
    const uv = projectPointToBoardUv(point);
    if (!uv) return;

    const slot = boardTrail[boardTrailCursor];
    boardTrailCursor = (boardTrailCursor + 1) % BOARD_REVEAL_SLOTS;
    slot.u = uv.x;
    slot.v = uv.y;
    slot.strength = strength;
    slot.tint = tint;
  }

  function syncBoardRevealUniforms() {
    for (let i = 0; i < BOARD_REVEAL_SLOTS; i++) {
      const slot = boardTrail[i];
      boardRevealUniforms[i].set(slot.u, slot.v, slot.strength, slot.tint);
    }
  }

  /* ---------- Sternenstaub ---------- */

  const starCount = 440;
  const starPos = new Float32Array(starCount * 3);
  const starSeed = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3]     = (rng() - 0.5) * 260;
    starPos[i * 3 + 1] = (rng() - 0.5) * 170;
    starPos[i * 3 + 2] = -25 - rng() * 210;
    starSeed[i] = rng() * 100;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  starGeo.setAttribute('aSeed',    new THREE.Float32BufferAttribute(starSeed, 1));

  const starUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uCompact: { value: 0 },
  };
  group.add(new THREE.Points(starGeo, new THREE.ShaderMaterial({
    uniforms: starUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime, uPixelRatio;
      varying float vTw, vWarm;
      void main() {
        vTw = 0.3 + 0.7 * (0.5 + 0.5 * sin(uTime * 0.28 + aSeed));
        vWarm = fract(aSeed * 0.37);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (0.9 + vTw * 1.1) * uPixelRatio * (30.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uCompact;
      varying float vTw, vWarm;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float r = length(p);
        if (r > 0.5) discard;
        vec3 col = mix(vec3(0.62, 0.78, 0.96), vec3(0.68, 0.58, 0.92), step(0.88, vWarm));
        gl_FragColor = vec4(col, smoothstep(0.5, 0.0, r) * vTw * 0.32 * mix(1.0, 0.38, uCompact));
      }
    `,
  })));

  /* ---------- Weltraumnebel: weit hinten, sehr langsam ---------- */

  // Fuenf grosszuegige Schichten in wachsender Entfernung. Der Farbverlauf
  // laeuft von kaltem Blau ueber Violett bis zu einem gedaempften Bernstein,
  // damit die Nebel dieselbe Farbwelt wie die Impulse tragen.
  const nebulaTime = { value: 0 };
  const nebulaMaterials = [];
  const nebulaMeshes = [];
  const nebulaSpecs = [
    { x: -86, y:  32, z: -238, w: 260, h: 158, seed: 1.0,  tint: 0.10, a: 0.30, drift:  0.42, warp: 1.0 },
    { x:  74, y: -36, z: -276, w: 300, h: 182, seed: 3.7,  tint: 0.74, a: 0.24, drift: -0.31, warp: 1.3 },
    { x:  24, y:  56, z: -210, w: 190, h: 122, seed: 6.2,  tint: 0.44, a: 0.17, drift:  0.55, warp: 0.8 },
    { x: -38, y: -52, z: -318, w: 340, h: 196, seed: 9.4,  tint: 0.92, a: 0.15, drift: -0.22, warp: 1.6 },
    { x: 108, y:  62, z: -352, w: 300, h: 174, seed: 12.1, tint: 0.30, a: 0.13, drift:  0.18, warp: 1.1 },
  ];

  for (const n of nebulaSpecs) {
    const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: nebulaTime,
          uSeed: { value: n.seed },
          uTint: { value: n.tint },
          uAlpha: { value: n.a },
          uWarp: { value: n.warp },
          uCompact: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */`
          uniform float uTime, uSeed, uTint, uAlpha, uWarp, uCompact;
          varying vec2 vUv;

          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                       mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
          }
          float fbm(vec2 p){
            float v = 0.0, a = 0.5;
            for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
            return v;
          }

          void main() {
            vec2 p = (vUv - 0.5) * 2.4;
            // Sehr traege Eigenbewegung: eine volle Schwebung dauert Minuten.
            float t = uTime * 0.0022;

            // Domain-Warping gibt der Wolke ihre schlierigen Auslaeufer.
            vec2 q = vec2(
              fbm(p * 1.2 + vec2(uSeed, uSeed * 0.7) + vec2(t, -t * 0.6)),
              fbm(p * 1.2 + vec2(uSeed * 1.9 + 5.2, uSeed * 0.3) + vec2(-t * 0.8, t))
            );
            vec2 r = vec2(
              fbm(p * 1.7 + uWarp * 2.4 * q + vec2(1.7, 9.2) + t * 0.5),
              fbm(p * 1.7 + uWarp * 2.4 * q + vec2(8.3, 2.8) - t * 0.4)
            );
            float n = fbm(p * 1.9 + uWarp * 2.0 * r + uSeed);

            // Zwei Dichtestufen: weicher Grundschleier und heller Kern.
            float veil = pow(smoothstep(0.28, 0.92, n), 1.9);
            float core = pow(smoothstep(0.58, 0.98, n), 4.2);
            float filament = pow(1.0 - abs(r.x - r.y) * 1.7, 6.0) * 0.35;

            float vign = smoothstep(1.12, 0.05, length(p));

            vec3 cold  = vec3(0.045, 0.15, 0.32);
            vec3 mid   = vec3(0.17, 0.10, 0.36);
            vec3 warm  = vec3(0.34, 0.19, 0.20);
            vec3 col = mix(cold, mid, smoothstep(0.0, 0.6, uTint));
            col = mix(col, warm, smoothstep(0.6, 1.0, uTint));
            // Der Kern zieht leicht ins Helle, so bekommen die Wolken Tiefe.
            col = mix(col, col + vec3(0.24, 0.26, 0.30), core);

            float alpha = (veil * 0.62 + core * 0.5 + max(0.0, filament) * veil)
              * vign * uAlpha * mix(1.0, 0.12, uCompact);
            if (alpha < 0.002) discard;
            gl_FragColor = vec4(col, alpha);
          }
        `,
      });
    nebulaMaterials.push(material);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(n.w, n.h), material);
    mesh.position.set(n.x, n.y, n.z);
    mesh.userData.driftSpeed = n.drift;
    mesh.userData.homeX = n.x;
    mesh.userData.homeY = n.y;
    nebulaMeshes.push(mesh);
    group.add(mesh);
  }

  /* ---------- Pointer / scene-lock interaction ---------- */
  const pointerNdc = new THREE.Vector2(-2, -2);
  const previousPointerNdc = new THREE.Vector2(-2, -2);
  const pointerUv = new THREE.Vector2(-2, -2);
  let pointerActive = false, pointerStill = 0, pointerScan = 0, pointerScanAge = 0, pointerCooldown = 0;
  function updatePointerScan(dt) {
    pointerCooldown = Math.max(0, pointerCooldown - dt);
    if (!pointerActive || documentOpen || symbolOnly || !effectsEnabled || !camera) {
      pointerStill = 0; pointerScan = Math.max(0, pointerScan - dt * 2.8);
      boardUniforms.uPointerScan.value.z = pointerScan; return;
    }
    prepareBoardProjection();
    boardRaycaster.setFromCamera(pointerNdc, camera);
    if (!boardRaycaster.ray.intersectPlane(boardPlane, boardHit)) return;
    boardLocal.copy(boardHit).applyMatrix4(boardWorldInverse);
    pointerUv.set(boardLocal.x / BOARD_WIDTH + 0.5, boardLocal.y / BOARD_HEIGHT + 0.5);
    if (pointerUv.x < 0 || pointerUv.x > 1 || pointerUv.y < 0 || pointerUv.y > 1) return;
    const movement = pointerNdc.distanceTo(previousPointerNdc); previousPointerNdc.copy(pointerNdc);
    pointerStill = movement < 0.0028 ? pointerStill + dt : 0;
    if (pointerStill >= 0.68 && pointerCooldown <= 0 && pointerScan <= 0.02) {
      pointerScan = 1; pointerScanAge = 0; pointerCooldown = 2.8;
      const world = boardHit.clone(); traceGroup.worldToLocal(world);
      endpointBurst.trigger({ point: world, tint: 0, routeId: 97 });
      if (pointerUv.x > 0.56 && pointerUv.y > 0.43) {
        upperRightTelemetry.trigger({ routeId: 97, tint: 0, pointer: true });
      }
    }
    if (pointerScan > 0) { pointerScanAge += dt; pointerScan = Math.max(0, 1 - pointerScanAge / 1.35); }
    boardUniforms.uPointerScan.value.set(pointerUv.x, pointerUv.y, pointerScan, Math.min(1, pointerScanAge / 1.05));
  }

  /* ---------- Ablaufsteuerung ---------- */

  return {
    group,
    traceCount: count,

    /** Kompatibilitaets-Uniform fuer die bestehende Intro-Schnittstelle. */
    ambient: shared.uAmbient,

    setEffectsEnabled(value) {
      effectsEnabled = Boolean(value);
      boardSignals.setEnabled(effectsEnabled);
      proceduralOrrery.setEffectsEnabled(effectsEnabled);
      if (!effectsEnabled) {
        for (const slot of boardTrail) slot.strength = 0;
        syncBoardRevealUniforms();
        endpointBurst.clear();
      }
      syncEndpointSuppression();
    },

    /** Intro suppression also keeps endpoint fireworks/code out of the opening shot. */
    setSymbolOnly(active) {
      symbolOnly = Boolean(active);
      syncEndpointSuppression();
    },

    /** Keep the motherboard effects out of the transparent CV text field. */
    setDocumentOpen(active) {
      documentOpen = Boolean(active);
      syncEndpointSuppression();
      // Die Projektion ist die Buehne: Motherboard und Impulsbahnen treten
      // ab, damit die Schrift frei bleibt. Sterne und Nebel bleiben bestehen.
      traceGroup.visible = !documentOpen;
    },

    setCompact(active) {
      starUniforms.uCompact.value = active ? 1 : 0;
      proceduralOrrery.setCompact(active);
      boardUniforms.uCompact.value = active ? 1 : 0;
      endpointBurst.setCompact(active);
      upperRightTelemetry.setCompact(active);
      boardSignals.setCompact(active);
      for (const material of nebulaMaterials) material.uniforms.uCompact.value = active ? 1 : 0;
    },

    setPointerNdc(x, y, active = true) {
      pointerNdc.set(Number(x) || 0, Number(y) || 0); pointerActive = Boolean(active);
      proceduralOrrery.setPointerNdc(x, y, active);
      upperRightTelemetry.setPointerNdc(x, y, active);
      if (!pointerActive) { pointerStill = 0; pointerScan = 0; boardUniforms.uPointerScan.value.set(-2, -2, 0, 0); }
    },

    setPixelRatio(pr) {
      starUniforms.uPixelRatio.value = pr;
      boardSignals.setPixelRatio(pr);
      endpointBurst.setPixelRatio(pr);
    },

    update(elapsed, delta) {
      const dt = Math.min(delta, 0.1);
      proceduralOrrery.update(elapsed, dt);
      starUniforms.uTime.value = elapsed;
      shared.uTime.value = elapsed;
      nebulaTime.value = elapsed;
      // Die Nebelschichten wandern kaum merklich seitwaerts.
      for (const mesh of nebulaMeshes) {
        const speed = mesh.userData.driftSpeed;
        mesh.position.x = mesh.userData.homeX
          + Math.sin(elapsed * 0.0043 * speed + speed * 3.1) * 22;
        mesh.position.y = mesh.userData.homeY
          + Math.cos(elapsed * 0.0031 * speed + speed * 1.7) * 11;
      }
      group.rotation.z = Math.sin(elapsed * 0.017) * 0.01;

      updatePointerScan(dt);

      // Signal energy travels only on fixed lanes traced against the supplied
      // motherboard image. Projection is prepared before route updates so each
      // travelling head reveals the exact board area underneath it.
      prepareBoardProjection();
      boardSignals.update(elapsed, dt);

      // Jeder Reveal-Stempel bleibt noch einige Augenblicke stehen und
      // verglimmt dann. Damit wird nicht die ganze Platine sichtbar, sondern
      // nur der Bereich, den der Impuls gerade durchlaufen hat.
      for (const slot of boardTrail) {
        if (slot.strength <= 0) continue;
        slot.strength = Math.max(0, slot.strength - dt / BOARD_REVEAL_DECAY);
      }
      syncBoardRevealUniforms();
      endpointBurst.update(elapsed, dt);
      upperRightTelemetry.update(elapsed, dt);
    },

    dispose() {
      group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
      endpointBurst.dispose();
      upperRightTelemetry.dispose();
      boardSignals.dispose();
      proceduralOrrery.dispose();
      boardTexture.dispose();
      stateTex.dispose();
    },
  };
}
