import { createRenderBudget } from '../scene/renderBudget.js';

const BLUE = '120, 191, 255';
const AMBER = '232, 164, 90';
// Fixed cross-sections: large gaps in front, closely spaced near the page.
const DEPTHS = [.06, .29, .50, .68, .82, .92, .976];
const mix = (a, b, t) => a + (b - a) * t;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function segment(context, from, to) {
  context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y); context.stroke();
}

function createField(canvas, budget, invalidate) {
  const context = canvas.getContext('2d', { alpha: true });
  const surface = document.createElement('canvas');
  const wall = surface.getContext('2d', { alpha: true });
  if (!context || !wall) return { draw() {}, dispose() {} };
  let geometryKey = '', image = null, imageSource = '', routes = [], disposed = false;

  function loadReflection(source) {
    if (source === imageSource) return;
    if (image) { image.onload = null; image.onerror = null; }
    imageSource = source; image = null;
    if (!source) return;
    const next = new Image(); image = next;
    next.onload = () => { if (!disposed && image === next) { geometryKey = ''; invalidate(); } };
    next.onerror = () => { if (!disposed && image === next) { image = null; geometryKey = ''; invalidate(); } };
    next.src = source;
  }

  function paintWalls(width, height, box, shift, mobile, ratio) {
    wall.setTransform(ratio, 0, 0, ratio, 0, 0);
    wall.clearRect(0, 0, width, height);
    wall.save();
    // The canvas never paints over the document, even before its iframe is ready.
    wall.beginPath(); wall.rect(0, 0, width, height);
    wall.rect(box.left, box.top, box.width, box.height); wall.clip('evenodd');
    wall.fillStyle = '#060d18'; wall.fillRect(0, 0, width, height);

    const outer = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
    const inner = [{ x: box.left, y: box.top }, { x: box.right, y: box.top },
      { x: box.right, y: box.bottom }, { x: box.left, y: box.bottom }];

    for (let side = 0; side < 4; side++) {
      const next = (side + 1) % 4;
      const start = { x: (outer[side].x + outer[next].x) / 2, y: (outer[side].y + outer[next].y) / 2 };
      const end = { x: (inner[side].x + inner[next].x) / 2, y: (inner[side].y + inner[next].y) / 2 };
      const light = wall.createLinearGradient(start.x, start.y, end.x, end.y);
      light.addColorStop(0, 'rgba(120,191,255,.015)');
      light.addColorStop(.55, 'rgba(180,175,150,.015)');
      light.addColorStop(.86, `rgba(239,215,169,${side === 2 ? '.11' : '.055'})`);
      light.addColorStop(1, `rgba(248,230,189,${side === 2 ? '.25' : '.15'})`);
      wall.fillStyle = light;
      wall.beginPath(); wall.moveTo(outer[side].x, outer[side].y);
      wall.lineTo(outer[next].x, outer[next].y); wall.lineTo(inner[next].x, inner[next].y);
      wall.lineTo(inner[side].x, inner[side].y); wall.closePath(); wall.fill();
    }

    // A blurred, compressed reflection of the same preview used on the pedestal.
    // It is decorative; the live HTML remains the only interactive document.
    if (!mobile && image?.complete && image.naturalWidth) {
      const floorHeight = Math.min(130, height - box.bottom);
      wall.save(); wall.globalAlpha = .23; wall.filter = 'blur(8px)';
      wall.translate(box.left - 12 + shift.x * .5, box.bottom + floorHeight + 3);
      wall.scale(1, -1); wall.drawImage(image, 0, 0, box.width + 24, floorHeight);
      wall.restore();
      const fade = wall.createLinearGradient(0, box.bottom, 0, height);
      fade.addColorStop(0, 'rgba(6,13,24,0)'); fade.addColorStop(.75, 'rgba(6,13,24,.8)');
      fade.addColorStop(1, '#060d18'); wall.fillStyle = fade;
      wall.fillRect(0, box.bottom, width, height - box.bottom);
    }

    routes = [];
    if (!mobile) {
      // Longitudinal fibres on ceiling, floor and both side walls.
      for (let side = 0; side < 4; side++) {
        const count = side % 2 === 0 ? 10 : 5;
        const next = (side + 1) % 4;
        for (let index = 1; index <= count; index++) {
          const fraction = index / (count + 1);
          const from = { x: mix(outer[side].x, outer[next].x, fraction) + shift.x,
            y: mix(outer[side].y, outer[next].y, fraction) + shift.y };
          const to = { x: mix(inner[side].x, inner[next].x, fraction), y: mix(inner[side].y, inner[next].y, fraction) };
          routes.push({ from, to });
          wall.strokeStyle = `rgba(${BLUE}, .19)`; wall.lineWidth = .65;
          segment(wall, from, to);
        }
      }

      for (const depth of DEPTHS) {
        const front = 1 - depth;
        const left = mix(-18, box.left, depth) + shift.x * front;
        const top = mix(-18, box.top, depth) + shift.y * front;
        const right = mix(width + 18, box.right, depth) + shift.x * front;
        const bottom = mix(height + 18, box.bottom, depth) + shift.y * front;
        const radius = 7 + Math.min(width, height) * .16 * front ** 1.7;
        wall.beginPath(); wall.roundRect(left, top, right - left, bottom - top, radius);
        wall.strokeStyle = `rgba(${BLUE}, ${.05 + depth * .045})`;
        wall.lineWidth = 6 * front + 2; wall.stroke();
        wall.strokeStyle = `rgba(${BLUE}, ${.24 + depth * .16})`;
        wall.lineWidth = 1.65 - depth; wall.shadowColor = `rgba(${BLUE}, .5)`;
        wall.shadowBlur = 9 * front + 2; wall.stroke(); wall.shadowBlur = 0;
      }
    }

    // Corner rails remain anchored to the real page corners. A tiny bow gives
    // the walls parallax without moving the page or breaking that attachment.
    for (let corner = 0; corner < 4; corner++) {
      const from = outer[corner], to = inner[corner];
      const rail = wall.createLinearGradient(from.x, from.y, to.x, to.y);
      rail.addColorStop(0, `rgba(${BLUE}, .25)`); rail.addColorStop(.8, `rgba(${BLUE}, .65)`);
      rail.addColorStop(1, 'rgba(210,237,255,.95)');
      wall.beginPath(); wall.moveTo(from.x, from.y);
      wall.quadraticCurveTo(mix(from.x, to.x, .45) + shift.x, mix(from.y, to.y, .45) + shift.y, to.x, to.y);
      wall.strokeStyle = `rgba(${BLUE}, .075)`; wall.lineWidth = mobile ? 5 : 7; wall.stroke();
      wall.strokeStyle = rail; wall.lineWidth = mobile ? 1 : 1.25;
      wall.shadowColor = `rgba(${BLUE}, .65)`; wall.shadowBlur = mobile ? 4 : 7;
      wall.stroke(); wall.shadowBlur = 0;
    }
    wall.restore();
  }

  function paintPulses(time) {
    for (const [index, route] of routes.entries()) {
      const cycle = 11 + index % 5;
      const phase = ((time + index * 1.73) % cycle) / cycle;
      if (phase > .36) continue;
      const travel = phase / .36;
      // Perspective slows the apparent motion as the impulse approaches the page.
      const head = 1 - (1 - travel) ** 1.7;
      const tail = Math.max(0, head - .13 * (1 - travel) - .025);
      const point = t => ({ x: mix(route.from.x, route.to.x, t), y: mix(route.from.y, route.to.y, t) });
      const from = point(tail), to = point(head);
      const strength = Math.sin(Math.PI * travel) * .85;
      const pulse = context.createLinearGradient(from.x, from.y, to.x, to.y);
      pulse.addColorStop(0, `rgba(${AMBER},0)`); pulse.addColorStop(1, `rgba(${AMBER},${strength})`);
      context.strokeStyle = pulse; context.lineWidth = 1.5;
      context.shadowColor = `rgba(${AMBER},.65)`; context.shadowBlur = 5;
      segment(context, from, to);
    }
    context.shadowBlur = 0;
  }

  return {
    draw(width, height, box, time, shift, source, mobile) {
      loadReflection(mobile ? '' : source || '');
      const ratio = budget.ratio(width, height);
      const key = [width, height, ratio, mobile, box.left, box.top, box.width, box.height, shift.x, shift.y].join('/');
      if (key !== geometryKey) {
        const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = surface.width = w; canvas.height = surface.height = h;
        }
        paintWalls(width, height, box, shift, mobile, ratio); geometryKey = key;
      }
      context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(surface, 0, 0);
      if (!mobile) {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.save(); context.beginPath(); context.rect(0, 0, width, height);
        context.rect(box.left, box.top, box.width, box.height); context.clip('evenodd');
        paintPulses(time); context.restore();
      }
    },
    dispose() {
      disposed = true;
      if (image) { image.onload = null; image.onerror = null; image = null; }
      canvas.width = surface.width = 0; canvas.height = surface.height = 0; routes = [];
    },
  };
}

export function createWarpTunnel(host, screen, { reflectionSource = () => '' } = {}) {
  let canvas = document.createElement('canvas');
  let field = null, animation = 0, running = false, last = null, time = 0, events = null, frameEvents = null;
  let target = { x: 0, y: 0 }, position = { x: 0, y: 0 };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const coarse = matchMedia('(pointer: coarse)');
  const budget = createRenderBudget();
  const mobile = () => innerWidth <= 600 || (coarse.matches && innerHeight <= 600);
  const animated = () => !motion.matches && !mobile();
  const parallax = () => animated() && pointer.matches;

  function draw(now = performance.now()) {
    animation = 0;
    if (!running || document.hidden) return;
    const moving = animated();
    const delta = last === null ? 0 : now - last;
    if (moving && last !== null && delta < 1000 / (budget.profile.name === 'low' ? 24 : 30) - 2) {
      animation = requestAnimationFrame(draw); return;
    }
    if (moving && last !== null) { budget.sample(delta); time += Math.min(delta / 1000, .1); }
    const ease = 1 - Math.exp(-Math.min(delta || 33, 100) / 90);
    if (!parallax()) target = { x: 0, y: 0 };
    position.x += (target.x - position.x) * ease; position.y += (target.y - position.y) * ease;
    if (!moving) position = { x: 0, y: 0 };
    // Quarter-pixel quantisation lets the static wall cache settle completely.
    const shift = { x: Math.round(position.x * 4) / 4, y: Math.round(position.y * 4) / 4 };
    last = now;
    field.draw(innerWidth, innerHeight, screen.getBoundingClientRect(), moving ? time : 0, shift, reflectionSource(), mobile());
    if (moving) animation = requestAnimationFrame(draw);
  }
  function refresh() { cancelAnimationFrame(animation); animation = 0; last = null; if (running) draw(); }
  function track(x, y) {
    if (!running || !parallax()) return;
    target = { x: clamp((x / innerWidth - .5) * 16, -8, 8), y: clamp((y / innerHeight - .5) * 12, -6, 6) };
  }
  function bindPointer() {
    events = new AbortController();
    host.addEventListener('pointermove', event => { if (event.pointerType !== 'touch') track(event.clientX, event.clientY); }, { passive: true, signal: events.signal });
    host.addEventListener('pointerleave', () => { target = { x: 0, y: 0 }; }, { signal: events.signal });
    const iframe = screen.querySelector('iframe');
    function bindFrame() {
      frameEvents?.abort(); frameEvents = new AbortController();
      try {
        iframe?.contentDocument?.addEventListener('pointermove', event => {
          if (event.pointerType === 'touch') return;
          const box = iframe.getBoundingClientRect(); track(box.left + event.clientX, box.top + event.clientY);
        }, { passive: true, signal: frameEvents.signal });
      } catch { /* An external document may omit parallax; navigation still works. */ }
    }
    iframe?.addEventListener('load', bindFrame, { signal: events.signal }); bindFrame();
  }
  window.addEventListener('resize', refresh);
  motion.addEventListener('change', refresh); pointer.addEventListener('change', refresh);
  coarse.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  return {
    refresh,
    start() {
      if (running) return;
      field = createField(canvas, budget, refresh); canvas.className = 'warp-tunnel';
      canvas.setAttribute('aria-hidden', 'true'); host.prepend(canvas);
      time = 0; position = { x: 0, y: 0 }; target = { x: 0, y: 0 };
      running = true; bindPointer(); refresh();
    },
    stop() {
      running = false; cancelAnimationFrame(animation); animation = 0; last = null;
      events?.abort(); events = null; frameEvents?.abort(); frameEvents = null;
      field?.dispose(); field = null; canvas.remove(); canvas = document.createElement('canvas');
    },
    dispose() {
      this.stop(); window.removeEventListener('resize', refresh); motion.removeEventListener('change', refresh);
      pointer.removeEventListener('change', refresh); document.removeEventListener('visibilitychange', refresh);
      coarse.removeEventListener('change', refresh);
    },
  };
}
