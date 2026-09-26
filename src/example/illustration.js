import { escapeHTML } from './content.js';
import {
  ART, AXIS, DRAWING_VIEWBOX, CAPTION_Y, GUIDES, REGIONS, SLOTS, LEDS, CLIENT,
  stationFor, packetStops, packetX, cubeFaces, BREAK_Y,
} from './diagramLayout.js';
export { packetStops, packetX, packetPosition, packetRoute, cubeFaces } from './diagramLayout.js';

const cube = angle => cubeFaces(angle).map(({ kind, d }) => `<path class="cube-face ${kind}" d="${d}"/>`).join('');
const size = `width="${ART.width}" height="${ART.height}"`;
// Unsynchronised blink periods, one per status LED.
const LED_TIMING = { ap: [1.3, .2], switch: [1.9, .9], firewall: [1.6, .4], storage: [2.3, 1.3] };

/** Raster drawing with vector state overlays; the client carton unpacks after chapter 01. */
export function illustration(c, prefix = 'live', active = 0, interactive = true) {
  const station = stationFor(active);
  const ink = `filter="url(#${prefix}-ink)"`;
  const clientLayer = href => `<image href="${href}" ${size}/><image class="client-ink" href="${href}" ${size} ${ink}/>`;
  const { deck, guide } = CLIENT;
  return `<svg class="infrastructure source-infrastructure" viewBox="${DRAWING_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" aria-labelledby="${prefix}-title ${prefix}-desc" role="img" data-final="${active === 6}" data-station="${station.id}" data-region="${station.region}" data-unpacked="${active > 0}">
    <title id="${prefix}-title">Tiefgang · JANA-01</title><desc id="${prefix}-desc">${escapeHTML(c.drawing)}</desc>
    <defs>
      <filter id="${prefix}-ink" color-interpolation-filters="sRGB">
        <feFlood flood-color="#fefcf6" result="paper"/><feComposite in="SourceGraphic" in2="paper" operator="over" result="flat"/>
        <feColorMatrix in="flat" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.72 -1.3 -.28 0 1.82" result="ink"/>
        <feFlood flood-color="#f2551d" result="orange"/><feComposite in="orange" in2="ink" operator="in"/>
      </filter>
      ${Object.entries(REGIONS).filter(([id]) => id !== 'client').map(([id, d]) => `<clipPath id="${prefix}-region-${id}"><path d="${d}"/></clipPath>`).join('')}
    </defs>
    <image class="drawing-art" href="${ART.href}" ${size}/>
    ${Object.keys(REGIONS).filter(id => id !== 'client').map(id => `<g class="region-highlight" data-region="${id}" clip-path="url(#${prefix}-region-${id})"><image href="${ART.href}" ${size} ${ink}/></g>`).join('')}
    <g class="client-carton">${clientLayer(CLIENT.carton)}</g>
    <g class="client-laptop"><g class="client-deck"><path class="deck-top" d="${deck.top}"/><path class="deck-front" d="${deck.front}"/><path class="deck-side" d="${deck.side}"/></g>${clientLayer(CLIENT.laptop)}</g>
    <g class="service-slots">${SLOTS.map((slot, i) => `<path class="service-slot${station.slot === i ? ' is-slot-active' : ''}" data-slot="${i}" d="${slot.path}"/>`).join('')}</g>
    <g class="guides">${GUIDES.map(row => `<path class="guide${row.link ? ` uplink uplink-${row.link}` : ''}" d="M${row.x} ${row.from}V${row.to}"/>`).join('')}
      <path class="guide guide-unpacked" d="M${guide.x} ${guide.from}V${guide.to}"/>
      <g class="uplink-break"><path d="M312 ${BREAK_Y - 5}l7 5-7 5m14-10-7 5 7 5"/></g></g>
    <g class="leds">${LEDS.map(led => {
      const [period, delay] = LED_TIMING[led.id];
      return `<circle class="led-base" cx="${led.x}" cy="${led.y}" r="3.9"/><circle class="led${led.link ? ' led-link' : ''}" data-led="${led.id}" cx="${led.x}" cy="${led.y}" r="3.1" style="--blink:${period}s;--blink-delay:-${delay}s"/>`;
    }).join('')}</g>
    ${interactive ? `<g class="vm-cube" data-vm tabindex="0" role="button" aria-label="${escapeHTML(c.vm)}" aria-expanded="false"><rect class="vm-hit" x="336" y="792" width="66" height="60"/><g class="vm-slide"><path d="M348 846 374 852V866L348 860Z"/><text transform="matrix(1 .22 0 1 352 858)">PXE</text></g></g>` : ''}
    <text class="figure-caption" x="${AXIS}" y="${CAPTION_Y}" text-anchor="middle" aria-hidden="true">${escapeHTML(c.figure)}</text>
    <g class="packet" transform="translate(${packetX(packetStops[active])} ${packetStops[active]})" aria-hidden="true"><circle class="packet-halo" r="26"/><g class="cube">${cube(Math.PI / 4)}</g></g>
  </svg>`;
}
