import * as THREE from 'three';
import { lightColor } from './palette.js';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const FIB_BARS = [8, 13, 21];
const NODE_COUNT = 7;
const EDGES = Object.freeze([
  [0, 2], [2, 5], [5, 3], [3, 1], [1, 4], [4, 6], [6, 0], [2, 4],
]);

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smooth(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function makeEllipse(rx, ry, segments = 80) {
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * rx, Math.sin(angle) * ry, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

/**
 * Sparse upper-right telemetry constellation.
 *
 * This is deliberately not sacred geometry. It is a technical network layer:
 * seven depth-staggered nodes laid out with the golden angle, a small set of
 * graph edges and Fibonacci-sized status bars. Its resting opacity is low;
 * real route terminations and deliberate pointer focus temporarily energise it.
 */
export function createUpperRightTelemetry({ boardWidth, boardHeight, boardZ } = {}) {
  const group = new THREE.Group();
  group.name = 'upper-right-signal-observatory';
  group.userData.kind = 'upper-right-telemetry-v4.5';

  const width = Math.max(1, Number(boardWidth) || 1040);
  const height = Math.max(1, Number(boardHeight) || width);
  const depth = Number.isFinite(boardZ) ? boardZ : -1120;
  const home = new THREE.Vector3(width * 0.305, height * 0.255, depth + 92);
  group.position.copy(home);

  const nodes = [];
  for (let index = 0; index < NODE_COUNT; index += 1) {
    const radius = Math.sqrt((index + 0.7) / NODE_COUNT);
    const angle = index * GOLDEN_ANGLE - 0.58;
    nodes.push(new THREE.Vector3(
      Math.cos(angle) * 76 * radius,
      Math.sin(angle) * 49 * radius,
      (index - 3) * 10 + Math.sin(angle * 1.7) * 18,
    ));
  }

  const baseLineMaterial = new THREE.LineBasicMaterial({
    color: lightColor('fiber'),
    transparent: true,
    opacity: 0.045,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const edgePositions = [];
  for (const [a, b] of EDGES) {
    edgePositions.push(...nodes[a].toArray(), ...nodes[b].toArray());
  }
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
  const edges = new THREE.LineSegments(edgeGeometry, baseLineMaterial);
  edges.renderOrder = -1;
  group.add(edges);

  const orbitMaterial = new THREE.LineBasicMaterial({
    color: lightColor('base'),
    transparent: true,
    opacity: 0.025,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const orbit = new THREE.Line(makeEllipse(88, 57), orbitMaterial);
  orbit.position.z = -9;
  group.add(orbit);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: lightColor('fiber'),
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const nodeRings = nodes.map((position, index) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(index === 0 ? 3.1 : 2.25, index === 0 ? 3.8 : 2.9, 28),
      ringMaterial,
    );
    ring.position.copy(position);
    group.add(ring);
    return ring;
  });

  const coreGeometry = new THREE.BufferGeometry();
  coreGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(nodes.flatMap((node) => node.toArray()), 3),
  );
  const coreMaterial = new THREE.PointsMaterial({
    color: lightColor('fiber'),
    size: 4.2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const cores = new THREE.Points(coreGeometry, coreMaterial);
  group.add(cores);

  // Three tiny status fins: 8 / 13 / 21 units, a restrained Fibonacci echo.
  const finPositions = [];
  FIB_BARS.forEach((length, index) => {
    const x = 95 + index * 9;
    const bottom = -49;
    finPositions.push(x, bottom, -4 + index * 8, x, bottom + length, -4 + index * 8);
  });
  const finGeometry = new THREE.BufferGeometry();
  finGeometry.setAttribute('position', new THREE.Float32BufferAttribute(finPositions, 3));
  const finMaterial = new THREE.LineBasicMaterial({
    color: lightColor('amber'),
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const fins = new THREE.LineSegments(finGeometry, finMaterial);
  group.add(fins);

  const scanMaterial = new THREE.MeshBasicMaterial({
    color: lightColor('fiber'),
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const scanRing = new THREE.Mesh(new THREE.RingGeometry(20, 20.8, 64), scanMaterial);
  scanRing.position.z = 8;
  group.add(scanRing);

  const packetMaterial = new THREE.MeshBasicMaterial({
    color: lightColor('fiber'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const packet = new THREE.Mesh(new THREE.SphereGeometry(2.25, 10, 8), packetMaterial);
  packet.visible = false;
  group.add(packet);

  const pointer = new THREE.Vector2();
  let pointerActive = false;
  let pointerEnergy = 0;
  let activity = 0;
  let compact = false;
  let suspended = false;
  let pulseAge = -1;
  let pulseEdge = 0;
  let pulseHops = 0;
  let tone = 0;

  function trigger({ routeId = 0, tint = 0, pointer: fromPointer = false } = {}) {
    if (suspended) return false;
    activity = Math.max(activity, fromPointer ? 0.78 : 1);
    tone = tint > 0.5 ? 1 : 0;
    pulseEdge = Math.abs(Math.trunc(routeId)) % EDGES.length;
    pulseAge = 0;
    pulseHops = fromPointer ? 2 : 3;
    packet.visible = true;
    return true;
  }

  function updatePacket(dt) {
    if (pulseAge < 0 || pulseHops <= 0) {
      packet.visible = false;
      packetMaterial.opacity = 0;
      return;
    }
    pulseAge += dt;
    const hopDuration = compact ? 0.48 : 0.62;
    let hop = Math.floor(pulseAge / hopDuration);
    if (hop >= pulseHops) {
      pulseAge = -1;
      packet.visible = false;
      packetMaterial.opacity = 0;
      return;
    }
    const local = (pulseAge - hop * hopDuration) / hopDuration;
    const edge = EDGES[(pulseEdge + hop) % EDGES.length];
    const a = nodes[edge[0]];
    const b = nodes[edge[1]];
    packet.position.copy(a).lerp(b, smooth(local));
    packetMaterial.color.copy(tone ? lightColor('amber') : lightColor('fiber'));
    packetMaterial.opacity = Math.sin(Math.PI * local) * (compact ? 0.46 : 0.72);
    const scale = 0.78 + Math.sin(Math.PI * local) * 0.42;
    packet.scale.setScalar(scale);
  }

  return {
    group,
    trigger,

    setSuspended(value) {
      suspended = Boolean(value);
      group.visible = !suspended;
      if (suspended) {
        activity = 0;
        pointerEnergy = 0;
        pulseAge = -1;
        packet.visible = false;
      }
    },

    setCompact(value) {
      compact = Boolean(value);
    },

    setPointerNdc(x, y, active = true) {
      pointer.set(Number(x) || 0, Number(y) || 0);
      pointerActive = Boolean(active);
    },

    update(elapsed, delta) {
      if (suspended) return;
      const dt = Math.min(0.1, Math.max(0, delta));
      const inUpperRight = pointerActive && pointer.x > 0.14 && pointer.y > 0.06;
      const pointerTarget = inUpperRight ? 1 : 0;
      const response = 1 - Math.pow(0.015, dt);
      pointerEnergy += (pointerTarget - pointerEnergy) * response;
      activity = Math.max(0, activity - dt / 2.7);

      const active = clamp01(activity);
      const rest = compact ? 0.55 : 1;
      baseLineMaterial.opacity = rest * (0.036 + active * 0.16 + pointerEnergy * 0.055);
      orbitMaterial.opacity = rest * (0.018 + active * 0.055 + pointerEnergy * 0.022);
      ringMaterial.opacity = rest * (0.060 + active * 0.21 + pointerEnergy * 0.075);
      coreMaterial.opacity = rest * (0.085 + active * 0.24 + pointerEnergy * 0.090);
      finMaterial.opacity = rest * (0.040 + active * 0.19 + pointerEnergy * 0.060);

      const breathing = 0.5 + 0.5 * Math.sin(elapsed * 0.62);
      nodeRings.forEach((ring, index) => {
        const scale = 1 + breathing * 0.028 + Math.sin(elapsed * 0.34 + index * 1.7) * 0.018;
        ring.scale.setScalar(scale);
      });

      scanMaterial.opacity = pointerEnergy * (0.035 + active * 0.055);
      scanRing.rotation.z = elapsed * 0.035;
      scanRing.scale.setScalar(0.92 + pointerEnergy * 0.15 + active * 0.07);

      // Pointer response is predominantly depth, not lateral HUD motion.
      group.position.x = home.x + pointer.x * pointerEnergy * 4.8;
      group.position.y = home.y + pointer.y * pointerEnergy * 3.1;
      group.position.z = home.z + pointerEnergy * 10 + Math.sin(elapsed * 0.09) * 2.6;
      group.rotation.y = pointer.x * pointerEnergy * 0.022 + Math.sin(elapsed * 0.047) * 0.008;
      group.rotation.x = -pointer.y * pointerEnergy * 0.012;

      updatePacket(dt);
    },

    dispose() {
      edgeGeometry.dispose();
      baseLineMaterial.dispose();
      orbit.geometry.dispose();
      orbitMaterial.dispose();
      for (const ring of nodeRings) ring.geometry.dispose();
      ringMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      finGeometry.dispose();
      finMaterial.dispose();
      scanRing.geometry.dispose();
      scanMaterial.dispose();
      packet.geometry.dispose();
      packetMaterial.dispose();
    },
  };
}
