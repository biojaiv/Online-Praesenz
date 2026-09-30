import { DEVICES, VM_CUBES, at, bottomAt, topAt, serviceRow, rowCentreOnAxis, vmBox, corners } from './hardwareGeometry.js';

/** Art space of the drawing (768 × 1024). The hardware below the client is vector
 *  (hardwareGeometry.js); the client carton and laptop remain raster layers.
 *  Every device shares one vertical axis; the packet and the guides follow it. */
export const ART = Object.freeze({ width: 768, height: 1024 });

/** The client is split so the carton can be packed away: carton and laptop
 *  are raster layers; the base hidden by the carton flaps is vector. */
const deck = (() => {
  const back = [[344, 129], [493, 151]], front = [[283.9, 160.4], [432.9, 182.4]], depth = 5;
  const pts = list => list.map(([x, y]) => `${x} ${y}`).join(' ');
  const down = ([x, y]) => [x, y + depth];
  return Object.freeze({
    top: `M${pts([back[0], back[1], front[1], front[0]])}Z`,
    front: `M${pts([front[0], front[1], down(front[1]), down(front[0])])}Z`,
    side: `M${pts([front[1], back[1], down(back[1]), down(front[1])])}Z`,
  });
})();
export const CLIENT = Object.freeze({
  carton: '/example/tiefgang-karton.webp',
  laptop: '/example/tiefgang-laptop.webp',
  deck,
  guide: Object.freeze({ x: 373, from: 188, to: 224 }),
});
export const AXIS = 373;
export const DRAWING_VIEWBOX = '30 18 686 1038';
export const CAPTION_Y = 1040;
export const HARDWARE_LEFT = Object.freeze([217, 500]);

/** Visible gaps between device edges, measured along the axis (or the uplink). */
const gap = (id, x, above, below, extra = {}) => Object.freeze({
  id, x, from: Math.round(bottomAt(DEVICES[above], x) + 2), to: Math.round(topAt(DEVICES[below], x) - 2), ...extra,
});
export const GUIDES = Object.freeze([
  Object.freeze({ id: 'client-ap', x: AXIS, from: 224, to: Math.round(topAt(DEVICES.ap, AXIS) - 2) }),
  gap('ap-switch', AXIS, 'ap', 'switch'),
  gap('uplink-a', 319, 'switch', 'firewall', { link: 'a' }),
  gap('uplink-b', 427, 'switch', 'firewall', { link: 'b' }),
  gap('firewall-services', AXIS, 'firewall', 'services'),
  gap('services-vm', AXIS, 'services', 'hypervisor'),
  gap('hypervisor-storage', AXIS, 'hypervisor', 'storage'),
]);

/** Service rows are the chapter slots: DHCP, PXE, AD, UEM, top to bottom. */
export const SLOTS = Object.freeze(['dhcp', 'pxe', 'ad', 'uem'].map((id, i) => Object.freeze({
  id, path: `M${serviceRow(i).points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}Z`,
})));

const led = (id, device, u, v, link = false) => {
  const box = DEVICES[device], [x, y] = at(box, typeof u === 'number' && u < 0 ? box.w + u : u, box.h + v);
  return Object.freeze({ id, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, ...(link ? { link } : {}) });
};
export const LEDS = Object.freeze([
  led('ap', 'ap', DEVICES.ap.w * .8, -8),
  led('switch', 'switch', -20, -13, true),
  led('firewall', 'firewall', -22, -16, true),
  led('storage', 'storage', -18, -12),
]);

const storageStop = (() => {
  const top = topAt(DEVICES.storage, AXIS), front = at(DEVICES.storage, AXIS - DEVICES.storage.x, 0)[1];
  return Math.round((top + front) / 2);
})();
/** Chapter → highlighted device, active service slot and packet stop. Strictly descending. */
export const STATIONS = Object.freeze([
  { id: 'client', region: 'client', slot: -1, stop: 146 },
  { id: 'network', region: 'switch', slot: -1, stop: 360 },
  { id: 'dhcp', region: 'services', slot: 0, stop: rowCentreOnAxis(0, AXIS) },
  { id: 'pxe', region: 'services', slot: 1, stop: rowCentreOnAxis(1, AXIS) },
  { id: 'identity', region: 'services', slot: 2, stop: rowCentreOnAxis(2, AXIS) },
  { id: 'uem', region: 'services', slot: 3, stop: rowCentreOnAxis(3, AXIS) },
  { id: 'backup', region: 'storage', slot: -1, stop: storageStop },
].map(Object.freeze));
export const packetStops = Object.freeze(STATIONS.map(station => station.stop));

export function stationFor(chapter) {
  return STATIONS[Math.max(0, Math.min(6, Math.trunc(Number(chapter) || 0)))];
}

/** Uplinks leave the switch here; switching paths always passes this node. */
export const JUNCTION = 400;
export const BREAK_Y = 452;
/** After failover the retransmitted packet waits inside the firewall. */
export const FIREWALL_Y = 530;

/** Between switch and firewall the packet uses uplink A, or B after failover. */
export function packetX(y, link = 'primary') {
  const guide = GUIDES.find(row => row.link === (link === 'backup' ? 'b' : 'a'));
  const leave = JUNCTION, arrive = 500;
  if (y <= leave || y >= arrive) return AXIS;
  if (y < guide.from) return AXIS + (y - leave) / (guide.from - leave) * (guide.x - AXIS);
  if (y <= guide.to) return guide.x;
  return guide.x + (y - guide.to) / (arrive - guide.to) * (AXIS - guide.x);
}

/** Only the logical journey is visualized, not a network topology or boot order. */
export function packetPosition({ progress = 0, chapter = 0, lease = false, link = 'primary', rerouted = false } = {}) {
  const phase = Math.max(0, Math.min(6, Number(progress) * 6.5 || 0));
  const lower = Math.min(5, Math.floor(phase));
  let y = packetStops[lower] + (packetStops[lower + 1] - packetStops[lower]) * Math.min(1, phase - lower);
  // DHCP messages change the dialogue, not the physical service location.
  if (chapter === 2 && !lease) y = packetStops[2];
  if (chapter === 1 && link === 'failing') y = BREAK_Y - 16;
  if (chapter === 1 && (link === 'backup' || rerouted)) y = Math.max(y, FIREWALL_Y);
  return { x: packetX(y, link), y };
}

/** Points along the cabling from one packet position to another. A change
 *  between uplink A and B runs back to the switch and out on the other link. */
export function packetRoute(from, to, fromLink = 'primary', toLink = 'primary') {
  const path = link => link === 'backup' ? 'backup' : 'primary';
  const points = [{ x: from.x, y: from.y }];
  const follow = (y0, y1, link) => {
    const steps = Math.max(1, Math.ceil(Math.abs(y1 - y0) / 3));
    for (let i = 1; i <= steps; i++) {
      const y = y0 + (y1 - y0) * i / steps;
      points.push({ x: packetX(y, link), y });
    }
  };
  const crosses = path(fromLink) !== path(toLink) && (from.x !== AXIS || to.x !== AXIS);
  if (crosses) {
    follow(from.y, JUNCTION, fromLink);
    follow(JUNCTION, to.y, toLink);
  } else follow(from.y, to.y, toLink);
  points[points.length - 1] = { x: to.x, y: to.y };
  return points;
}

/** A small isometric cube turning about its vertical axis. */
export function cubeFaces(angle = Math.PI / 4, size = 12) {
  const tilt = .62, cos = Math.cos(angle), sin = Math.sin(angle);
  const point = (x, y, z) => {
    const rx = x * cos - z * sin, rz = x * sin + z * cos;
    return [rx, -(y * Math.cos(tilt) - rz * Math.sin(tilt))];
  };
  const s = size;
  const faces = [
    { kind: 'top', normal: [0, 1, 0], points: [[-s, s, -s], [s, s, -s], [s, s, s], [-s, s, s]] },
    { kind: 'side-a', normal: [0, 0, 1], points: [[-s, s, s], [s, s, s], [s, -s, s], [-s, -s, s]] },
    { kind: 'side-b', normal: [1, 0, 0], points: [[s, s, s], [s, s, -s], [s, -s, -s], [s, -s, s]] },
    { kind: 'side-a', normal: [0, 0, -1], points: [[s, s, -s], [-s, s, -s], [-s, -s, -s], [s, -s, -s]] },
    { kind: 'side-b', normal: [-1, 0, 0], points: [[-s, s, -s], [-s, s, s], [-s, -s, s], [-s, -s, -s]] },
  ];
  return faces.filter(({ normal: [x, y, z] }) => y * Math.sin(tilt) + (x * sin + z * cos) * Math.cos(tilt) > .001)
    .map(({ kind, points }) => ({ kind, d: `M${points.map(p => point(...p).map(n => n.toFixed(1)).join(' ')).join(' ')}Z` }));
}

const vmFront = (() => { const c = corners(vmBox(VM_CUBES[1])); return c; })();
/** The PXE drawer slides out of guest VM 02. */
export const VM_TARGET = Object.freeze({ ftl: vmFront.ftl, fbr: vmFront.fbr, fbl: vmFront.fbl, ftr: vmFront.ftr });
export const QUESTION_TARGETS = Object.freeze({
  dhcp: Object.freeze(serviceRow(0).points[0].map((n, i) => n + (i ? 12 : 0))),
  vm: Object.freeze([vmFront.ftl[0] + 6, (vmFront.ftl[1] + vmFront.fbl[1]) / 2]),
  intro: Object.freeze([292, 168]),
});
