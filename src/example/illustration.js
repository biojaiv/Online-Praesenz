import { escapeHTML } from './content.js';

// Hand-drawn isometric hardware; no WebGL, textures or animation loop.
// Every part shares the rack projection: width runs along (1, .2), depth
// towards the viewer along (-1, .33) and height straight up.
const iso = (ox, oy) => (x, d, h) => [ox + x - d, oy + .2 * x + .33 * d - h].map(n => +n.toFixed(1));
const face = (p, ...points) => `M${points.map(point => p(...point).join(' ')).join(' ')}Z`;
const line = (p, ...points) => `M${points.map(point => p(...point).join(' ')).join(' L')}`;

function laptop(prefix) {
  const p = iso(205, 30);
  const lid = (u, v) => [15 + 120 * u, 10 - 14 * v, -8 + 78 * v];
  const at = (u, v) => p(...lid(u, v));
  const [tx, ty] = at(.16, .64), [lx, ly] = at(.16, .7);
  const keys = [26, 32, 38, 44].map(d => line(p, [24, d, -8], [126, d, -8])).join(' ');
  const columns = [40, 58, 76, 94, 112].map(x => line(p, [x, 20, -8], [x, 50, -8])).join(' ');
  const back = `<g class="unboxing">
      <path class="top-face" d="${face(p, [0, 0, 0], [150, 0, 0], [150, -20, 32], [0, -20, 32])}"/>
      <path class="top-face" d="${face(p, [0, 0, 0], [0, 90, 0], [-34, 90, 10], [-34, 0, 10])}"/>
      <path class="side-face" d="${face(p, [0, 0, 0], [150, 0, 0], [150, 0, -40], [0, 0, -40])}"/>
      <path class="side-face" d="${face(p, [0, 0, 0], [0, 90, 0], [0, 90, -40], [0, 0, -40])}"/></g>`;
  const device = `<g class="laptop">
      <path class="side-face" d="${face(p, [135, 10, -8], [135, 80, -8], [135, 80, -14], [135, 10, -14])}"/>
      <path class="front-face" d="${face(p, [15, 80, -8], [135, 80, -8], [135, 80, -14], [15, 80, -14])}"/>
      <path class="top-face" d="${face(p, [15, 10, -8], [135, 10, -8], [135, 80, -8], [15, 80, -8])}"/>
      <path class="detail" d="${face(p, [22, 18, -8], [128, 18, -8], [128, 52, -8], [22, 52, -8])} ${keys} ${columns} ${face(p, [58, 58, -8], [92, 58, -8], [92, 74, -8], [58, 74, -8])}"/>
      <path class="front-face" d="${face(p, ...[[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => lid(u, v)))}"/>
      <path class="screen" d="M${[[.05, .1], [.95, .1], [.95, .92], [.05, .92]].map(([u, v]) => at(u, v).join(' ')).join(' ')}Z"/>
      <g class="screen-id"><text transform="matrix(1 .2 -.17 1 ${tx} ${ty})">JANA-01</text><path class="detail" d="M${at(.16, .5).join(' ')} L${at(.58, .5).join(' ')}"/></g>
      <g class="login-screen"><text transform="matrix(1 .2 -.17 1 ${lx} ${ly})">JANA</text><path d="M${at(.4, .42).join(' ')} L${at(.48, .28).join(' ')} L${at(.68, .56).join(' ')}"/></g></g>`;
  const front = `<g class="unboxing">
      <path class="side-face" d="${face(p, [150, 0, 0], [150, 90, 0], [150, 90, -40], [150, 0, -40])}"/>
      <path class="front-face" d="${face(p, [0, 90, 0], [150, 90, 0], [150, 90, -40], [0, 90, -40])}"/>
      <path fill="url(#${prefix}-hatch)" d="${face(p, [0, 90, 0], [150, 90, 0], [150, 90, -40], [0, 90, -40])}"/>
      <path class="top-face" d="${face(p, [0, 90, 0], [150, 90, 0], [150, 122, -14], [0, 122, -14])}"/>
      <path class="top-face" d="${face(p, [150, 0, 0], [150, 90, 0], [182, 90, -14], [182, 0, -14])}"/>
      <path class="detail" d="${line(p, [75, 90, 0], [75, 90, -40])}"/></g>`;
  return back + device + front;
}

function accessPoint() {
  const p = iso(252, -14);
  const [cx, cy] = p(33, 17, 0);
  return `<path class="side-face" d="${face(p, [66, 0, 0], [66, 34, 0], [66, 34, -8], [66, 0, -8])}"/>
      <path class="front-face" d="${face(p, [0, 34, 0], [66, 34, 0], [66, 34, -8], [0, 34, -8])}"/>
      <path class="top-face" d="${face(p, [0, 0, 0], [66, 0, 0], [66, 34, 0], [0, 34, 0])}"/>
      <path class="detail" d="M${cx - 15} ${cy + 1}q15-9 30 0m-24 3q9-5.5 18 0m-11.5 3h5"/>
      <circle class="led" cx="${p(58, 34, -4)[0]}" cy="${p(58, 34, -4)[1]}" r="1.8"/>`;
}

const rack = (label, slots = 0) => `
  <path class="top-face" d="M140 4 225 -24 408 11 324 41Z"/>
  <path class="side-face" d="M324 41 408 11V53L324 83Z"/>
  <path class="front-face" d="M140 4 324 41V83L140 46Z"/>
  <path class="detail" d="M147 12 316 46V74L147 40Z M332 48 395 26 M332 53 395 31 M332 58 395 36"/>
  ${slots ? Array.from({length:slots}, (_,i) => `<path class="port" d="M${157+i*12} ${23+i*2.4}l8 1.6v9l-8-1.6z"/>`).join('') : `<text transform="matrix(1 .2 0 1 155 32)">${label}</text>`}
  <circle class="led" cx="305" cy="66" r="2.3"/>`;
// Cubes stand on the hypervisor plate; t places them along its centre line.
const vm = (t, label, interactive, title) => {
  const p = iso(0, 0), [px, py] = p(6, 40, 1.5);
  return `<g class="vm-cube" transform="translate(${(171 + 192 * t).toFixed(1)} ${(-15.2 + 38.4 * t).toFixed(1)})" ${interactive ? `data-vm tabindex="0" role="button" aria-label="${escapeHTML(title)}" aria-expanded="false"` : ''}>
  <path class="top-face" d="${face(p, [0, 0, 33], [34, 0, 33], [34, 24, 33], [0, 24, 33])}"/>
  <path class="front-face" d="${face(p, [0, 24, 33], [34, 24, 33], [34, 24, 0], [0, 24, 0])}"/>
  <path class="side-face" d="${face(p, [34, 0, 33], [34, 24, 33], [34, 24, 0], [34, 0, 0])}"/>
  <path class="detail" d="${line(p, [7, 24, 26], [27, 24, 7])} ${line(p, [7, 24, 7], [27, 24, 26])}"/><text class="vm-label" x="-20" y="26">${label}</text>
  ${interactive ? `<g class="vm-slide"><path class="top-face" d="${face(p, [3, 24, 8], [31, 24, 8], [31, 42, 8], [3, 42, 8])}"/><path class="front-face" d="${face(p, [3, 42, 8], [31, 42, 8], [31, 42, 0], [3, 42, 0])}"/><text transform="matrix(1 .2 0 1 ${px} ${py})">PXE</text></g>` : ''}
</g>`;
};

export function illustration(c, prefix = 'live', active = 0, interactive = true) {
  return `<svg class="infrastructure" viewBox="0 0 570 840" xmlns="http://www.w3.org/2000/svg" aria-labelledby="${prefix}-title ${prefix}-desc" role="img">
    <title id="${prefix}-title">Tiefgang · JANA-01</title><desc id="${prefix}-desc">${escapeHTML(c.drawing)}</desc>
    <defs><pattern id="${prefix}-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0V5" stroke="#35372d" stroke-opacity=".12" stroke-width="1"/></pattern></defs>
    <g class="construction" fill="none"><path d="M275 65V789 M90 128H450 M90 318H460 M90 596H460 M90 789H460"/><path d="M105 45V780m-6-735h12m-12 735h12"/></g>
    <g class="connections" fill="none">
      <path class="client-wire" d="M175 108H121V264H180"/>
      <path class="wire" d="M290 187V258 M278 374V751"/>
      <path class="uplink primary upper" d="M243 304V329"/>
      <path class="uplink primary lower" d="M243 329V362"/>
      <path class="uplink secondary" d="M348 301H438V367H371"/>
      <text x="222" y="337">A</text><text x="450" y="338">B</text>
      <g class="broken-mark"><path d="m229 326 8 5-8 5m23-10-8 5 8 5"/></g>
    </g>
    <g class="hardware-layer ${active===0?'is-active':''}" data-layer="0" transform="translate(0 49)">
      ${laptop(prefix)}
      <text class="part-label" x="398" y="96">01 / CLIENT</text>
    </g>
    <g class="hardware-layer" data-layer="1" transform="translate(0 203)">
      ${accessPoint()}<text class="part-label" x="361" y="12">ACCESS POINT</text>
    </g>
    <g class="hardware-layer ${active===1?'is-active':''}" data-layer="2" transform="translate(0 261)">
      ${rack('',12)}<text class="part-label" x="446" y="16">SWITCH · VLAN 20</text>
    </g>
    <g class="hardware-layer" data-layer="3" transform="translate(0 367)">
      ${rack('FIREWALL')}
    </g>
    <g class="hardware-layer ${active>=2&&active<=5?'is-active':''}" data-layer="4" transform="translate(0 473)">
      <path class="top-face" d="M140 0 223 -28 408 9 324 37Z"/><path class="side-face" d="M324 37 408 9V119L324 149Z"/><path class="front-face" d="M140 0 324 37V149L140 112Z"/>
      ${['DHCP · DNS · AD','PXE / DEPLOY','UEM / PACKAGES','FILES'].map((label,i)=>`<g class="server-slot" data-slot="${i}"><path d="M148 ${9+i*27}l168 34v20L148 ${29+i*27}Z"/><text transform="matrix(1 .2 0 1 156 ${25+i*27})">${label}</text><path class="detail" d="m289 ${47+i*27} 19 4"/></g>`).join('')}
      <path class="detail" d="m340 64 49-17v20l-49 17z"/>
    </g>
    <g class="hardware-layer" data-layer="5" transform="translate(0 669)">
      <path class="top-face" d="M122 10 231 -26 423 12.4 314 48.4Z"/><path fill="url(#${prefix}-hatch)" d="M122 10 231 -26 423 12.4 314 48.4Z"/>
      ${vm(.14,'VM 01',false,c.vm)}${vm(.5,'VM 02',interactive,c.vm)}${vm(.86,'VM 03',false,c.vm)}
      <text class="part-label" x="114" y="16" text-anchor="end">HYPERVISOR</text>
    </g>
    <g class="hardware-layer ${active===6?'is-active':''}" data-layer="6" transform="translate(0 751)">
      ${rack('STORAGE / BACKUP')}
      <path class="backup-arrow" d="M278 43c13-11 29 1 23 14m-23-14 1 9 8-2m14 7c-9 13-28 0-23-12m23 12-9-1 1-8"/>
    </g>
    <g class="packet" transform="translate(275 ${[100,248,457,495,526,560,741][active]})" ${interactive?'':'aria-hidden="true"'}>
      <circle class="packet-halo" r="25"/><path class="packet-cube" d="m0-14 15 7v17L0 17-15 10V-7Z"/><path class="packet-lines" d="m-15-7 15 7 15-7M0 0v17"/>
    </g>
  </svg>`;
}
