import * as THREE from 'three';
import { t, onLanguageChange } from '../i18n.js';
import { PROJECTS } from '../data/projects.js';

/** Project collection in the existing hologram; the actual HTML page loads on activation. */
export function createExamplePreview() {
  const canvas = document.createElement('canvas');
  canvas.width = 1258; canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: .85, toneMapped: false, side: THREE.DoubleSide });
  const width = 7.35 * .88, height = width / (1258 / 1920);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.name = 'example-preview'; mesh.userData.key = 'projekte';
  const group = new THREE.Group(); group.add(mesh);
  const pictures = PROJECTS.map(() => new Image()); let disposed = false;
  function draw() {
    if (disposed) return;
    ctx.clearRect(0, 0, 1258, 1920);
    ctx.fillStyle = '#07101dec'; ctx.fillRect(0, 0, 1258, 1920);
    ctx.strokeStyle = '#78bfff55'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 1254, 1916);
    ctx.textAlign = 'left'; ctx.fillStyle = '#e8a45a'; ctx.font = '500 26px "Barlow Condensed", sans-serif';
    ctx.fillText('VL // ' + t('example.label').toUpperCase(), 82, 130);
    ctx.fillStyle = '#d4e8f8'; ctx.font = '500 62px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(t('projects.collection'), 629, 245, 1094); ctx.textAlign = 'left';
    PROJECTS.forEach((project, i) => {
      const picture = pictures[i], top = 350 + i * 730;
      if (picture.complete && picture.naturalWidth) {
        const ratio = Math.min(1094 / picture.naturalWidth, 565 / picture.naturalHeight);
        const w = picture.naturalWidth * ratio, h = picture.naturalHeight * ratio;
        ctx.save(); ctx.globalAlpha = .64; ctx.filter = 'grayscale(1)';
        ctx.drawImage(picture, 629 - w / 2, top, w, h); ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.fillStyle = '#78bfff'; ctx.fillRect(82, top, 1094, 565); ctx.restore();
        ctx.fillStyle = '#07101d80'; ctx.fillRect(82, top, 1094, 565);
      }
      ctx.fillStyle = '#e8a45a'; ctx.font = '500 36px "Barlow Condensed", sans-serif';
      ctx.fillText(`0${i + 1} / ${t(project.title)}`, 82, top + 625, 1094);
    });
    ctx.fillStyle = '#a4b4c3'; ctx.font = '400 30px Barlow, sans-serif';
    ctx.fillText('HTML · CSS · JavaScript', 82, 1840, 1094);
    texture.needsUpdate = true;
  }
  pictures.forEach((picture, i) => { picture.onload = draw; picture.src = PROJECTS[i].preview; }); draw();
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
    dispose() { disposed = true; pictures.forEach(picture => { picture.onload = null; }); unsubscribe(); },
  };
}
