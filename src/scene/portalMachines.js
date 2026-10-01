import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { engravingTextures, bezelGeometry } from './portalEngraving.js';
import { ORRERY_LIGHT_COUNT } from './orreryMaterials.js';

const MODEL_URL = new URL('../../Elemente/Orrery/Portal_Nebenmaschine_web.glb', import.meta.url).href;

// Model units from scripts/portal/build_portal.py (open frame outer 8 x 5).
const R_OUT = 0.95, R_IN = 0.75, RAIL = 0.056; // RAIL_OPEN: the open frame's tube radius
const CX = 4.0 - R_OUT, CY = 2.5 - R_OUT;
// Engraved bezel outside the outer rail and a graphite backing plate behind the rails.
const BEZEL_IN = R_OUT + RAIL * .8, BEZEL_OUT = R_OUT + .34;
const BACK_IN = R_IN - RAIL * .7, BACK_OUT = R_OUT + RAIL * .7;
const TILE = (BEZEL_OUT - BEZEL_IN) * 8; // one engraving tile keeps its 8:1 proportion
const HALF_OUTER_Y = CY + BEZEL_OUT;
const HALF_APERTURE_Y = CY + R_IN - RAIL;
const SCALE = 2.1;

/**
 * One portal machine per project, each carried by its own track of the Orrery.
 * A portal sits fixed on its rail and travels with the whole construct. Like the
 * Orrery it is dark unless one of the travelling light passes reaches it. Before
 * it would leave the view it is set back to a dark stretch of the same rail that
 * stays in view longest; nobody sees the jump, both places are unlit.
 * The tracks are the ones that always keep an arc in view behind the pedestals
 * (measured over full cycles, docu_workprogress/portal-laufbahnen-2026-09-30.md).
 * `position`/`yaw` are the fallback while the Orrery is not (yet) available.
 */
const SLOTS = Object.freeze({
  systems: { track: '01 HAUPTMASCHINE / Wanderringneigung 0', radius: 25,
    position: [-15.5, -14.6, -40.5], yaw: .26, accent: 0xffb347 },
  passung: { track: '01 HAUPTMASCHINE / Ring 2', radius: 22.5,
    position: [-38, 4.2, -30.5], yaw: .66, accent: 0xcfe6ff },
  recovery: { track: '01 HAUPTMASCHINE / Ring 1', radius: 19.5,
    position: [15.5, -14.6, -40.5], yaw: -.26, accent: 0x4fd6e8 },
});
// Portals turn towards the stage camera's resting position until a view camera is known.
const VIEWER = new THREE.Vector3(0, -1.2, 18);
const STAGE_CENTRE = new THREE.Vector3(0, -5, 0);
// The view a portal must stay in: behind the pedestal row, inside the frame with a margin.
const VIEW = Object.freeze({ x: .9, y: .8, behindStage: 10, far: 160 });
// Reset targets sit further inside, so a portal has a long way across before the next reset.
const TARGET = Object.freeze({ x: .8, y: .7 });
const LOOKAHEAD = 22; // seconds: reset before a portal would leave the view (waits for darkness)
const RAIL_SAMPLES = 180;
const LIGHT_MARGIN = 3; // a portal is ~2 units wide; keep it clear of the light's reach
const node = name => THREE.PropertyBinding.sanitizeNodeName(name);
const CORNERS = ['NO', 'NW', 'SW', 'SO'];

/**
 * Stage light only while hovered or open (uPortalReveal); otherwise the portal is
 * lit like the Orrery itself, by its travelling lights, and dark fragments vanish.
 */
function revealMaterial(source, uniform, orrery) {
  const material = source.clone();
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, orrery, { uPortalReveal: uniform });
    shader.vertexShader = 'varying vec3 vPortalWorld;\n' + shader.vertexShader.replace('#include <project_vertex>', `
      #include <project_vertex>
      vPortalWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = `uniform float uPortalReveal;
      varying vec3 vPortalWorld;
      uniform vec4 uOrreryLights[${ORRERY_LIGHT_COUNT}];
      uniform float uOrreryEnergy[${ORRERY_LIGHT_COUNT}];
      uniform vec4 uOrreryInspection;
      uniform float uOrreryVisible, uOrreryDocument;
    ` + shader.fragmentShader
      .replace('#include <lights_fragment_end>', `
      #include <lights_fragment_end>
      // Same light passes and falloff as the Orrery (orreryMaterials.js).
      ReflectedLight orreryLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
      for (int i = 0; i < ${ORRERY_LIGHT_COUNT + 1}; i++) {
        vec3 lightPosition; float radius, energy;
        if (i < ${ORRERY_LIGHT_COUNT}) {
          lightPosition = uOrreryLights[i].xyz; radius = uOrreryLights[i].w;
          energy = uOrreryEnergy[i] * uOrreryVisible * mix(1.0, 0.28, uOrreryDocument);
        } else {
          lightPosition = uOrreryInspection.xyz + vec3(3.0, 7.0, 10.0);
          radius = uOrreryInspection.w + 14.0;
          energy = uOrreryInspection.w > 0.0 ? 5.0 : 0.0;
        }
        if (energy <= 0.0) continue;
        float distanceToLight = distance(lightPosition, vPortalWorld);
        if (distanceToLight >= radius) continue;
        float falloff = 1.0 - smoothstep(radius * 0.25, radius, distanceToLight);
        IncidentLight passLight;
        passLight.direction = normalize((viewMatrix * vec4(lightPosition, 1.0)).xyz - geometryPosition);
        passLight.color = vec3(1.0, 0.97, 0.92) * energy * falloff * falloff;
        passLight.visible = true;
        RE_Direct(passLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, orreryLight);
      }`)
      .replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;', `
      vec3 outgoingLight = (totalDiffuse + totalSpecular) * uPortalReveal
        + orreryLight.directDiffuse + orreryLight.directSpecular + totalEmissiveRadiance;
      // In the dark the machine is as invisible as the unlit Orrery around it.
      if (uPortalReveal < 0.02 && max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b)) < 0.003) discard;`);
  };
  material.customProgramCacheKey = () => 'portal-reveal-v2';
  return material;
}

export function createPortalMachines({
  reduced = false, findTrack = () => null, getOrreryLights = () => null, getViewCamera = () => null,
  getApproach = () => null,
} = {}) {
  const group = new THREE.Group();
  // Own copies of the Orrery light state, refreshed every frame (the Orrery may load later).
  const orrery = {
    uOrreryLights: { value: Array.from({ length: ORRERY_LIGHT_COUNT }, () => new THREE.Vector4()) },
    uOrreryEnergy: { value: new Float32Array(ORRERY_LIGHT_COUNT) },
    uOrreryInspection: { value: new THREE.Vector4() },
    uOrreryVisible: { value: 1 },
    uOrreryDocument: { value: 0 },
  };
  group.name = 'portal-machines';
  const instances = new Map();
  let hovered = null, disposed = false, loading = null;
  // Drawn just before a foreground portal: clearing depth here puts the active
  // frame in front of every Orrery ring and strut between it and the camera.
  const depthClear = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
  depthClear.name = 'portal-depth-clear';
  depthClear.frustumCulled = false;
  depthClear.renderOrder = 999;
  depthClear.visible = false;
  depthClear.onBeforeRender = renderer => renderer.clearDepth();
  group.add(depthClear);
  function setForeground(item, value) {
    if (item.foreground === value) return;
    item.foreground = value;
    // Transparent queue (after the Orrery's own transparent pass), still writing depth.
    for (const material of item.materials) { material.transparent = value; material.needsUpdate = true; }
    item.root.traverse(object => { if (object.isMesh) object.renderOrder = value ? 1000 : 0; });
    depthClear.visible = [...instances.values()].some(entry => entry.foreground);
  }

  function build(gltf) {
    const clip = gltf.animations.find(item => item.name === 'Entfalten') || gltf.animations[0];
    for (const [id, slot] of Object.entries(SLOTS)) {
      const holder = new THREE.Group();
      holder.name = `portal-${id}`;
      holder.position.fromArray(slot.position);
      holder.rotation.y = slot.yaw;
      holder.scale.setScalar(SCALE);
      const spinner = new THREE.Group();
      const root = gltf.scene.clone(true);
      spinner.add(root);
      holder.add(spinner);
      group.add(holder);
      const reveal = { value: 0 };
      const accent = new THREE.Color(slot.accent);
      const materials = new Map();
      root.traverse(object => {
        if (!object.isMesh) return;
        object.frustumCulled = false; // morph targets move far beyond the closed bounds
        if (object.name === node('PORTAL / Innenleuchten')) { object.visible = false; return; }
        const source = object.material;
        if (!materials.has(source)) materials.set(source, revealMaterial(source, reveal, orrery));
        object.material = materials.get(source);
      });
      // Bezel and backing appear only on the open frame (see pose()).
      const textures = engravingTextures();
      const bezelMaterial = revealMaterial(new THREE.MeshStandardMaterial({
        color: 0xa9b3bf, map: textures.map, bumpMap: textures.bumpMap, bumpScale: 2.2,
        emissive: accent, emissiveMap: textures.emissiveMap, emissiveIntensity: 0,
        metalness: .82, roughness: .4, transparent: true, opacity: 0 }), reveal, orrery);
      const backMaterial = revealMaterial(new THREE.MeshStandardMaterial({
        color: 0x2a3442, bumpMap: textures.bumpMap, bumpScale: 1.2,
        metalness: .75, roughness: .5, transparent: true, opacity: 0 }), reveal, orrery);
      const bezel = new THREE.Mesh(new THREE.BufferGeometry(), bezelMaterial);
      const backing = new THREE.Mesh(new THREE.BufferGeometry(), backMaterial);
      for (const band of [bezel, backing]) { band.frustumCulled = false; band.visible = false; root.add(band); }
      const mixer = new THREE.AnimationMixer(root);
      const action = mixer.clipAction(clip);
      action.play();
      action.paused = true;
      action.time = 0;
      mixer.update(0);
      instances.set(id, {
        id, holder, spinner, root, mixer, action, clip, reveal, accent, slot,
        track: null, theta: null, held: false, resets: 0,
        centre: new THREE.Vector3(), quaternion: new THREE.Quaternion(), previous: null, omega: new THREE.Vector3(),
        materials: [...materials.values()],
        // Corner pivots are posed from their rail's morph weight (same curve as their
        // translation track) so the aspect stretch never compounds between frames.
        corners: CORNERS.map((label, index) => ({ sign: [[1, 1], [-1, 1], [-1, -1], [1, -1]][index],
          pivot: root.getObjectByName(node(`PORTAL / Ecke ${label}`)),
          rail: root.getObjectByName(node(`PORTAL / Ecke ${label} / Doppelschiene`)) })),
        horizontal: ['oben', 'unten'].map(label => root.getObjectByName(node(`PORTAL / Seite ${label} / Doppelschiene`))),
        vertical: ['rechts', 'links'].map((label, index) => ({ sign: index ? -1 : 1,
          mesh: root.getObjectByName(node(`PORTAL / Seite ${label} / Doppelschiene`)) })),
        bezel, backing, bandStretch: 0, open: 0,
        progress: { value: 0 }, stretch: 1, glow: 0, active: false, tween: null, foreground: false,
      });
    }
  }

  function load() {
    if (loading) return loading;
    // Meshopt-packed (see scripts/portal/build.mjs); the decoder loads with the model,
    // not with the start page.
    loading = import('three/addons/libs/meshopt_decoder.module.js')
      .then(({ MeshoptDecoder }) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(MODEL_URL)).then(gltf => {
      if (!disposed) build(gltf);
      return !disposed;
    }).catch(error => {
      console.warn('Portalmaschinen konnten nicht geladen werden:', error);
      return false;
    });
    return loading;
  }

  const railPoint = new THREE.Vector3(), viewPoint = new THREE.Vector3(), lightPoint = new THREE.Vector3();
  const spin = new THREE.Quaternion(), axis = new THREE.Vector3(), scratch = new THREE.Vector3();
  const decomposedScale = new THREE.Vector3();
  const railAt = (item, theta, target) => target
    .set(Math.cos(theta) * item.slot.radius, 0, Math.sin(theta) * item.slot.radius).applyMatrix4(item.track.matrixWorld);

  /** Inside the user's view: in frame (with margin) and behind the pedestal row. */
  function inView(point, camera, limits = VIEW) {
    viewPoint.copy(point).applyMatrix4(camera.matrixWorldInverse);
    const depth = -viewPoint.z;
    const stageDepth = -scratch.copy(STAGE_CENTRE).applyMatrix4(camera.matrixWorldInverse).z;
    if (depth < stageDepth + VIEW.behindStage || depth > VIEW.far) return false;
    viewPoint.copy(point).project(camera);
    return Math.abs(viewPoint.x) < limits.x && Math.abs(viewPoint.y) < limits.y;
  }
  /** Reached by an Orrery light pass (or the soft key around an open portal)? */
  function lit(point) {
    const lights = orrery.uOrreryLights.value, energy = orrery.uOrreryEnergy.value;
    for (let i = 0; i < lights.length; i++) {
      if (energy[i] <= 0) continue;
      lightPoint.set(lights[i].x, lights[i].y, lights[i].z);
      if (point.distanceTo(lightPoint) < lights[i].w + LIGHT_MARGIN) return true;
    }
    const inspection = orrery.uOrreryInspection.value;
    if (inspection.w > 0) {
      lightPoint.set(inspection.x + 3, inspection.y + 7, inspection.z + 10);
      if (point.distanceTo(lightPoint) < inspection.w + 14 + LIGHT_MARGIN) return true;
    }
    return false;
  }
  /** Where a rail point will be after `seconds`, from the track's measured rotation. */
  function predict(item, point, seconds, target) {
    const rate = item.omega.length();
    if (rate < 1e-6) return target.copy(point);
    spin.setFromAxisAngle(axis.copy(item.omega).divideScalar(rate), rate * seconds);
    return target.copy(point).sub(item.centre).applyQuaternion(spin).add(item.centre);
  }
  /** Seconds a rail point stays in view (sampled up to two minutes). */
  function timeInView(item, point, camera) {
    let seconds = 0;
    for (let t = 6; t <= 120; t += 6) {
      if (!inView(predict(item, point, t, scratch.clone()), camera)) break;
      seconds = t;
    }
    return seconds;
  }
  /**
   * A warp to this point ends beside the pedestal row, not among its holograms:
   * the framing camera stands `approach.distance` in front of the portal.
   */
  function clearApproach(point, camera) {
    const approach = getApproach();
    if (!approach) return true;
    scratch.subVectors(camera.position, point).setLength(approach.distance).add(point);
    return !approach.box.containsPoint(scratch);
  }
  /** Dark rail position that stays in view longest, clear of the other portals. */
  function chooseTheta(item, camera, cleanOnly = false) {
    // Prefer well inside the frame with a clean approach; relax only if nothing else is dark and free.
    return chooseWithin(item, camera, TARGET, true) ?? chooseWithin(item, camera, VIEW, true)
      ?? (cleanOnly ? null : chooseWithin(item, camera, TARGET, false) ?? chooseWithin(item, camera, VIEW, false));
  }
  function chooseWithin(item, camera, limits, clean) {
    let best = null, bestScore = -1;
    const candidate = new THREE.Vector3();
    for (let i = 0; i < RAIL_SAMPLES; i++) {
      const theta = i / RAIL_SAMPLES * Math.PI * 2;
      railAt(item, theta, candidate);
      if (!inView(candidate, camera, limits) || lit(candidate) || (clean && !clearApproach(candidate, camera))) continue;
      let crowded = false;
      for (const other of instances.values()) {
        if (other !== item && other.theta !== null && other.holder.position.distanceTo(candidate) < 9) crowded = true;
      }
      if (crowded) continue;
      const score = timeInView(item, candidate, camera);
      if (score > bestScore) { bestScore = score; best = theta; }
    }
    return best;
  }
  /** Measure the track's rotation (axis, rate, centre) from its last two frames. */
  function measure(item, dt) {
    item.track.matrixWorld.decompose(item.centre, item.quaternion, decomposedScale);
    if (item.previous && dt > 0) {
      spin.copy(item.previous).invert().premultiply(item.quaternion);
      if (spin.w < 0) spin.set(-spin.x, -spin.y, -spin.z, -spin.w);
      const angle = 2 * Math.acos(Math.min(1, spin.w));
      const sine = Math.sqrt(Math.max(0, 1 - spin.w * spin.w));
      const rate = angle / dt;
      if (sine > 1e-7) item.omega.lerp(axis.set(spin.x, spin.y, spin.z).divideScalar(sine).multiplyScalar(rate), .2);
      else item.omega.multiplyScalar(.8);
    }
    (item.previous ||= new THREE.Quaternion()).copy(item.quaternion);
  }
  /** Carry a portal on its track; set it back in the dark before it leaves the view. */
  function ride(item, dt) {
    item.track ||= findTrack(item.slot.track);
    if (!item.track) return;
    measure(item, dt);
    const camera = getViewCamera();
    const free = !item.held && !item.active && hovered !== item.id;
    if (item.theta === null) {
      // First seating: anywhere dark in view, or (no view yet) the start of the rail.
      item.theta = (camera && chooseTheta(item, camera)) ?? 0;
    } else if (camera && free) {
      railAt(item, item.theta, railPoint);
      const leaving = !inView(railPoint, camera) || !inView(predict(item, railPoint, LOOKAHEAD, scratch.clone()), camera);
      // Also move on (in the dark) from stretches where a warp would end among the holograms.
      if ((leaving || !clearApproach(railPoint, camera)) && !lit(railPoint)) {
        const theta = chooseTheta(item, camera, !leaving);
        if (theta !== null) { item.theta = theta; item.resets += 1; }
      }
    }
    railAt(item, item.theta, item.holder.position);
    // A framed page keeps its orientation; the camera follows the position only.
    if (!item.held) item.holder.lookAt(camera ? camera.position : VIEWER);
  }

  /** Scrub the unfold clip and widen the open frame to the requested aspect. */
  function pose(item) {
    item.action.time = item.progress.value * item.clip.duration;
    item.mixer.update(0);
    const weight = item.horizontal[0]?.morphTargetInfluences?.[0] ?? item.progress.value;
    const cx = CX * item.stretch;
    for (const { pivot, rail, sign } of item.corners) {
      const w = rail?.morphTargetInfluences?.[0] ?? weight;
      pivot?.position.set(sign[0] * cx * w, sign[1] * CY * w, 0);
    }
    for (const mesh of item.horizontal) if (mesh) mesh.scale.x = 1 + (item.stretch - 1) * weight;
    for (const { mesh, sign } of item.vertical) if (mesh) mesh.position.x = sign * (cx - CX) * weight;
    // The engraved bezel follows the stretched frame and fades in as it settles.
    if (item.bandStretch !== item.stretch) {
      item.bandStretch = item.stretch;
      item.bezel.geometry.dispose();
      item.backing.geometry.dispose();
      item.bezel.geometry = bezelGeometry({ cx, cy: CY, r0: BEZEL_IN, r1: BEZEL_OUT, z: -.02, tileLength: TILE });
      item.backing.geometry = bezelGeometry({ cx, cy: CY, r0: BACK_IN, r1: BACK_OUT, z: -.075, tileLength: TILE * .6 });
    }
    item.open = THREE.MathUtils.smoothstep(item.progress.value, .72, 1);
    for (const band of [item.bezel, item.backing]) {
      band.visible = item.open > .001;
      band.material.opacity = item.open;
    }
  }

  function setStretch(item, aspect) {
    // Outer frame aspect follows the projection viewport, within sane limits.
    const halfX = THREE.MathUtils.clamp(HALF_OUTER_Y * aspect, 3.5, 6);
    item.stretch = (halfX - BEZEL_OUT) / CX;
  }

  const worldQuat = new THREE.Quaternion();
  return {
    group,
    load,
    has: id => instances.has(id),
    accent: id => `#${new THREE.Color(SLOTS[id]?.accent ?? 0x7fd8ff).getHexString()}`,
    /** Keep a portal in front of the whole scene (while it frames a page). */
    setForeground(id, value) { const item = instances.get(id); if (item) setForeground(item, Boolean(value)); },
    get hovered() { return hovered; },
    setHover(id) { hovered = instances.has(id) ? id : null; },
    /**
     * Before a warp: if the flight would end among the holograms, take a dark stretch of
     * the same rail outside every light pass, in view and with a clear approach.
     */
    prepareWarp(id) {
      const item = instances.get(id), camera = getViewCamera();
      if (!item?.track || item.theta === null || !camera) return false;
      railAt(item, item.theta, railPoint);
      if (clearApproach(railPoint, camera)) return false;
      const theta = chooseTheta(item, camera, true);
      if (theta === null) return false;
      item.theta = theta; item.resets += 1;
      railAt(item, theta, item.holder.position);
      item.holder.lookAt(camera.position);
      return true;
    },
    /** Freeze a portal's orientation while it frames a page (it keeps riding its track). */
    hold(id, value) { const item = instances.get(id); if (item) item.held = Boolean(value); },
    /** World-space framing data for a camera flight (outer frame size at the given aspect). */
    frameInfo(id, aspect) {
      const item = instances.get(id);
      if (!item) return null;
      setStretch(item, aspect);
      item.holder.updateWorldMatrix(true, false);
      item.holder.getWorldQuaternion(worldQuat);
      const halfX = CX * item.stretch + BEZEL_OUT;
      return {
        center: item.holder.getWorldPosition(new THREE.Vector3()),
        normal: new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat),
        up: new THREE.Vector3(0, 1, 0).applyQuaternion(worldQuat),
        right: new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat),
        halfWidth: halfX * SCALE, halfHeight: HALF_OUTER_Y * SCALE,
      };
    },
    /** Four world-space corners of the open aperture (after frameInfo set the aspect). */
    apertureCorners(id) {
      const item = instances.get(id);
      if (!item) return [];
      const halfX = CX * item.stretch + R_IN - RAIL;
      item.holder.updateWorldMatrix(true, false);
      return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, y]) =>
        item.holder.localToWorld(new THREE.Vector3(x * halfX, y * HALF_APERTURE_Y, 0)));
    },
    apertureRadius: (R_IN - RAIL) * SCALE,
    /** Unfold (1) or fold (0); resolves when the machine has settled. */
    animate(id, target, duration = 2) {
      const item = instances.get(id);
      if (!item) return Promise.resolve(false);
      item.active = target > 0 || item.progress.value > 0;
      item.tween?.kill();
      const spin = Math.round(item.spinner.rotation.z / Math.PI) * Math.PI;
      return new Promise(resolve => {
        const done = () => {
          item.active = target > 0;
          if (!item.active) item.spinner.rotation.z = spin;
          resolve(true);
        };
        if (reduced || duration <= 0) {
          item.progress.value = target; item.spinner.rotation.z = spin; pose(item); done(); return;
        }
        gsap.to(item.spinner.rotation, { z: spin, duration: duration * .35, ease: 'power2.out' });
        item.tween = gsap.to(item.progress, { value: target, duration, ease: 'power2.inOut',
          onUpdate: () => pose(item), onComplete: done });
      });
    },
    /** Pose immediately, e.g. after a resize while the portal is open. */
    settle(id) { const item = instances.get(id); if (item) pose(item); },
    update(elapsed, delta) {
      if (disposed) return;
      const dt = Math.min(.1, Math.max(0, delta || 0));
      const source = getOrreryLights();
      if (source) {
        source.uOrreryLights.value.forEach((light, i) => orrery.uOrreryLights.value[i].copy(light));
        orrery.uOrreryEnergy.value.set(source.uOrreryEnergy.value);
        orrery.uOrreryInspection.value.copy(source.uOrreryInspection.value);
        orrery.uOrreryVisible.value = source.uOrreryVisible.value;
        orrery.uOrreryDocument.value = source.uOrreryDocument.value;
      }
      for (const item of instances.values()) {
        ride(item, dt);
        const hover = hovered === item.id;
        // Dark by default, fully lit and pulsing while its gallery entry is hovered.
        const pulse = reduced ? .7 : (.5 + .5 * Math.sin(elapsed * Math.PI * 2 * 1.3)) ** 2;
        // The warp target lights up as the camera sets off (held), before it unfolds.
        const glowTarget = item.active ? .3 : hover ? .2 + .8 * pulse : item.held ? .2 : 0;
        const revealTarget = item.active ? 1.7 : hover ? 1.2 + .8 * pulse : item.held ? 1.4 : 0;
        const response = 1 - Math.pow(hover && !reduced ? .0001 : .02, dt);
        item.glow += (glowTarget - item.glow) * response;
        item.reveal.value += (revealTarget - item.reveal.value) * response;
        for (const material of item.materials) {
          material.emissive.copy(item.accent);
          material.emissiveIntensity = item.glow * .9;
        }
        if (!item.active && !reduced) item.spinner.rotation.z += dt * .05;
        // Engraved runes and figures breathe slowly in the project colour.
        item.bezel.material.emissiveIntensity = item.open * (reduced ? .7 : .55 + .3 * Math.sin(elapsed * 1.1));
      }
    },
    dispose() {
      disposed = true;
      for (const item of instances.values()) {
        item.tween?.kill();
        item.mixer.stopAllAction();
        item.materials.forEach(material => material.dispose());
        item.bezel.material.dispose(); item.backing.material.dispose();
      }
      const geometries = new Set();
      group.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
      geometries.forEach(geometry => geometry.dispose());
      instances.clear();
      group.clear();
    },
  };
}
