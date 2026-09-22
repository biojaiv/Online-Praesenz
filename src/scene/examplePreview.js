import * as THREE from 'three';
import { t, onLanguageChange } from '../i18n.js';

/** One project in the existing hologram; the actual HTML page loads on activation. */
export function createExamplePreview() {
  const canvas = document.createElement('canvas');
  canvas.width = 1258; canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  // Tint the thumbnail separately so its colour wash cannot fill transparent
  // space around the document. Only the preview image needs a readable surface.
  const thumbnail = document.createElement('canvas');
  thumbnail.width = 1094; thumbnail.height = 730;
  const thumbnailContext = thumbnail.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: .85, toneMapped: false, side: THREE.DoubleSide });
  const width = 7.35 * .88, height = width / (1258 / 1920);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.name = 'example-preview'; mesh.userData.key = 'projekte';
  const group = new THREE.Group(); group.add(mesh);
  const picture = new Image(); let disposed = false;
  function draw() {
    if (disposed) return;
    ctx.clearRect(0, 0, 1258, 1920);
    ctx.strokeStyle = '#78bfff55'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 1254, 1916);
    ctx.textAlign = 'left'; ctx.fillStyle = '#e8a45a'; ctx.font = '500 26px "Barlow Condensed", sans-serif';
    ctx.fillText('VL // ' + t('example.label').toUpperCase(), 82, 130);
    ctx.fillStyle = '#d4e8f8'; ctx.font = '500 66px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(t('example.previewTitle'), 629, 270, 1094); ctx.textAlign = 'left';
    if (picture.complete && picture.naturalWidth) {
      thumbnailContext.clearRect(0, 0, 1094, 730);
      thumbnailContext.save(); thumbnailContext.filter = 'grayscale(1)';
      thumbnailContext.drawImage(picture, 0, 0, 1094, 730); thumbnailContext.restore();
      thumbnailContext.save(); thumbnailContext.globalCompositeOperation = 'color';
      thumbnailContext.fillStyle = '#78bfff'; thumbnailContext.fillRect(0, 0, 1094, 730); thumbnailContext.restore();
      thumbnailContext.fillStyle = '#07101d80'; thumbnailContext.fillRect(0, 0, 1094, 730);
      ctx.save(); ctx.globalAlpha = .78;
      ctx.drawImage(thumbnail, 82, 360); ctx.restore();
    }
    ctx.fillStyle = '#a4b4c3'; ctx.font = '400 35px Barlow, sans-serif';
    ctx.fillText(t('example.previewNote'), 82, 1190, 1094);
    ctx.fillStyle = '#e8a45a'; ctx.font = '500 30px "Barlow Condensed", sans-serif';
    ctx.fillText('HTML · CSS · JavaScript · Three.js', 82, 1310, 1094);
    ctx.strokeStyle = '#78bfff55'; ctx.beginPath(); ctx.moveTo(82, 1430); ctx.lineTo(1176, 1430); ctx.stroke();
    ctx.fillStyle = '#a4b4c3'; ctx.font = '400 32px Barlow, sans-serif';
    for (const [i, text] of t('example.previewFacts').split('|').entries()) ctx.fillText(text, 82, 1530 + i * 75, 1094);
    texture.needsUpdate = true;
  }
  picture.onload = draw; picture.src = '/example/preview.webp'; draw();
  document.fonts.ready.then(draw);
  const unsubscribe = onLanguageChange(draw);
  let reveal = 1, target = 1;
  return {
    group, mesh,
    setOrigin(y) { group.position.set(0, y + 1.17 + height / 2, .4); },
    setReveal(value, immediate = false) { target = value; if (immediate) reveal = value; },
    update(_time, delta, hover) {
      reveal += (target - reveal) * (1 - Math.pow(.01, Math.min(delta, .1)));
      material.opacity = (.68 + hover * .14) * reveal;
      group.visible = material.opacity > .01;
    },
    dispose() { disposed = true; picture.onload = null; unsubscribe(); },
  };
}
