/** Coordinates of /example/tiefgang-zeichnung.webp (768 × 1024). Every device
 *  shares one vertical axis; the packet and the guides follow it exactly. */
export const ART = Object.freeze({ href: '/example/tiefgang-zeichnung-ohne-client.webp', width: 768, height: 1024 });

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

/** Visible gaps between device edges, measured along the axis. */
export const GUIDES = Object.freeze([
  { id: 'client-ap', x: AXIS, from: 224, to: 255 },
  { id: 'ap-switch', x: AXIS, from: 307, to: 330 },
  { id: 'uplink-a', x: 319, from: 429, to: 467, link: 'a' },
  { id: 'uplink-b', x: 427, from: 449, to: 484, link: 'b' },
  { id: 'firewall-services', x: AXIS, from: 580, to: 589 },
  { id: 'services-vm', x: AXIS, from: 778, to: 797 },
  { id: 'hypervisor-storage', x: AXIS, from: 885, to: 896 },
].map(Object.freeze));

/** Separating polygons between stacked devices; each includes its right-hand label. */
export const REGIONS = Object.freeze({
  client: 'M30 18H716V244H30Z',
  ap: 'M30 248H716V318H30Z',
  switch: 'M30 320H716V452H30Z',
  firewall: 'M30 456H716V606H530L437 598 373 585 300 574 30 575Z',
  services: 'M30 575 300 574 373 585 437 598 530 606H716V797H437L373 786 300 778 30 774Z',
  hypervisor: 'M30 774 300 778 373 786 437 797H716V915H515L435 902 373 890 300 876 30 880Z',
  storage: 'M30 880 300 876 373 890 435 902 515 915H716V1012H30Z',
});

const slotTop = index => 624 + index * 29.5;
export const SLOTS = Object.freeze(['dhcp', 'pxe', 'uem', 'files'].map((id, i) => Object.freeze({
  id, path: `M231 ${slotTop(i)} 426 ${slotTop(i) + 32}v25L231 ${slotTop(i) + 25}Z`,
})));
const slotCentre = index => slotTop(index) + 23 + 13;

export const LEDS = Object.freeze([
  { id: 'ap', x: 376, y: 301 },
  { id: 'switch', x: 418, y: 425, link: true },
  { id: 'firewall', x: 412, y: 565, link: true },
  { id: 'storage', x: 418, y: 987 },
].map(Object.freeze));

/** Chapter → highlighted device, active service slot and packet stop. */
export const STATIONS = Object.freeze([
  { id: 'client', region: 'client', slot: -1, stop: 146 },
  { id: 'network', region: 'switch', slot: -1, stop: 360 },
  { id: 'dhcp', region: 'services', slot: 0, stop: slotCentre(0) },
  { id: 'pxe', region: 'services', slot: 1, stop: slotCentre(1) },
  { id: 'identity', region: 'services', slot: 0, stop: slotCentre(0) },
  { id: 'uem', region: 'services', slot: 2, stop: slotCentre(2) },
  { id: 'backup', region: 'storage', slot: 3, stop: 923 },
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

export const QUESTION_TARGETS = Object.freeze({
  dhcp: Object.freeze([231, slotTop(0) + 12]),
  vm: Object.freeze([342, 820]),
});
