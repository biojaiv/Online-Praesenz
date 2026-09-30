/**
 * Vector geometry of the Tiefgang drawing (art space 768 × 1024).
 *
 * Every device is a box in one oblique projection: the front edge falls to the
 * right (SLOPE), the full depth runs up and to the right (DEPTH). The values match
 * the original hand drawing so labels, the uplink switch and the packet keep their
 * places; everything the page highlights is derived from these boxes.
 */
export const SLOPE = 0.177;
export const DEPTH = Object.freeze([87, -36]);

/** Point on a box: `u` along the front edge (px), `v` down the front face, `d` into the depth (0–1). */
export function at(box, u = 0, v = 0, d = 0) {
  const depth = d * (box.depth ?? 1);
  return [box.x + u + DEPTH[0] * depth, box.y + u * SLOPE + v + DEPTH[1] * depth];
}

export function corners(box) {
  const { w, h } = box;
  return {
    ftl: at(box, 0, 0), ftr: at(box, w, 0), fbl: at(box, 0, h), fbr: at(box, w, h),
    btl: at(box, 0, 0, 1), btr: at(box, w, 0, 1), bbr: at(box, w, h, 1),
  };
}

export const DEVICES = Object.freeze({
  ap: Object.freeze({ x: 300, y: 278, w: 124, h: 17, depth: 0.58 }),
  switch: Object.freeze({ x: 217, y: 358, w: 220, h: 52 }),
  firewall: Object.freeze({ x: 217, y: 502, w: 220, h: 57 }),
  services: Object.freeze({ x: 217, y: 616, w: 220, h: 124 }),
  hypervisor: Object.freeze({ x: 212, y: 846, w: 232, h: 6 }),
  storage: Object.freeze({ x: 217, y: 928, w: 220, h: 48 }),
});

/** Service rows in chapter order, so the packet only ever travels downwards. */
export const SERVICE_ROWS = Object.freeze(['DHCP · DNS', 'PXE / DEPLOY', 'AD / IDENTITY', 'UEM / PACKAGES']);
const ROW = Object.freeze({ top: 11, pitch: 28.5, height: 23.5, left: 12, right: 12 });

/** Front-face polygon of service row `i`. */
export function serviceRow(i) {
  const box = DEVICES.services, v = ROW.top + i * ROW.pitch;
  const a = at(box, ROW.left, v), b = at(box, box.w - ROW.right, v);
  const c = at(box, box.w - ROW.right, v + ROW.height), d = at(box, ROW.left, v + ROW.height);
  return { points: [a, b, c, d], v, height: ROW.height };
}

/** Screen y where a vertical line at x meets the underside / top of a box outline. */
export function bottomAt(box, x) {
  const u = Math.max(0, Math.min(box.w, x - box.x));
  if (x <= box.x + box.w) return box.y + box.h + u * SLOPE;
  const { fbr } = corners(box), t = (x - fbr[0]) / (DEPTH[0] * (box.depth ?? 1));
  return fbr[1] + DEPTH[1] * (box.depth ?? 1) * Math.min(1, t);
}
export function topAt(box, x) {
  const { ftl, btl } = corners(box);
  if (x <= btl[0]) return ftl[1] + (x - ftl[0]) * (DEPTH[1] / DEPTH[0]);
  return btl[1] + (x - btl[0]) * SLOPE;
}

/** Row centre on the shared vertical axis. */
export const rowCentreOnAxis = (i, axis) => {
  const box = DEVICES.services, { v, height } = serviceRow(i);
  return box.y + (axis - box.x) * SLOPE + v + height / 2;
};

/** Hypervisor guests standing on the plate: u along the plate front, depth into it. */
export const VM_CUBES = Object.freeze([
  { label: 'VM 01', u: 22, d: 0.42 },
  { label: 'VM 02', u: 96, d: 0.3 },
  { label: 'VM 03', u: 170, d: 0.42 },
].map(Object.freeze));
export const VM_SIZE = Object.freeze({ w: 40, h: 40, depth: 0.42 });

/** A guest cube: its footprint sits on the plate top at (u, d). */
export function vmBox(cube) {
  const [x, y] = at(DEVICES.hypervisor, cube.u, 0, cube.d);
  return { x, y: y - VM_SIZE.h, w: VM_SIZE.w, h: VM_SIZE.h, depth: VM_SIZE.depth };
}
