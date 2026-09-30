import * as THREE from 'three';
import { RUNES, PRIMARY, SECONDARY } from './runes.js';
import { SACRED_FIGURES } from './sacredGeometry.js';

/**
 * Engraved bezel for the open portal frame. One tile holds a sacred-geometry
 * medallion followed by a line of runes between two inscription lines; it repeats
 * along a ribbon that follows the frame's rounded rectangle. Grooves are cut into
 * a bump map and glow faintly through the emissive map in the project colour.
 */
const TILE_W = 2048, TILE_H = 256;
const TAU = Math.PI * 2;

function strokeFigure(ctx, strokes, cx, cy, size) {
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of strokes) {
    ctx.moveTo(cx + x1 * size, cy - y1 * size);
    ctx.lineTo(cx + x2 * size, cy - y2 * size);
  }
  ctx.stroke();
}

/** Draw the engraving pattern (white grooves on black) for one tile. */
function drawPattern(ctx, figure) {
  const mid = TILE_H / 2;
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Inscription lines along both edges, with fine tick marks like a scale ring.
  ctx.lineWidth = 5;
  for (const y of [22, TILE_H - 22]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TILE_W, y); ctx.stroke(); }
  ctx.lineWidth = 2.5;
  for (const y of [38, TILE_H - 38]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TILE_W, y); ctx.stroke(); }
  for (let x = 8; x < TILE_W; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 22); ctx.lineTo(x, 32); ctx.moveTo(x, TILE_H - 22); ctx.lineTo(x, TILE_H - 32); ctx.stroke();
  }
  // Medallion: a sacred figure inside a double ring.
  const mx = 170, radius = 78;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(mx, mid, radius, 0, TAU); ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(mx, mid, radius - 10, 0, TAU); ctx.stroke();
  ctx.lineWidth = 3;
  strokeFigure(ctx, figure.strokes, mx, mid, radius - 18);
  // Rune line with small lozenge separators.
  const names = [...PRIMARY, ...SECONDARY.filter(name => RUNES[name])].slice(0, 9);
  const start = mx + radius + 70, step = (TILE_W - start - 40) / names.length;
  ctx.lineWidth = 5.5;
  names.forEach((name, index) => {
    const x = start + step * index + step / 2;
    strokeFigure(ctx, RUNES[name].strokes, x, mid, 48);
    const sx = x + step / 2;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(sx, mid - 12); ctx.lineTo(sx + 8, mid); ctx.lineTo(sx, mid + 12); ctx.lineTo(sx - 8, mid); ctx.closePath(); ctx.stroke();
    ctx.lineWidth = 5.5;
  });
}

function canvas() {
  const element = document.createElement('canvas');
  element.width = TILE_W; element.height = TILE_H;
  return element;
}

let shared = null;
/** Textures are shared by all portals: colour (brushed metal), bump and glow. */
export function engravingTextures() {
  if (shared) return shared;
  const figures = SACRED_FIGURES.filter(figure => ['Flower of Life', 'Metatrons Cube', 'Seed of Life'].includes(figure.name));
  const pattern = canvas(), patternCtx = pattern.getContext('2d');
  patternCtx.fillStyle = '#000'; patternCtx.fillRect(0, 0, TILE_W, TILE_H);
  drawPattern(patternCtx, figures[0] || SACRED_FIGURES[0]);

  // Brushed metal: fine streaks along the band, darker in the cut grooves.
  const colour = canvas(), colourCtx = colour.getContext('2d');
  colourCtx.fillStyle = '#b8b8b8'; colourCtx.fillRect(0, 0, TILE_W, TILE_H);
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {
    const y = random() * TILE_H, shade = 150 + random() * 90;
    colourCtx.strokeStyle = `rgba(${shade},${shade},${shade},.35)`;
    colourCtx.lineWidth = .6 + random();
    colourCtx.beginPath(); colourCtx.moveTo(random() * TILE_W, y); colourCtx.lineTo(random() * TILE_W, y); colourCtx.stroke();
  }
  // Cut grooves read darker than the brushed surface.
  colourCtx.globalCompositeOperation = 'multiply';
  colourCtx.globalAlpha = .6;
  colourCtx.filter = 'invert(1)';
  colourCtx.drawImage(pattern, 0, 0);
  colourCtx.filter = 'none';
  colourCtx.globalAlpha = 1;
  colourCtx.globalCompositeOperation = 'source-over';

  // Bump: grooves are low; a slight blur gives them a bevelled wall.
  const bump = canvas(), bumpCtx = bump.getContext('2d');
  bumpCtx.fillStyle = '#fff'; bumpCtx.fillRect(0, 0, TILE_W, TILE_H);
  bumpCtx.filter = 'invert(1) blur(1.5px)';
  bumpCtx.drawImage(pattern, 0, 0);
  bumpCtx.filter = 'none';

  const texture = (source, srgb = false) => {
    const tex = new THREE.CanvasTexture(source);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 4;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  shared = { map: texture(colour, true), bumpMap: texture(bump), emissiveMap: texture(pattern, true), aspect: TILE_W / TILE_H };
  return shared;
}

/**
 * Ribbon around a rounded rectangle (corner centres ±cx, ±cy) between radii
 * r0 and r1, in the frame's XY plane at depth z. `u` follows the arc length in
 * tiles of `tileLength`, `v` runs across the band.
 */
export function bezelGeometry({ cx, cy, r0, r1, z = 0, tileLength = 1, arcSegments = 18, flip = false }) {
  const points = [];
  const corners = [[cx, cy, 0], [-cx, cy, Math.PI / 2], [-cx, -cy, Math.PI], [cx, -cy, Math.PI * 1.5]];
  for (const [x, y, start] of corners) {
    for (let i = 0; i <= arcSegments; i++) {
      const a = start + (Math.PI / 2) * (i / arcSegments);
      points.push([x, y, Math.cos(a), Math.sin(a)]);
    }
  }
  points.push(points[0]);
  const positions = [], uvs = [], index = [];
  let travelled = 0, previous = null;
  const mid = (r0 + r1) / 2;
  points.forEach(([x, y, nx, ny], i) => {
    const px = x + nx * mid, py = y + ny * mid;
    if (previous) travelled += Math.hypot(px - previous[0], py - previous[1]);
    previous = [px, py];
    const u = travelled / tileLength;
    positions.push(x + nx * r0, y + ny * r0, z, x + nx * r1, y + ny * r1, z);
    uvs.push(u, flip ? 1 : 0, u, flip ? 0 : 1);
    if (i > 0) {
      const a = (i - 1) * 2, b = i * 2;
      index.push(a, a + 1, b + 1, a, b + 1, b);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(positions.length / 3).fill([0, 0, 1]).flat(), 3));
  geometry.setIndex(index);
  return geometry;
}
