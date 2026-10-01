import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Reserve the current camera while a project is open. Without a plan the
 * camera stays in place; with a plan it flies to `plan.position`, looking at
 * `plan.look`, and returns along the same path on close.
 */
export function createExampleFlight({ camera, capture, restore }) {
  let snapshot = null, flight = null, tween = null;
  const progress = { value: 0 };
  const lookPoint = new THREE.Vector3();
  const bend = new THREE.Vector3();
  function apply() {
    if (!flight) return;
    const p = progress.value;
    camera.position.lerpVectors(flight.fromPosition, flight.toPosition, p);
    if (flight.via) {
      // Quadratic Bézier through the control point: an arc over the pedestal row.
      bend.copy(flight.via).multiplyScalar(2).sub(flight.fromPosition).sub(flight.toPosition);
      camera.position.addScaledVector(bend, 2 * p * (1 - p) * .5);
    } else {
      // A slight rise keeps the path from grazing the pedestals.
      camera.position.addScaledVector(flight.lift, Math.sin(p * Math.PI));
    }
    lookPoint.lerpVectors(flight.fromLook, flight.toLook, p);
    camera.lookAt(lookPoint);
  }
  function run(target, duration) {
    tween?.kill();
    return new Promise(resolve => {
      if (duration <= 0) { progress.value = target; apply(); resolve(); return; }
      tween = gsap.to(progress, { value: target, duration, ease: 'power2.inOut', onUpdate: apply, onComplete: resolve });
    });
  }
  return {
    get active() { return snapshot !== null; },
    get state() { return snapshot ? (flight ? 'flying' : 'open') : 'idle'; },
    get yaw() { return 0; },
    update() { apply(); },
    open(plan = null) {
      if (snapshot) return Promise.resolve(false);
      snapshot = capture();
      if (!plan) return Promise.resolve(true);
      const fromLook = camera.getWorldDirection(new THREE.Vector3())
        .multiplyScalar(camera.position.distanceTo(plan.look)).add(camera.position);
      flight = {
        fromPosition: camera.position.clone(), toPosition: plan.position.clone(),
        fromLook, toLook: plan.look.clone(),
        lift: new THREE.Vector3(0, camera.position.distanceTo(plan.position) * .06, 0),
        via: plan.via?.clone() ?? null,
      };
      progress.value = 0;
      return run(1, plan.duration ?? 1.8).then(() => true);
    },
    /** Re-aim an open flight (e.g. after a resize) without animating. */
    retarget(plan) {
      if (!flight) return;
      flight.toPosition.copy(plan.position); flight.toLook.copy(plan.look);
      apply();
    },
    async close(duration = 1.6) {
      if (!snapshot) return false;
      if (flight) await run(0, duration);
      tween?.kill(); tween = null; flight = null;
      restore(snapshot);
      snapshot = null;
      return true;
    },
    dispose() { tween?.kill(); flight = null; if (snapshot) restore(snapshot); snapshot = null; },
  };
}
