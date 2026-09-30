/**
 * Inner portal rim drawn above the page: a neon edge along the rounded aperture,
 * a slowly turning energy band in the margin and sparks travelling round the
 * edge in the project's colour. The page rectangle itself is never painted over.
 */
export function createPortalRim(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'portal-rim';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const context = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const PAD = 14; // canvas reaches a little beyond the aperture for the outer glow
  let active = false, raf = 0, previous = 0, time = 0, reveal = 1, revealStart = 0;
  let width = 0, height = 0, radius = 0, inset = 0, accent = '#7fd8ff';

  function rounded(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function perimeter() {
    return 2 * (width + height) - (8 - 2 * Math.PI) * Math.min(radius, width / 2, height / 2);
  }
  function draw() {
    if (!context || !width) return;
    const ctx = context;
    ctx.clearRect(0, 0, width + PAD * 2, height + PAD * 2);
    ctx.save();
    ctx.translate(PAD, PAD);
    // Never paint over the page: clip away the inset content rectangle.
    ctx.beginPath();
    ctx.rect(-PAD, -PAD, width + PAD * 2, height + PAD * 2);
    rounded(ctx, inset, inset, width - inset * 2, height - inset * 2, 6);
    ctx.clip('evenodd');

    const length = perimeter();
    const drawn = length * reveal;
    const dash = reveal < 1 ? [drawn, length] : [];

    // Energy band: a turning conic sheen between the rim and the page.
    ctx.save();
    ctx.beginPath(); rounded(ctx, 0, 0, width, height, radius); ctx.clip();
    const band = ctx.createConicGradient?.(time * .35, width / 2, height / 2);
    if (band) {
      band.addColorStop(0, 'rgba(40, 120, 200, .10)');
      band.addColorStop(.18, 'rgba(120, 215, 255, .38)');
      band.addColorStop(.32, 'rgba(40, 120, 200, .08)');
      band.addColorStop(.62, 'rgba(90, 190, 255, .30)');
      band.addColorStop(.78, 'rgba(30, 90, 170, .08)');
      band.addColorStop(1, 'rgba(40, 120, 200, .10)');
      ctx.globalAlpha = reveal;
      ctx.strokeStyle = band;
      ctx.lineWidth = inset * 2;
      ctx.beginPath(); rounded(ctx, 0, 0, width, height, radius); ctx.stroke();
    }
    ctx.restore();

    // Neon edge: wide soft halo, then a bright core line.
    ctx.lineCap = 'round';
    ctx.setLineDash(dash);
    ctx.shadowColor = '#4fb8ff';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = 'rgba(90, 190, 255, .35)';
    ctx.lineWidth = 7;
    ctx.beginPath(); rounded(ctx, 1.5, 1.5, width - 3, height - 3, radius - 1.5); ctx.stroke();
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(200, 240, 255, .95)';
    ctx.lineWidth = 2;
    ctx.beginPath(); rounded(ctx, 1.5, 1.5, width - 3, height - 3, radius - 1.5); ctx.stroke();

    // Sparks in the project colour travel round the rim.
    if (reveal >= 1) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const size = length * (.05 + .02 * i);
        ctx.setLineDash([size, length - size]);
        ctx.lineDashOffset = -((time * (70 + 25 * i) + length * i / 3) % length);
        ctx.beginPath(); rounded(ctx, 1.5, 1.5, width - 3, height - 3, radius - 1.5); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function resize() {
    width = host.clientWidth; height = host.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round((width + PAD * 2) * dpr);
    canvas.height = Math.round((height + PAD * 2) * dpr);
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (active) draw();
  }
  function tick(now) {
    if (!active || document.hidden) { raf = 0; return; }
    if (now - previous >= 1000 / 30) {
      time += Math.min(.05, (now - previous) / 1000);
      previous = now;
      if (reveal < 1) reveal = Math.min(1, (now - revealStart) / 700);
      draw();
    }
    if (motion.matches && reveal >= 1) { raf = 0; return; } // still rim without motion
    raf = requestAnimationFrame(tick);
  }
  function resume() {
    cancelAnimationFrame(raf); raf = 0;
    if (!active || document.hidden) return;
    draw(); previous = performance.now();
    raf = requestAnimationFrame(tick);
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  document.addEventListener('visibilitychange', resume);
  motion.addEventListener('change', resume);
  return {
    /** Draw the rim in (the edge traces itself round), then keep it alive. */
    start(options = {}) {
      accent = options.accent || accent;
      radius = options.radius || 0;
      inset = options.inset || 0;
      active = true; time = 0;
      reveal = motion.matches ? 1 : 0; revealStart = performance.now();
      resize(); resume();
    },
    setGeometry({ radius: nextRadius, inset: nextInset }) { radius = nextRadius; inset = nextInset; resize(); },
    stop() { active = false; cancelAnimationFrame(raf); raf = 0; context?.clearRect(0, 0, canvas.width, canvas.height); },
    dispose() {
      active = false; cancelAnimationFrame(raf); observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      motion.removeEventListener('change', resume); canvas.remove();
    },
  };
}
