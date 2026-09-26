import { SERVER_UNITS, LOWER_OFFSET } from './diagramLayout.js';
import { escapeHTML } from './content.js';

/** Three independent rack housings, rather than another row inside DHCP/PXE. */
export function serverRack(prefix) {
  const slope = 34 / 180;
  const unit = ({ id, top, height, rows }) => {
    const front = top + 28;
    const right = top + 62;
    const title = id === 'ad'
      ? '<text x="742" y="' + (top + 28) + '" style="font:11px ui-monospace,Consolas,monospace;fill:#5b5d61;stroke:none">DC-01</text>' : '';
    return `<g class="service-chassis" data-server="${id}" ${id === 'ad' ? 'data-role="domain-controller"' : ''}>
      <path d="M658 ${front} 730 ${top} 910 ${top + 34} 838 ${right}Z" fill="url(#${prefix}-rack-top)"/>
      <path d="M658 ${front} 838 ${right}v${height}L658 ${front + height}Z" fill="#f7f6ef"/>
      <path d="M838 ${right} 910 ${top + 34}v${height}L838 ${right + height}Z" fill="url(#${prefix}-rack-side)"/>
      ${title}
      ${rows.map((name, i) => {
        const y = top + 35 + i * 25;
        return `<g class="service-bay" data-service="${id === 'ad' ? 'ad' : name.split(' ')[0].toLowerCase()}">
          <path d="M666 ${y} 830 ${y + 164 * slope}v20L666 ${y + 20}Z" fill="#fcfbf5" stroke="#8b8c89" stroke-width="1.2"/>
          <text transform="matrix(1 ${slope} 0 1 673 ${y + 14})" style="font:12px ui-monospace,Consolas,monospace;letter-spacing:0;fill:#303238;stroke:none">${escapeHTML(name)}</text>
          <circle cx="819" cy="${y + 153 * slope + 10}" r="2.4" fill="#faf9f1" stroke="#64666a" stroke-width="1.1"/>
        </g>`;
      }).join('')}
      ${[0, 1, 2].map(i => `<path d="M852 ${right + 9 + i * 4} 897 ${top + 46 + i * 4}" stroke="#969790" stroke-width="1"/>`).join('')}
    </g>`;
  };
  const wire = (from, to) => `<path d="M787 ${from}V${to}" pathLength="100" stroke="#96979a" stroke-width="1.3" stroke-dasharray="12 10" fill="none"/>`;
  const bottomAtCentre = spec => spec.top + 28 + spec.height + (787 - 658) * slope;
  const topAtCentre = spec => spec.top + (787 - 730) * slope;
  return `<g class="service-racks" style="stroke:#34373b;stroke-width:1.9;stroke-linejoin:round;fill:none">
    <defs>
      <linearGradient id="${prefix}-rack-top" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffefa"/><stop offset="1" stop-color="#f4f2e9"/></linearGradient>
      <linearGradient id="${prefix}-rack-side" x1="0" x2="1"><stop stop-color="#efeee5"/><stop offset="1" stop-color="#ddddd4"/></linearGradient>
    </defs>
    ${wire(bottomAtCentre(SERVER_UNITS[0]), topAtCentre(SERVER_UNITS[1]))}
    ${wire(bottomAtCentre(SERVER_UNITS[1]), topAtCentre(SERVER_UNITS[2]))}
    ${wire(bottomAtCentre(SERVER_UNITS[2]), 684 + LOWER_OFFSET)}
    ${SERVER_UNITS.map(unit).join('')}
  </g>`;
}
