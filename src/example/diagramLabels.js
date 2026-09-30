import { escapeHTML as e } from './content.js';

const rows = [
  ['client', 170, 'CLIENT', 'Janas Laptop', 'Jana’s laptop'],
  ['ap', 280, 'ACCESS POINT', 'WLAN-Sender', 'Wi-Fi transmitter'],
  ['switch', 385, 'SWITCH · VLAN 20', 'Kabelverteiler', 'Cable distributor'],
  ['firewall', 520, 'FIREWALL', 'Pförtner', 'Gatekeeper'],
  ['uem', 667, 'SERVICES', 'Die Dienste', 'The services'],
  ['vm', 850, 'HYPERVISOR', 'Virtuelle Server', 'Virtual servers'],
  ['backup', 945, 'STORAGE / BACKUP', 'Sicherungskopie', 'Safety copy'],
];

/** Real HTML text stays at 12px even when the illustration scales down. */
export function diagramLabels(language, interactive = true, external = false) {
  return `<div class="diagram-labels">${rows.map(([key,y,title,de,en]) => {
    const tag = interactive ? 'button' : 'a';
    const attr = interactive ? `type="button" data-term="${key}" aria-expanded="false"` : `href="${external?`/beispiel/erklaert/${language==='en'?'en/':''}`:''}#term-${key}"`;
    return `<${tag} class="diagram-label" ${attr} data-label-y="${y}" style="top:${(y-18)/(interactive?1038:1100)*100}%"><strong>${e(title)}</strong><span>↳ ${e(language==='de'?de:en)}</span></${tag}>`;
  }).join('')}</div>`;
}

export function createDiagramLabels(root) {
  const wrap = root.querySelector('.drawing-wrap'), svg = wrap.querySelector('svg');
  let frame = 0, disposed = false;
  function layout() {
    frame = 0;
    if(disposed) return;
    svg.setAttribute('viewBox',innerWidth<=900?'180 18 560 1100':'30 18 686 1038');
    const matrix=svg.getScreenCTM(), box=wrap.getBoundingClientRect();
    if(!matrix) return;
    let previousBottom = -Infinity;
    const cableHeight = root.querySelector('.cable-pin')?.offsetHeight || 44;
    for(const label of wrap.querySelectorAll('.diagram-label')) {
      const p=new DOMPoint(540,Number(label.dataset.labelY)).matrixTransform(matrix);
      label.style.left=`${p.x-box.left}px`;
      const cableRoom=label.dataset.term==='firewall'?(innerWidth<=900?32:16):0;
      label.style.width=`${Math.max(70,box.right-p.x-4)}px`;
      // Narrow columns can wrap translated labels. Reserve their actual height
      // and the cable control, rather than relying only on drawing coordinates.
      const gap = label.dataset.term==='firewall' ? cableHeight+8 : 8;
      const top = Math.max(p.y-box.top-10+cableRoom, previousBottom+gap);
      label.style.top=`${top}px`;
      previousBottom = top+label.getBoundingClientRect().height;
    }
    wrap.closest('.stage')?.dispatchEvent(new Event('diagram-label-layout'));
  }
  const schedule=()=>{if(!disposed&&!frame) frame=requestAnimationFrame(layout);};
  const observer=new ResizeObserver(schedule); observer.observe(wrap); observer.observe(svg);
  document.fonts?.ready.then(schedule);
  return {dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();}};
}
