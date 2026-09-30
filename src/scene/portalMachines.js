import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import { engravingTextures, bezelGeometry } from './portalEngraving.js';

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
 * One portal machine per project, in the dark gaps of the middle-pedestal view:
 * Tiefgang between the left and middle pedestal, PASSUNG at the left edge,
 * Recovery Lab between the middle and right pedestal. Each faces the camera.
 */
const SLOTS = Object.freeze({
  systems: { position: [-15.5, -14.6, -40.5], yaw: .26, accent: 0xffb347 },
  passung: { position: [-38, 4.2, -30.5], yaw: .66, accent: 0xcfe6ff },
  recovery: { position: [15.5, -14.6, -40.5], yaw: -.26, accent: 0x4fd6e8 },
});
const node = name => THREE.PropertyBinding.sanitizeNodeName(name);
const CORNERS = ['NO', 'NW', 'SW', 'SO'];

function revealMaterial(source, uniform) {
  const material = source.clone();
  material.onBeforeCompile = shader => {
    shader.uniforms.uPortalReveal = uniform;
    shader.fragmentShader = 'uniform float uPortalReveal;\n' + shader.fragmentShader.replace(
      'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
      // Only reflected light dims in the dark; the accent pulse stays visible.
      'vec3 outgoingLight = (totalDiffuse + totalSpecular) * uPortalReveal + totalEmissiveRadiance;');
  };
  material.customProgramCacheKey = () => 'portal-reveal-v1';
  return material;
}

export function createPortalMachines({ reduced = false } = {}) {
  const group = new THREE.Group();
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
      const reveal = { value: .16 };
      const accent = new THREE.Color(slot.accent);
      const materials = new Map();
      root.traverse(object => {
        if (!object.isMesh) return;
        object.frustumCulled = false; // morph targets move far beyond the closed bounds
        if (object.name === node('PORTAL / Innenleuchten')) { object.visible = false; return; }
        const source = object.material;
        if (!materials.has(source)) materials.set(source, revealMaterial(source, reveal));
        object.material = materials.get(source);
      });
      // Bezel and backing appear only on the open frame (see pose()).
      const textures = engravingTextures();
      const bezelMaterial = revealMaterial(new THREE.MeshStandardMaterial({
        color: 0xa9b3bf, map: textures.map, bumpMap: textures.bumpMap, bumpScale: 2.2,
        emissive: accent, emissiveMap: textures.emissiveMap, emissiveIntensity: 0,
        metalness: .82, roughness: .4, transparent: true, opacity: 0 }), reveal);
      const backMaterial = revealMaterial(new THREE.MeshStandardMaterial({
        color: 0x2a3442, bumpMap: textures.bumpMap, bumpScale: 1.2,
        metalness: .75, roughness: .5, transparent: true, opacity: 0 }), reveal);
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
        id, holder, spinner, root, mixer, action, clip, reveal, accent,
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
    const draco = new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG).setWorkerLimit(1);
    loading = new GLTFLoader().setDRACOLoader(draco).loadAsync(MODEL_URL).then(gltf => {
      if (!disposed) build(gltf);
      return !disposed;
    }).catch(error => {
      console.warn('Portalmaschinen konnten nicht geladen werden:', error);
      return false;
    }).finally(() => draco.dispose());
    return loading;
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
      for (const item of instances.values()) {
        const hover = hovered === item.id;
        // Dark by default, fully lit and pulsing while its gallery entry is hovered.
        const pulse = reduced ? .7 : (.5 + .5 * Math.sin(elapsed * Math.PI * 2 * 1.3)) ** 2;
        const glowTarget = item.active ? .3 : hover ? .2 + .8 * pulse : 0;
        const revealTarget = item.active ? 1.7 : hover ? 1.2 + .8 * pulse : .16;
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
