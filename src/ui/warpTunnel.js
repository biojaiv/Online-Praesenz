/** Procedural waves inspired by Beispielwebseiten/warptunnel.jpg.
 * Each contour contracts towards the actual HTML boundary; the content is never
 * distorted. One canvas and one cancellable animation, with fewer mobile rings.
 */
export function createWarpTunnel(host, screen) {
  const canvas = document.createElement('canvas'); canvas.className = 'warp-tunnel'; canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let animation = 0, running = false, last = 0, time = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function draw(now = 0) {
    if (!running) return;
    if (now - last < 40 && !motion.matches) { animation = requestAnimationFrame(draw); return; }
    time += last ? Math.min((now - last) / 1000, .1) : 0; last = now;
    const width = innerWidth, height = innerHeight, ratio = Math.min(devicePixelRatio, 1.5);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
    const box = screen.getBoundingClientRect(), cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const count = width < 600 ? 7 : 13;
    const colors = ['120,191,255', '37,204,213', '232,164,90', '123,120,221'];
    // Radiating ribbons and closed contours meet at the rectangular aperture.
    for (let i = 0; i < count; i++) {
      const phase = motion.matches ? i / count : (i / count + time * .065) % 1;
      const depth = 1 - phase;
      const fade = Math.sin(phase * Math.PI) * .7;
      ctx.beginPath();
      for (let j = 0; j <= 240; j++) {
        const angle = j / 240 * Math.PI * 2;
        const co = Math.cos(angle), si = Math.sin(angle);
        const radius = Math.min((box.width / 2) / Math.max(Math.abs(co), .0001), (box.height / 2) / Math.max(Math.abs(si), .0001));
        const outer = Math.min((width / 2 + 40) / Math.max(Math.abs(co), .0001), (height / 2 + 40) / Math.max(Math.abs(si), .0001));
        const wave = Math.sin(angle * 7 + time * .55 + i * .6) * 18 * depth;
        const r = radius + (outer - radius) * depth + wave;
        const x = cx + co * r, y = cy + si * r;
        if (!j) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const color = colors[i % colors.length];
      ctx.strokeStyle = `rgba(${color},${fade})`; ctx.shadowColor = `rgba(${color},.6)`; ctx.shadowBlur = width < 600 ? 4 : 12; ctx.lineWidth = 2; ctx.stroke();
    }
    if (!motion.matches) animation = requestAnimationFrame(draw);
  }
  const resize = () => { if (running && motion.matches) draw(); };
  window.addEventListener('resize', resize);
  return {
    start() { if (running) return; running = true; last = 0; draw(); },
    stop() { running = false; cancelAnimationFrame(animation); ctx.clearRect(0, 0, canvas.width, canvas.height); },
    dispose() { this.stop(); window.removeEventListener('resize', resize); canvas.remove(); }
  };
}
