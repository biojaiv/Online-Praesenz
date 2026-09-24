import * as THREE from 'three';
import { buildBlenderOrrery } from './blenderOrreryAssembly.js';
import { createOrreryMaterial, ORRERY_LIGHT_COUNT } from './orreryMaterials.js';
import { createOrreryPaths, isPathVisible } from './orreryPaths.js';
import { createOrreryCoverage } from './orreryCoverage.js';

// The pedestal row now sits inside the inner rings, close to the central core.
const CENTRE = new THREE.Vector3(0, -1, -12);
const STAGE_CENTRE = new THREE.Vector3(0, -5, 0);
const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t); };

export function createOrreryLighting(source, { reduced = false, camera = null, random = Math.random } = {}) {
  const group = new THREE.Group();
  group.name = 'blender-orrery';
  const uniforms = {
    uOrreryLights: { value: Array.from({ length: ORRERY_LIGHT_COUNT }, () => new THREE.Vector4(0, 0, 0, 4.5)) },
    uOrreryEnergy: { value: new Float32Array(ORRERY_LIGHT_COUNT) },
    uOrreryInspection: { value: new THREE.Vector4(0, 0, 0, 0) },
    uOrreryVisible: { value: 1 },
    uOrreryRear: { value: 0 },
    uOrreryDocument: { value: 0 },
    uOrreryTime: { value: 0 },
  };
  const world = buildBlenderOrrery(source, {
    centre: CENTRE, createMaterial: (material, distant) => createOrreryMaterial(material, uniforms, distant),
  });
  group.add(world.root);
  const meshes = [];
  world.root.traverse(object => { if (object.isMesh) meshes.push(object); });
  group.updateWorldMatrix(true, true);
  const network = createOrreryPaths(world.root);
  network.update();
  const coverage = createOrreryCoverage(network, camera);
  let previousPaths = new Set();
  let compact = false;
  const viewDirection = new THREE.Vector3();
  group.userData.lightRoutes = [];
  const visible = object => {
    for (let parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
    return true;
  };
  const projected = new THREE.Vector3(), surface = new THREE.Vector3();
  const candidatePoint = new THREE.Vector3(), normal = new THREE.Vector3();
  const tangent = new THREE.Vector3(), adjacent = new THREE.Vector3();
  function pickRoute(index, used) {
    const available = network.paths.filter(path => isPathVisible(path) && !used.has(path));
    const fresh = available.filter(path => !previousPaths.has(path));
    const pool = fresh.length ? fresh : available;
    const vertical = index % 2 === 1;
    let choice, bestScore = -Infinity;
    for (let attempt = 0; attempt < 160; attempt++) {
      const path = pool[Math.floor(random() * pool.length)], t = .05 + random() * .9;
      path.point(t, surface);
      path.point(Math.min(1, t + .01), adjacent);
      tangent.copy(adjacent).sub(surface).normalize();
      let score = vertical ? Math.abs(tangent.y) : Math.hypot(tangent.x, tangent.z);
      if (camera) {
        const stageDepth = -projected.copy(STAGE_CENTRE).applyMatrix4(camera.matrixWorldInverse).z;
        const depth = -projected.copy(surface).applyMatrix4(camera.matrixWorldInverse).z;
        projected.copy(surface).project(camera);
        const inView = depth > stageDepth + 2 && Math.abs(projected.x) < .94 && Math.abs(projected.y) < .86;
        score += inView ? 4 : 0;
      }
      // A mix of crossbars and inclined rings provides vertical and horizontal travel.
      if (vertical && path.isLine) score += .25;
      if (score > bestScore) { bestScore = score; choice = { path, t }; }
      if (score > (camera ? 4.9 : .9)) break;
    }
    used.add(choice.path);
    return choice;
  }
  let enabled = true, documentOpen = false, suspended = false, disposed = false;
  let episode = null, nextEpisodeAt = 1.8, lastElapsed = 0;
  function launch(elapsed) {
    group.updateWorldMatrix(true, true);
    network.update();
    camera?.updateMatrixWorld();
    const duration = 12 + random() * 5;
    const count = 5 + Math.floor(random() * 2);
    const used = new Set();
    const lights = Array.from({ length: count }, (_, index) => ({
      ...pickRoute(index, used), direction: random() < .5 ? -1 : 1,
      speed: 3 + random() * 1.5, travelled: 0, lastElapsed: elapsed,
      baseRadius: 10 + random() * 4, radius: 12, energy: 5 + random() * 2,
      position: new THREE.Vector3(),
    }));
    previousPaths = used;
    episode = { start: elapsed, duration, lights, coverage: .15 + random() * .05,
      radiusScale: null, nextMeasureAt: elapsed };
    group.userData.lightEpisode = { targetCoverage: episode.coverage, routes: lights.map(light => light.path.name) };
  }
  function advance(light, delta) {
    // Small travel steps detect real crossings even when rendering is slow.
    let distance = Math.max(0, delta) * light.speed;
    while (distance > 0) {
      const step = Math.min(.35, distance);
      distance -= step;
      light.t += light.direction * step / Math.max(.1, light.path.length);
      light.travelled += step;
      let endpoint = false;
      if (light.path.isLine) {
        endpoint = light.t <= 0 || light.t >= 1;
        light.t = THREE.MathUtils.clamp(light.t, 0, 1);
      } else light.t = THREE.MathUtils.euclideanModulo(light.t, 1);
      light.path.point(light.t, surface);
      if ((endpoint || light.travelled > 4) && (endpoint || random() < .3)) {
        const junctions = [];
        for (const path of network.paths) {
          if (path === light.path || !isPathVisible(path)) continue;
          const t = path.closest(surface);
          path.point(t, candidatePoint);
          // Change tracks only at a physical meeting point, never across space.
          if (candidatePoint.distanceToSquared(surface) < .16) junctions.push({ path, t });
        }
        if (junctions.length) {
          const next = junctions[Math.floor(random() * junctions.length)];
          light.bridge = { point: surface.clone(), age: 0 };
          light.path = next.path; light.t = next.t;
          light.direction = next.path.isLine && next.t < .05 ? 1
            : next.path.isLine && next.t > .95 ? -1 : random() < .5 ? -1 : 1;
          light.travelled = 0;
          endpoint = false;
        }
      }
      if (endpoint) light.direction *= -1;
      if (light.bridge) light.bridge.age += step / light.speed;
    }
  }
  function updateLights(elapsed) {
    uniforms.uOrreryEnergy.value.fill(0);
    group.userData.lightRoutes = [];
    if (!episode && elapsed >= nextEpisodeAt) launch(elapsed);
    if (!episode) return;
    const age = elapsed - episode.start;
    if (age >= episode.duration) {
      episode = null;
      nextEpisodeAt = elapsed + 11 + random() * 11;
      return;
    }
    const envelope = smooth(age / 1.5) * smooth((episode.duration - age) / 1.8);
    episode.lights.forEach((light, index) => {
      advance(light, elapsed - light.lastElapsed);
      light.lastElapsed = elapsed;
      light.path.point(light.t, surface);
      if (light.bridge) {
        surface.lerp(light.bridge.point, 1 - smooth(light.bridge.age / .25));
        if (light.bridge.age >= .25) light.bridge = null;
      }
      normal.set(0, 1, 0).transformDirection(light.path.carrier.matrixWorld).multiplyScalar(1.05);
      surface.add(normal);
      light.position.copy(surface);
      uniforms.uOrreryEnergy.value[index] = light.energy * envelope;
      group.userData.lightRoutes.push({ name: light.path.name, kind: light.path.isLine ? 'strut' : 'ring',
        parameter: light.t, radius: light.path.radius, speed: light.speed });
    });
    if (elapsed >= episode.nextMeasureAt) {
      const measured = coverage.measure(episode.lights, episode.coverage);
      episode.targetScale = measured.scale;
      episode.radiusScale ??= measured.scale;
      episode.nextMeasureAt = elapsed + .25;
      group.userData.lightEpisode.measuredCoverage = measured.fraction;
    }
    // Avoid flashing radius changes as the camera or mechanisms move.
    const response = 1 - Math.exp(-Math.max(0, elapsed - (episode.lastUpdate ?? elapsed)) * 3);
    episode.radiusScale += (episode.targetScale - episode.radiusScale) * response;
    episode.lastUpdate = elapsed;
    episode.lights.forEach((light, index) => {
      light.radius = light.baseRadius * episode.radiusScale;
      uniforms.uOrreryLights.value[index].set(light.position.x, light.position.y, light.position.z, light.radius);
    });
  }
  return {
    group,
    update(elapsed, delta) {
      if (disposed) return;
      lastElapsed = elapsed;
      const dt = Math.min(.1, Math.max(0, delta || 0));
      uniforms.uOrreryDocument.value += ((documentOpen ? 1 : 0) - uniforms.uOrreryDocument.value) * (1 - Math.pow(.03, dt));
      if (camera) {
        camera.updateMatrixWorld();
        viewDirection.copy(camera.position).sub(STAGE_CENTRE).normalize();
        uniforms.uOrreryRear.value = smooth((-viewDirection.z - .1) / .7);
      }
      for (const satellite of world.satellites) satellite.visible = !compact || uniforms.uOrreryRear.value > .05;
      if (!enabled || reduced) return;
      uniforms.uOrreryTime.value = elapsed;
      for (const rotor of world.rotors) {
        const step = rotor.speed * dt * (documentOpen || suspended ? .7 : 1);
        if (rotor.axis === 'x') rotor.object.rotateX(step);
        else if (rotor.axis === 'z') rotor.object.rotateZ(step);
        else rotor.object.rotateY(step);
      }
      group.updateWorldMatrix(true, true);
      network.update();
      updateLights(elapsed);
    },
    setEffectsEnabled(value) {
      enabled = Boolean(value);
      group.visible = enabled;
      uniforms.uOrreryVisible.value = enabled ? 1 : 0;
      if (!enabled) { episode = null; uniforms.uOrreryEnergy.value.fill(0); }
      else nextEpisodeAt = Math.min(nextEpisodeAt, lastElapsed + 1.8);
    },
    setDocumentOpen(value) { documentOpen = Boolean(value); },
    setSuspended(value) { suspended = Boolean(value); },
    setCompact(value) { compact = Boolean(value); for (const satellite of world.satellites) satellite.visible = !compact || uniforms.uOrreryRear.value > .05; },
    setPixelRatio() {},
    triggerSparseIllumination() {
      if (!enabled || disposed || reduced) return false;
      launch(lastElapsed); return true;
    },
    setInspectionPoint(point, radius = 0) {
      if (point) uniforms.uOrreryInspection.value.set(point.x, point.y, point.z, radius);
      else uniforms.uOrreryInspection.value.w = 0;
    },
    getInspectionCandidates(viewCamera) {
      const candidates = [], point = new THREE.Vector3(), ndc = new THREE.Vector3();
      group.updateWorldMatrix(true, true);
      const stageDepth = -STAGE_CENTRE.clone().applyMatrix4(viewCamera.matrixWorldInverse).z;
      for (const mesh of meshes) {
        if (!visible(mesh)) continue;
        const positions = mesh.geometry.attributes.position;
        const stride = Math.max(1, Math.ceil(positions.count / 160));
        for (let i = 0; i < positions.count; i += stride) {
          point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
          const depth = -ndc.copy(point).applyMatrix4(viewCamera.matrixWorldInverse).z;
          if (depth < stageDepth + 3) continue;
          ndc.copy(point).project(viewCamera);
          if (Math.abs(ndc.x) < .96 && Math.abs(ndc.y) < .92 && ndc.z > -1 && ndc.z < 1) {
            candidates.push({ world: point.clone(), ndc: ndc.clone(), depth });
          }
        }
      }
      return candidates;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      new Set(meshes.map(mesh => mesh.geometry)).forEach(geometry => geometry.dispose());
      world.materials.forEach(material => material.dispose());
      group.clear();
    },
  };
}
