import { WebGLRenderer, Scene, OrthographicCamera, PlaneGeometry, Mesh, ShaderMaterial, Vector2, Vector4 } from 'three';
import { createRenderBudget } from '../scene/renderBudget.js';

// A shared height field gives adjacent wave crests the same flowing motion.
// Multi-scale waves: NVIDIA GPU Gems, chapter 1. Domain warping: Book of Shaders, chapter 13.
const fragmentShader = `
  uniform vec2 uSize;
  uniform vec4 uBox;
  uniform float uTime;
  uniform float uWavelength;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
      mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float n = .57 * noise(p);
    p = mat2(.8, -.6, .6, .8) * p * 2.03 + 7.1;
    n += .28 * noise(p);
    return n + .15 * noise(p * 2.01 + 13.7);
  }
  float boxDistance(vec2 p, vec2 halfSize) {
    vec2 q = abs(p) - halfSize + 9.0;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 9.0;
  }
  void main() {
    vec2 pixel = vec2(vUv.x, 1.0 - vUv.y) * uSize;
    vec2 center = uBox.xy + uBox.zw * .5;
    float distance = boxDistance(pixel - center, uBox.zw * .5);
    if (distance < -2.0) discard;
    vec2 p = (pixel - center) / 135.0;
    vec2 drift = vec2(uTime * .034, -uTime * .025);
    vec2 warp = vec2(fbm(p + drift), fbm(p + vec2(8.7, 3.2) - drift));
    float flow = fbm(p + 1.5 * warp + drift * .6);
    float envelope = smoothstep(0.0, 45.0, distance);
    float phase = (distance / uWavelength + envelope * (flow - .5) * 10.0
      + uTime * .23) * 6.2831853;
    // Attenuate unresolved frequencies before they can shimmer on small displays.
    float footprint = max(fwidth(phase), .001);
    float primary = sin(phase) * exp(-.12 * footprint * footprint);
    float secondary = sin(phase * 1.73 + p.x * .9 - p.y * .7 - uTime * .17)
      * exp(-.36 * footprint * footprint);
    float detail = sin(phase * 2.31 + flow * 5.0 + uTime * .11)
      * exp(-.64 * footprint * footprint);
    float height = primary * .72 + secondary * .20 + detail * .08;
    float crest = smoothstep(-.8, .85, height);
    vec3 normal = normalize(vec3(-dFdx(height) * 2.2, -dFdy(height) * 2.2, 1.0));
    float light = max(dot(normal, normalize(vec3(-.45, .6, .85))), 0.0);
    vec3 troughColor = vec3(.035, .12, .18);
    vec3 crestColor = mix(vec3(.16, .52, .64), vec3(.48, .70, .86), flow);
    // Occasional warm reflections belong to the same surface, not separate rings.
    crestColor = mix(crestColor, vec3(.71, .48, .25), smoothstep(.60, .82, flow) * .6);
    vec3 color = mix(troughColor, crestColor * (.42 + light * .75), crest);
    color += vec3(.34, .57, .65) * pow(crest, 5.0) * pow(light, 9.0) * .3;
    float edge = smoothstep(0.0, 5.0, distance);
    gl_FragColor = vec4(color, edge * (.40 + crest * .46));
  }
`;

function createField(canvas, budget) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  } catch { return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  const uniforms = { uSize: { value: new Vector2() }, uBox: { value: new Vector4() }, uTime: { value: 0 }, uWavelength: { value: 5 } };
  const material = new ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false, transparent: true,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader,
  });
  const geometry = new PlaneGeometry(2, 2), scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera();
  let previousSize = '';
  return {
    draw(width, height, box, time) {
      const ratio = Math.min(budget.ratio(width, height), width < 600 ? 1 : 1.25);
      const size = `${width}/${height}/${ratio}`;
      if (size !== previousSize) {
        renderer.setPixelRatio(ratio); renderer.setSize(width, height, false); previousSize = size;
      }
      const margin = Math.max(box.left, box.top, width - box.right, height - box.bottom);
      uniforms.uSize.value.set(width, height);
      uniforms.uBox.value.set(box.left, box.top, box.width, box.height);
      uniforms.uWavelength.value = Math.max(4.5, margin / (width < 600 ? 16 : 28));
      uniforms.uTime.value = time;
      renderer.setScissorTest(false); renderer.clear();
      renderer.setScissorTest(true);
      // Rasterize just the four visible margins, leaving the large HTML centre
      // out of the fragment pipeline entirely.
      const rects = [[0, height - box.top, width, box.top], [0, 0, width, height - box.bottom],
        [0, height - box.bottom, box.left, box.height], [box.right, height - box.bottom, width - box.right, box.height]];
      for (const [x, y, w, h] of rects) {
        if (w <= 0 || h <= 0) continue;
        renderer.setScissor(x, y, w, h); renderer.render(scene, camera);
      }
      renderer.setScissorTest(false);
    },
    clear() { renderer.clear(); },
    dispose() { geometry.dispose(); material.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}

// A filled, coherent surface also remains available when WebGL is unavailable.
function createFallback(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(width, height, box, time) {
      const ratio = Math.min(devicePixelRatio, 1);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width, height);
      ctx.rect(box.left, box.top, box.width, box.height); ctx.clip('evenodd');
      ctx.fillStyle = '#091e2d'; ctx.fillRect(0, 0, width, height);
      const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
      const maxDistance = Math.max(box.left, box.top, width - box.right, height - box.bottom) * 1.5;
      const spacing = Math.max(5, maxDistance / 28);
      const rays = Array.from({ length: 161 }, (_, j) => {
        const a = j / 160 * Math.PI * 2, co = Math.cos(a), si = Math.sin(a);
        return { co, si, radius: Math.min(box.width / 2 / Math.max(Math.abs(co), .0001), box.height / 2 / Math.max(Math.abs(si), .0001)),
          flow: Math.sin(a * 3 + time * .12) * 7 + Math.sin(a * 7 - time * .09) * 3 };
      });
      function contour(distance) {
        for (let j = 0; j < rays.length; j++) {
          const ray = rays[j];
          const r = ray.radius + distance + ray.flow * Math.min(distance / 45, 1);
          if (!j) ctx.moveTo(cx + ray.co * r, cy + ray.si * r); else ctx.lineTo(cx + ray.co * r, cy + ray.si * r);
        }
        ctx.closePath();
      }
      for (let d = maxDistance - (time * .23 % 1) * spacing; d > 0; d -= spacing) {
        ctx.beginPath(); contour(d);
        ctx.lineWidth = spacing * .78; ctx.strokeStyle = '#174154'; ctx.stroke();
        ctx.lineWidth = spacing * .38; ctx.strokeStyle = '#2f6579'; ctx.stroke();
      }
      ctx.restore();
    },
    clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); }, dispose() {},
  };
}

export function createWarpTunnel(host, screen) {
  let canvas = document.createElement('canvas');
  // Create lazily: most visitors never open a projection, so need no extra GL context.
  let field = null, animation = 0, running = false, last = null, time = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const budget = createRenderBudget();
  function initialize() {
    field = createField(canvas, budget);
    if (!field) { canvas = document.createElement('canvas'); field = createFallback(canvas); }
    canvas.className = 'warp-tunnel'; canvas.setAttribute('aria-hidden', 'true');
    host.prepend(canvas);
  }
  function draw(now = performance.now()) {
    if (!running || document.hidden) return;
    if (!motion.matches && last !== null && now - last < 1000 / (budget.profile.name === 'low' ? 24 : 30) - 2) { animation = requestAnimationFrame(draw); return; }
    if (!motion.matches && last !== null) budget.sample(now - last);
    if (!motion.matches && last !== null) time += Math.min((now - last) / 1000, .1);
    last = now;
    field.draw(innerWidth, innerHeight, screen.getBoundingClientRect(), time);
    if (!motion.matches) animation = requestAnimationFrame(draw);
  }
  function refresh() { cancelAnimationFrame(animation); last = null; if (running) draw(); }
  window.addEventListener('resize', refresh);
  motion.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  return {
    start() { if (running) return; if (!field) initialize(); running = true; refresh(); },
    stop() {
      running = false; cancelAnimationFrame(animation);
      field?.dispose(); field = null; canvas.remove(); canvas = document.createElement('canvas');
    },
    dispose() {
      this.stop(); window.removeEventListener('resize', refresh); motion.removeEventListener('change', refresh);
      document.removeEventListener('visibilitychange', refresh); field?.dispose(); canvas.remove();
    },
  };
}
