/** Light contours converge on the real HTML aperture without deforming it.
 * Several slow wave modes interfere instead of moving identical sine rings.
 */
export function createWarpTunnel(host, screen) {
  const canvas = document.createElement('canvas');
  canvas.className = 'warp-tunnel'; canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let animation = 0, running = false, last = 0, time = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const hash = (index, salt) => {
    const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
  };
  const smooth = value => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  function draw(now = 0) {
    if (!running) return;
    if (now - last < 40 && !motion.matches) { animation = requestAnimationFrame(draw); return; }
    time += last ? Math.min((now - last) / 1000, .1) : 0;
    last = now;
    const width = innerWidth, height = innerHeight, ratio = Math.min(devicePixelRatio, 1.5);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const box = screen.getBoundingClientRect(), cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const count = width < 600 ? 6 : 10;
    const colors = ['112,184,225', '57,179,202', '232,164,90', '105,156,214'];
    for (let i = 0; i < count; i++) {
      const phase = (i / count + time * (.040 + hash(i, 1) * .009)) % 1;
      const depth = 1 - phase;
      const fade = smooth(phase / .17) * smooth((1 - phase) / .2) * (.39 + hash(i, 2) * .16);
      const amplitude = (9 + hash(i, 3) * 8) * Math.pow(Math.sin(Math.PI * depth), .8);
      const offset = hash(i, 4) * Math.PI * 2;
      ctx.beginPath();
      for (let j = 0; j <= 240; j++) {
        const angle = j / 240 * Math.PI * 2;
        const co = Math.cos(angle), si = Math.sin(angle);
        const radius = Math.min((box.width / 2) / Math.max(Math.abs(co), .0001),
          (box.height / 2) / Math.max(Math.abs(si), .0001));
        const outer = Math.min((width / 2 + 40) / Math.max(Math.abs(co), .0001),
          (height / 2 + 40) / Math.max(Math.abs(si), .0001));
        const displacement = Math.sin(angle * 3 - time * .38 + offset) * .58
          + Math.sin(angle * 7 + time * .23 + offset * .7) * .29
          + Math.sin(angle * 11 - time * .13 + offset * 1.3) * .13;
        const r = radius + (outer - radius) * depth + displacement * amplitude;
        const x = cx + co * r, y = cy + si * r;
        if (!j) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const color = colors[i % colors.length];
      ctx.strokeStyle = `rgba(${color},${fade})`;
      ctx.shadowColor = `rgba(${color},.45)`;
      ctx.shadowBlur = width < 600 ? 3 : 7;
      ctx.lineWidth = .85 + hash(i, 5) * .8;
      ctx.stroke();
    }
    if (!motion.matches) animation = requestAnimationFrame(draw);
  }
  const resize = () => { if (running && motion.matches) draw(); };
  window.addEventListener('resize', resize);
  return {
    start() { if (running) return; running = true; last = 0; draw(); },
    stop() { running = false; cancelAnimationFrame(animation); ctx.clearRect(0, 0, canvas.width, canvas.height); },
    dispose() { this.stop(); window.removeEventListener('resize', resize); canvas.remove(); },
  };
}
