import { stationFor, QUESTION_TARGETS, HARDWARE_LEFT } from './diagramLayout.js';

/** Chapter labels use SVG units; the question rail uses measured CSS pixels.
 *  Nothing follows the pointer or runs in a permanent animation loop.
 */
export function createAnnotations(root) {
  const workspace = root.querySelector('.workspace');
  const stage = workspace?.querySelector('.stage');
  const drawing = stage?.querySelector('.drawing-wrap');
  const svg = drawing?.querySelector('.source-infrastructure');
  const story = workspace?.querySelector('.story');
  if (!workspace || !stage || !svg || !story) {
    return { update() {}, dispose() {} };
  }

  const cards = [...stage.querySelectorAll('.interaction-card')];
  const rail = document.createElement('div');
  rail.className = 'hint-rail';
  rail.hidden = true;
  rail.append(...cards);
  workspace.append(rail);

  const ns = 'http://www.w3.org/2000/svg';
  const leader = document.createElementNS(ns, 'svg');
  leader.classList.add('interaction-leader');
  leader.setAttribute('aria-hidden', 'true');
  leader.setAttribute('focusable', 'false');
  leader.hidden = true;
  const path = document.createElementNS(ns, 'path');
  const point = document.createElementNS(ns, 'circle');
  point.setAttribute('r', '2.6');
  leader.append(path, point);
  workspace.append(leader);

  let disposed = false, frame = 0, lastState = '';
  function schedule() {
    if (!disposed && !frame) frame = requestAnimationFrame(layout);
  }
  function screenPoint(x, y) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(x, y).matrixTransform(matrix);
  }
  function hideLeader() {
    leader.hidden = true;
    leader.style.display = 'none';
  }
  function layout() {
    frame = 0;
    if (disposed || !workspace.isConnected) return;
    const visible = cards.find(card => !card.hidden);
    rail.hidden = !visible;
    if (!visible || document.documentElement.classList.contains('reading-mode')) {
      workspace.classList.remove('has-inline-callout');
      rail.hidden = true;
      hideLeader();
      return;
    }

    hideLeader(); // Its former SVG height must not inflate scrollHeight.

    // Measure the normal three-column layout, not an already shortened inline
    // drawing. This prevents oscillation between the two responsive modes.
    workspace.classList.remove('has-inline-callout');
    rail.dataset.mode = 'side';
    rail.style.width = '180px';
    const world = workspace.getBoundingClientRect();
    const storyBox = story.getBoundingClientRect();
    const occupiedRight = Math.min(storyBox.right, Math.max(storyBox.left,
      ...[...story.children].filter(node => !node.hidden).map(node => node.getBoundingClientRect().right)));
    const stageBox = stage.getBoundingClientRect();
    const hardwareLeft = screenPoint(...HARDWARE_LEFT);
    if (!hardwareLeft) { hideLeader(); return; }
    const gap = hardwareLeft.x - occupiedRight;
    const side = innerWidth >= 1000 && gap >= 182;

    const kind = visible.classList.contains('vm-card') ? 'vm' : 'dhcp';
    rail.dataset.target = kind;
    if (side) {
      const width = Math.min(240, gap - 24);
      rail.style.width = `${width}px`;
      rail.style.left = `${occupiedRight - world.left + 12}px`;
      const target = screenPoint(...QUESTION_TARGETS[kind]);
      const h = rail.getBoundingClientRect().height;
      const minY = stageBox.top - world.top + 12;
      const maxY = Math.max(minY, stageBox.bottom - world.top - h - 12);
      const wanted = target.y - world.top - h * 0.45;
      rail.style.top = `${Math.max(minY, Math.min(maxY, wanted))}px`;
    } else {
      // Phones and narrow embedded viewports have no genuine left-hand gutter.
      // Give the question its own grid row, never an overlay on the hardware.
      workspace.classList.add('has-inline-callout');
      rail.dataset.mode = 'inline';
      rail.style.removeProperty('left');
      rail.style.removeProperty('top');
      rail.style.removeProperty('width');
    }

    const target = screenPoint(...QUESTION_TARGETS[kind]);
    if (!target) { hideLeader(); return; }
    const bounds = workspace.getBoundingClientRect();
    const box = rail.getBoundingClientRect();
    const x = target.x - bounds.left + workspace.scrollLeft;
    const y = target.y - bounds.top + workspace.scrollTop;
    let startX, startY, d;
    if (side) {
      startX = box.right - bounds.left + workspace.scrollLeft;
      startY = box.top + box.height * 0.45 - bounds.top + workspace.scrollTop;
      const elbow = Math.max(startX + 6, x - 14);
      d = `M${startX} ${startY}H${elbow}V${y}H${x}`;
    } else {
      startX = Math.min(box.right - bounds.left - 16, Math.max(box.left - bounds.left + 16, x - 22));
      startY = box.top - bounds.top + workspace.scrollTop;
      d = `M${startX} ${startY}V${y}H${x}`;
    }
    const height = Math.max(workspace.clientHeight, workspace.scrollHeight);
    leader.setAttribute('viewBox', `0 0 ${workspace.clientWidth} ${height}`);
    leader.style.height = `${height}px`;
    path.setAttribute('d', d);
    point.setAttribute('cx', String(x));
    point.setAttribute('cy', String(y));
    leader.dataset.target = kind;
    leader.hidden = false;
    leader.style.display = 'block';
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
  [workspace, drawing, rail, ...cards].forEach(node => observer?.observe(node));
  window.addEventListener('resize', schedule);
  workspace.addEventListener('scroll', schedule, { passive: true });
  document.fonts?.ready.then(schedule);

  return {
    update(state) {
      const { chapter, vm, dhcp } = state;
      const station = stationFor(chapter);
      svg.dataset.station = station.id;
      svg.dataset.region = vm ? 'hypervisor' : station.region;
      const key = `${chapter}/${vm}/${dhcp}`;
      if (key !== lastState) { lastState = key; schedule(); }
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      workspace.removeEventListener('scroll', schedule);
      workspace.classList.remove('has-inline-callout');
      stage.append(...cards);
      rail.remove();
      leader.remove();
    },
  };
}
