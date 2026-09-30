import { SLOPE, DEPTH, DEVICES, SERVICE_ROWS, VM_CUBES, at, corners, serviceRow, vmBox } from './hardwareGeometry.js';

const f = n => n.toFixed(1);
const poly = points => `M${points.map(([x, y]) => `${f(x)} ${f(y)}`).join(' ')}Z`;
const line = (a, b) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
/** Text lying on a front face (sheared along the falling front edge). */
const frontText = (x, y, text, cls = 'hw-text') => `<text class="${cls}" transform="matrix(1 ${SLOPE} 0 1 ${f(x)} ${f(y)})">${text}</text>`;

/** Box with top, front and side faces; the side carries vent lines unless disabled. */
function box(b, { vents = 4, ventFrom = .28 } = {}) {
  const c = corners(b);
  const side = [c.ftr, c.btr, c.bbr, c.fbr];
  const vent = Array.from({ length: vents }, (_, i) => {
    const v = b.h * (ventFrom + i * (1 - ventFrom * 2) / Math.max(1, vents - 1));
    return line(at(b, b.w, v, .2), at(b, b.w, v, .78));
  }).join('');
  return `<path class="face-top" d="${poly([c.ftl, c.ftr, c.btr, c.btl])}"/>
    <path class="face-side" d="${poly(side)}"/>
    <path class="face-front" d="${poly([c.ftl, c.ftr, c.fbr, c.fbl])}"/>
    ${vents ? `<path class="hw-detail" d="${vent}"/>` : ''}`;
}

/** Recessed panel on a front face, inset by (left, top, right, bottom). */
const panel = (b, [l, t, r, bt]) => `<path class="hw-panel" d="${poly([at(b, l, t), at(b, b.w - r, t), at(b, b.w - r, b.h - bt), at(b, l, b.h - bt)])}"/>`;

function accessPoint() {
  const b = DEVICES.ap;
  const [cx, cy] = at(b, b.w * .5, 0, .5);
  // Wi-Fi arcs drawn in the top plane: a foreshortened fan opening towards the viewer.
  const arcs = [7, 12, 17].map(r => `M${f(cx - r)} ${f(cy + r * .1)}Q${f(cx)} ${f(cy - r * .72)} ${f(cx + r)} ${f(cy + r * .38)}`).join('');
  return `<g class="device" data-device="ap">${box(b, { vents: 0 })}<path class="hw-detail hw-wifi" d="${arcs}"/><circle class="hw-dot" cx="${f(cx + 1)}" cy="${f(cy + 3.4)}" r="1.6"/></g>`;
}

function networkSwitch() {
  const b = DEVICES.switch;
  const ports = Array.from({ length: 12 }, (_, i) => {
    const u = 26 + i * 13.2;
    return { port: poly([at(b, u, 18), at(b, u + 8.4, 18), at(b, u + 8.4, 28), at(b, u, 28)]), led: at(b, u + 4.2, 14) };
  });
  return `<g class="device" data-device="switch">${box(b)}${panel(b, [14, 9, 38, 13])}
    <path class="hw-port" d="${ports.map(p => p.port).join('')}"/>
    <g class="port-leds">${ports.map((p, i) => `<circle class="port-led" cx="${f(p.led[0])}" cy="${f(p.led[1])}" r="1.35" style="--port:${(1.1 + (i * 7 % 5) * .37).toFixed(2)}s;--port-delay:-${((i * 13) % 11 * .19).toFixed(2)}s"/>`).join('')}</g></g>`;
}

function firewall() {
  const b = DEVICES.firewall;
  const [tx, ty] = at(b, 20, 32);
  return `<g class="device" data-device="firewall">${box(b)}${panel(b, [12, 11, 34, 12])}${frontText(tx, ty, 'FIREWALL')}
    <path class="hw-detail" d="${line(at(b, 128, 20), at(b, 128, b.h - 20))}${line(at(b, 136, 20), at(b, 136, b.h - 20))}"/></g>`;
}

function services() {
  const b = DEVICES.services;
  const rows = SERVICE_ROWS.map((name, i) => {
    const { points, v, height } = serviceRow(i);
    const [tx, ty] = at(b, 20, v + height * .66);
    return `<path class="hw-row" d="${poly(points)}"/>${frontText(tx, ty, name)}
      <path class="hw-detail" d="${line(at(b, b.w - 38, v + height / 2), at(b, b.w - 22, v + height / 2))}"/>`;
  }).join('');
  const window = poly([at(b, b.w, b.h * .34, .3), at(b, b.w, b.h * .34, .72), at(b, b.w, b.h * .52, .72), at(b, b.w, b.h * .52, .3)]);
  return `<g class="device" data-device="services">${box(b, { vents: 3, ventFrom: .66 })}<path class="hw-panel" d="${window}"/>${rows}</g>`;
}

function hypervisor(prefix) {
  const plate = DEVICES.hypervisor;
  const cubes = VM_CUBES.map((cube, i) => {
    const vb = vmBox(cube), c = corners(vb);
    const cross = `${line(c.ftl, c.fbr)}${line(c.ftr, c.fbl)}`;
    const [tx, ty] = at(vb, 2, vb.h + 15);
    return `<g class="vm-guest" data-guest="${i + 1}">${box(vb, { vents: 0 })}<path class="hw-detail" d="${cross}"/>${frontText(tx, ty, cube.label, 'hw-text hw-text-small')}</g>`;
  }).join('');
  return `<g class="device" data-device="hypervisor">${box(plate, { vents: 0 })}
    <path class="hw-detail hw-grid" d="${[.25, .5, .75].map(d => line(at(plate, 6, 0, d), at(plate, plate.w - 6, 0, d))).join('')}"/>${cubes}</g>`;
}

function storage() {
  const b = DEVICES.storage;
  const [tx, ty] = at(b, 16, 29);
  const [cx, cy] = at(b, b.w - 50, b.h / 2 + 1);
  return `<g class="device" data-device="storage">${box(b)}${frontText(tx, ty, 'STORAGE / BACKUP')}
    <ellipse class="hw-clock" cx="${f(cx)}" cy="${f(cy)}" rx="9.5" ry="10"/><path class="hw-detail" d="M${f(cx)} ${f(cy - 6)}V${f(cy)}L${f(cx + 5)} ${f(cy + 3)}"/></g>`;
}

/** Construction leaders from each device to the label column, like the original sheet. */
function leaders() {
  const rows = [['ap', 286], ['switch', 392], ['firewall', 533], ['services', 682], ['hypervisor', 846], ['storage', 950]];
  return `<g class="hw-construction">${rows.map(([id, y]) => {
    const b = DEVICES[id], c = corners(b), x = Math.max(c.btr[0], c.bbr?.[0] ?? 0) + 14;
    return `<path d="M${f(x)} ${y}H548"/><path class="hw-tick" d="M548 ${y - 5}v10M543 ${y}h10"/>`;
  }).join('')}<path d="M548 236V1004"/></g>`;
}

export function hardwareDrawing(prefix) {
  return `<g class="hardware">${leaders()}${accessPoint()}${networkSwitch()}${firewall()}${services()}${hypervisor(prefix)}${storage()}
    <text class="hw-link-label" x="303" y="447">A</text><text class="hw-link-label" x="441" y="467">B</text></g>`;
}
