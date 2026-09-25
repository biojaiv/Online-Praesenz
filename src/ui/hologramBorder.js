/** Canvas equivalent of the blue particles along the four hologram edges. */
export function createHologramBorder(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hologram-border';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const context = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const particles = Array.from({ length: 410 }, (_, i) => ({
    offset: (i / 410 + (Math.sin(i * 12.9898) * .5 + .5) * .3) % 1,
    speed: .45 + (Math.sin(i * 7.13) * .5 + .5) * .75,
    size: .5 + (Math.sin(i * 3.77) * .5 + .5) * 1.4,
    seed: ((Math.sin(i * 5.123) * 43758.5453) % 1 + 1) % 1,
  }));
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  const brush = sprite.getContext('2d');
  const glow = brush.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, '#b9e0ff'); glow.addColorStop(.2, '#78bfff'); glow.addColorStop(1, '#78bfff00');
  brush.fillStyle = glow; brush.fillRect(0, 0, 32, 32);
  let active = false, raf = 0, previous = 0, width = 0, height = 0, time = 0;
  function draw() {
    if (!context) return;
    context.clearRect(0, 0, width + 16, height + 16);
    const perimeter = 2 * (width + height);
    if (!perimeter) return;
    for (const particle of particles) {
      const t = (particle.offset + time * particle.speed * .018) % 1;
      const distance = t * perimeter;
      let x, y;
      if (distance < width) { x = distance; y = height; }
      else if (distance < width + height) { x = width; y = height - (distance - width); }
      else if (distance < width * 2 + height) { x = width - (distance - width - height); y = 0; }
      else { x = 0; y = distance - width * 2 - height; }
      x += Math.sin(time * .9 + particle.seed * 30) * .6;
      y += Math.cos(time * .7 + particle.seed * 25) * .6;
      const spark = (.5 + .5 * Math.sin(t * 87.9646 - time * .6)) ** 2;
      const size = (2 + particle.size) * (1 + .5 * spark);
      context.globalAlpha = .45 + .4 * spark;
      context.drawImage(sprite, x + 8 - size, y + 8 - size, size * 2, size * 2);
    }
    context.globalAlpha = 1;
  }
  function resize() {
    width = host.clientWidth; height = host.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round((width + 16) * dpr);
    canvas.height = Math.round((height + 16) * dpr);
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (active) draw();
  }
  function tick(now) {
    if (!active || document.hidden || motion.matches) { raf = 0; return; }
    if (now - previous >= 1000 / 30) {
      time += Math.min(.05, (now - previous) / 1000);
      previous = now; draw();
    }
    raf = requestAnimationFrame(tick);
  }
  function resume() {
    cancelAnimationFrame(raf); raf = 0;
    if (!active || document.hidden) return;
    draw(); previous = performance.now();
    if (!motion.matches) raf = requestAnimationFrame(tick);
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  document.addEventListener('visibilitychange', resume);
  motion.addEventListener('change', resume);
  return {
    start() { active = true; resize(); resume(); },
    stop() { active = false; cancelAnimationFrame(raf); raf = 0; },
    dispose() {
      active = false; cancelAnimationFrame(raf); observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      motion.removeEventListener('change', resume); canvas.remove();
    },
  };
}
