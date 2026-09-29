import * as THREE from 'three';

const point = new THREE.Vector3(), projected = new THREE.Vector3();

// Measure illuminated structure, not empty screen area. Equal arc-length samples
// on the original rings and struts give long and short members their proper weight.
export function createOrreryCoverage(network, camera) {
  const samples = [];
  const visibility = new Map();
  for (const path of network.paths) {
    const count = Math.max(3, Math.ceil(path.length / 2));
    for (let i = 0; i < count; i++) samples.push({ path, t: (i + .5) / count, weight: path.length / count, distance: 0 });
  }
  const distances = [];
  return {
    measure(lights, target) {
      distances.length = 0;
      visibility.clear();
      for (const path of network.paths) {
        let visible = true;
        for (let parent = path.carrier; parent; parent = parent.parent) if (!parent.visible) { visible = false; break; }
        visibility.set(path, visible);
      }
      let total = 0;
      const stageDepth = camera ? -point.set(0, -5, 0).applyMatrix4(camera.matrixWorldInverse).z : 0;
      for (const sample of samples) {
        if (!visibility.get(sample.path)) continue;
        sample.path.point(sample.t, point);
        if (camera) {
          const depth = -projected.copy(point).applyMatrix4(camera.matrixWorldInverse).z;
          projected.copy(point).project(camera);
          if (depth < Math.max(10, stageDepth + 2) || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z > 1) continue;
        }
        let distance = Infinity;
        // Squared distances have the same ordering. Take one square root for
        // the selected radius, instead of one for every sample/light pair.
        for (const light of lights) distance = Math.min(distance, point.distanceToSquared(light.position) / (light.baseRadius * light.baseRadius));
        sample.distance = distance;
        distances.push(sample);
        total += sample.weight;
      }
      if (!total) return { scale: 1, fraction: 0 };
      distances.sort((a, b) => a.distance - b.distance);
      let covered = 0, threshold = 1;
      for (const sample of distances) {
        covered += sample.weight;
        threshold = sample.distance;
        if (covered >= total * target) break;
      }
      // The outer falloff is faint; use the inner 80% as the visible footprint.
      return { scale: THREE.MathUtils.clamp(Math.sqrt(threshold) / .8, .25, 6), fraction: covered / total };
    },
  };
}
