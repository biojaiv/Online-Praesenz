import { escapeHTML, number } from './content.js';

// One continuous, unfiltered crop of the supplied PNG retains the authored
// perspective, spacing, labels, paper texture and line weight.
const ART = '/example/tiefgang-infrastruktur.png';
export const packetStops = [210, 378, 561, 588, 615, 642, 799];
// The visible standby connection is offset inside the switch/firewall area.
// Changes in x happen inside the devices; exposed sections follow their dashes.
export function packetX(y) {
  if (y <= 378 || y >= 472) return 787;
  if (y < 412) return 787 + (y - 378) / 34 * 25;
  if (y <= 454) return 812;
  return 812 - (y - 454) / 18 * 25;
}
export function illustration(c, prefix = 'live', active = 0, interactive = true) {
  return `<svg class="infrastructure source-infrastructure" viewBox="470 98 675 798" xmlns="http://www.w3.org/2000/svg" aria-labelledby="${prefix}-title ${prefix}-desc" role="img" data-final="${active===6}">
    <title id="${prefix}-title">Tiefgang · JANA-01</title><desc id="${prefix}-desc">${escapeHTML(c.drawing)}</desc>
    <defs><mask id="${prefix}-packet-cut" maskUnits="userSpaceOnUse" x="470" y="98" width="675" height="798"><rect x="470" y="98" width="675" height="798" fill="white" stroke="none"/><circle class="packet-cut" cx="785" cy="799" r="33" fill="black" stroke="none"/><rect x="672" y="104" width="185" height="138" fill="black" stroke="none"/><path d="M734 788 760 792.5 810 800.3 850 809 910 823" fill="none" stroke="black" stroke-width="4"/><g class="mobile-caption-cut" fill="black"><rect x="896" y="784" width="249" height="39" stroke="none"/><path d="M859 813 879 800H899" fill="none" stroke="black" stroke-width="4"/></g></mask></defs>
    <image class="source-art" href="${ART}" width="1577" height="997" mask="url(#${prefix}-packet-cut)"/>
    <svg x="672" y="104" width="23" height="138" viewBox="590 104 23 138" overflow="hidden" aria-hidden="true"><image href="${ART}" width="1577" height="997"/></svg>
    <svg class="source-laptop" x="695" y="104" width="185" height="138" viewBox="672 104 185 138" overflow="hidden" aria-hidden="true"><defs><mask id="${prefix}-laptop-guide" maskUnits="userSpaceOnUse" x="672" y="104" width="185" height="138"><rect x="672" y="104" width="185" height="138" fill="white" stroke="none"/><rect x="784" y="104" width="6" height="12" fill="black" stroke="none"/></mask></defs><image href="${ART}" width="1577" height="997" mask="url(#${prefix}-laptop-guide)"/></svg>
    <path d="M787 98V114" fill="none" stroke="#b3b2aa" stroke-width="1.3" stroke-dasharray="5 4"/>
    <g class="packet-repair"><path class="storage-back-edge" d="M731 789.5 735 788 910 823" fill="none" stroke="#f74617" stroke-width="1.6" stroke-linecap="round"/><path d="M787 766V785" fill="none" stroke="#b3b2aa" stroke-width="1.3" stroke-dasharray="5 4"/></g>
    <g class="source-link-failure"><path d="M740 404V440" stroke="#f8f7ef" stroke-width="6"/><path d="M740 404V418m5 9v13m-12-24 5 5-5 4m15-9-5 5 5 4" stroke="#b63b29" stroke-width="2" fill="none"/></g>
    <path class="source-backup-link" d="M812 420V454" fill="none" stroke="#ff8717" stroke-width="2.5"/>
    <g class="source-slots">${[0,1,2,3].map(i=>`<path data-slot="${i}" d="M664 ${550+i*25} 828 ${582+i*25}v20L664 ${570+i*25}Z"/>`).join('')}</g>
    ${interactive?`<g class="vm-cube" data-vm tabindex="0" role="button" aria-label="${escapeHTML(c.vm)}" aria-expanded="false"><rect class="vm-hit" x="747" y="693" width="61" height="65"/><g class="vm-slide"><path d="M756 726 787 733 787 757 756 749Z" fill="#faf8f0" stroke="#ef8b19"/><text x="760" y="744">PXE</text></g></g>`:''}
    <foreignObject x="900" y="789" width="240" height="28"><div xmlns="http://www.w3.org/1999/xhtml" class="source-backup-caption"><span class="tag-number">${number(active)}</span><span class="tag-text">${escapeHTML(c.labels[active])}</span></div></foreignObject>
    <g class="packet" transform="translate(${packetX(packetStops[active])} ${packetStops[active]})" aria-hidden="true"><circle class="packet-halo" r="28"/><path class="packet-cube" d="m0-14 15 7v17L0 17-15 10V-7Z"/><path class="packet-lines" d="m-15-7 15 7 15-7M0 0v17"/></g>
  </svg>`;
}
