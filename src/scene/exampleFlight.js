import * as THREE from 'three';
import gsap from 'gsap';

/** Exclusive camera owner during the projection. Advanced by the stage's existing frame loop. */
export function createExampleFlight({ camera, cards, scene, capture, restore }) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pose = { approach: 0, yaw: 0, returning: 0, light: 0 };
  const axis = new THREE.Vector3(0, 1, 0);
  const startPosition = new THREE.Vector3();
  const arrival = new THREE.Vector3();
  const startRotation = new THREE.Quaternion();
  const front = new THREE.Quaternion(); // Camera looks down -Z, with zero roll.
  const rotation = new THREE.Quaternion();
  const beam = new THREE.Group();
  beam.name = 'example-projector-light';
  beam.visible = false;
  scene.add(beam);
  let snapshot = null, timeline = null, pending = null, state = 'idle';
  function clearLight() {
    beam.children.slice().forEach(child => { child.geometry.dispose(); child.material.dispose(); beam.remove(child); });
    beam.visible = false;
  }
  function makeLight(bounds) {
    clearLight();
    if (motion.matches || matchMedia('(max-width: 600px)').matches) return;
    // An open, rectangular light cone starts at the actual pedestal and
    // widens towards a plane ahead of the camera, without a physical frame.
    const source = new THREE.Vector3(arrival.x, arrival.y, arrival.z + .25);
    const z = arrival.z + 12;
    const vertices = [];
    const corners = [[-8, -5], [8, -5], [8, 5], [-8, 5]].map(([x, y]) => new THREE.Vector3(arrival.x + x, arrival.y + y, z));
    for (let i = 0; i < 4; i++) vertices.push(...source, ...corners[i], ...corners[(i + 1) % 4]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    beam.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x78bfff, transparent: true, opacity: .012, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })));
    // Only a few stationary motes in this temporary light cone.
    const points = [];
    for (let i = 0; i < 26; i++) {
      const f = .45 + i / 50;
      points.push(arrival.x + Math.sin(i * 5.13) * 7 * f, arrival.y + Math.cos(i * 3.47) * 4 * f, arrival.z + 2 + f * 10);
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    beam.add(new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0x78bfff, size: .018, transparent: true, opacity: .18, depthWrite: false })));
    beam.visible = true;
  }
  function stopTimeline() {
    timeline?.kill(); timeline = null;
    pending?.(false); pending = null;
  }
  function sequence(build, complete) {
    return new Promise(resolve => {
      pending = resolve;
      timeline = gsap.timeline({ onComplete() { timeline = null; pending = null; complete(); resolve(true); } });
      build(timeline);
    });
  }
  function update() {
    if (state === 'idle') return;
    if (motion.matches && state !== 'closing') {
      camera.position.copy(startPosition); camera.quaternion.copy(startRotation);
      return;
    }
    camera.position.lerpVectors(startPosition, arrival, pose.approach);
    rotation.copy(startRotation).slerp(front, pose.approach);
    if (pose.approach >= .99999) rotation.setFromAxisAngle(axis, pose.yaw);
    camera.quaternion.copy(rotation);
    beam.visible = pose.light > .001 && beam.children.length > 0;
    for (const child of beam.children) child.material.opacity = pose.light * (child.isPoints ? .18 : .012);
    camera.updateMatrixWorld();
  }
  return {
    get active() { return state !== 'idle'; },
    get state() { return state; },
    get yaw() { return pose.yaw; },
    update,
    open() {
      if (state !== 'idle') return Promise.resolve(false);
      snapshot = capture();
      startPosition.copy(camera.position); startRotation.copy(camera.quaternion);
      const bounds = cards.worldBounds('projekte', new THREE.Box3());
      bounds.getCenter(arrival);
      arrival.y = bounds.max.y + 2.6;
      arrival.z = bounds.max.z + 4.8;
      Object.assign(pose, { approach: 0, yaw: 0, returning: 0, light: 0 });
      state = 'opening';
      if (motion.matches) { state = 'open'; return Promise.resolve(true); }
      makeLight(bounds);
      return sequence(tl => {
        tl.to(pose, { approach: 1, duration: 1.05, ease: 'power2.inOut' });
        tl.to(pose, { yaw: Math.PI, duration: 1.5, ease: 'sine.inOut' });
        tl.to(pose, { light: 1, duration: .35 }, '-=.35');
      }, () => { state = 'open'; update(); });
    },
    close() {
      if (state === 'idle' || state === 'closing') return Promise.resolve(false);
      stopTimeline();
      state = 'closing';
      const finish = () => { clearLight(); restore(snapshot); snapshot = null; state = 'idle'; };
      if (motion.matches) { finish(); return Promise.resolve(true); }
      return sequence(tl => {
        tl.to(pose, { light: 0, duration: .15 });
        tl.to(pose, { yaw: 0, duration: .85 * pose.yaw / Math.PI, ease: 'sine.inOut' }, 0);
        tl.to(pose, { approach: 0, duration: .85 * pose.approach, ease: 'power2.inOut' });
      }, finish);
    },
    dispose() { stopTimeline(); if (snapshot) restore(snapshot); clearLight(); scene.remove(beam); state = 'idle'; },
  };
}
