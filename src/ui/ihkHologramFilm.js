import { Matrix4, Vector3 } from 'three';
import { getLanguage, onLanguageChange, t } from '../i18n.js';
import { IHK_PAGE, IHK_FILM_RECT as rect, IHK_FILMS, IHK_POSTERS } from '../data/ihkMedia.js';

/** Native video projected into the same plane and scroll window as the hologram.
 * No VideoTexture, extra render loop, media preload or transparency shader.
 */
export function createIhkHologramFilm(canvas) {
  const layer = document.createElement('div');
  layer.className = 'ihk-hologram-film';
  layer.hidden = true;
  const video = document.createElement('video');
  video.className = 'ihk-hologram-film__video';
  video.controls = false;
  video.tabIndex = -1;
  video.playsInline = true;
  video.preload = 'none';
  Object.assign(video.style, { left: `${rect.x}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'ihk-hologram-film__play';
  play.innerHTML = '<span aria-hidden="true">▶</span>';
  Object.assign(play.style, { left: `${rect.x}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  layer.append(video, play);
  canvas.parentElement.append(layer);
  let attached = false;
  let suspended = false;
  let revision = 0;
  const matrix = new Matrix4();
  const centre = new Vector3();
  const normal = new Vector3();
  const towardsCamera = new Vector3();
  const corners = [new Vector3(-.5, .5, 0), new Vector3(.5, .5, 0), new Vector3(-.5, -.5, 0), new Vector3(.5, -.5, 0)];

  function media() {
    release();
    layer.hidden = true;
    play.setAttribute('aria-label', t('ihk.film'));
    video.poster = IHK_POSTERS[getLanguage()];
    video.setAttribute('aria-label', t('ihk.film'));
  }
  function release() {
    revision += 1;
    play.hidden = false;
    video.controls = false;
    video.tabIndex = -1;
    if (!attached) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
    attached = false;
  }
  function activate() {
    play.hidden = true;
    video.controls = true;
    video.tabIndex = 0;
  }
  function start() {
    const ticket = ++revision;
    activate();
    video.focus({ preventScroll: true });
    video.play().catch(() => {
      if (ticket !== revision) return;
      play.hidden = false;
      video.controls = false;
      video.tabIndex = -1;
      play.focus({ preventScroll: true });
    });
  }
  play.addEventListener('click', start);
  function wheel(event) {
    if (document.fullscreenElement) return;
    event.preventDefault();
    canvas.dispatchEvent(new WheelEvent('wheel', {
      deltaX: event.deltaX, deltaY: event.deltaY, deltaMode: event.deltaMode,
      clientX: event.clientX, clientY: event.clientY, ctrlKey: event.ctrlKey,
      metaKey: event.metaKey, shiftKey: event.shiftKey, buttons: event.buttons,
      bubbles: true, cancelable: true,
    }));
  }
  video.addEventListener('play', activate);
  video.addEventListener('pointerdown', activate);
  video.addEventListener('focusin', activate);
  video.addEventListener('wheel', wheel, { passive: false });
  play.addEventListener('wheel', wheel, { passive: false });
  media();
  const unsubscribe = onLanguageChange(media);

  return {
    setHidden(value) {
      suspended = Boolean(value);
      if (suspended) { layer.hidden = true; release(); }
    },
    update(mesh, camera, width, height, enabled) {
      const uniforms = mesh?.material.uniforms;
      const offset = uniforms?.uOffset.value || 0;
      const window = uniforms?.uWindow.value || 1 / IHK_PAGE.count;
      const top = rect.y - offset * IHK_PAGE.height * IHK_PAGE.count;
      const windowHeight = window * IHK_PAGE.height * IHK_PAGE.count;
      const ready = Boolean(enabled && !suspended && mesh?.visible && uniforms.uMap.value
        && uniforms.uOpacity.value > .95 && top < windowHeight && top + rect.height > 0);
      // Hide the native controls when the document is turned away or behind the camera.
      if (ready) {
        mesh.getWorldPosition(centre);
        normal.set(0, 0, 1).transformDirection(mesh.matrixWorld);
        towardsCamera.copy(camera.position).sub(centre);
      }
      const active = ready && normal.dot(towardsCamera) > 0;
      layer.hidden = !active;
      if (!active) { release(); return; }
      if (!attached) {
        attached = true;
        video.src = IHK_FILMS[getLanguage()];
      }
      matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(mesh.matrixWorld);
      const e = matrix.elements;
      if (corners.some(p => e[3] * p.x + e[7] * p.y + e[15] <= 0)) {
        layer.hidden = true;
        release();
        return;
      }
      // CSS coordinates (x,y) map to mesh coordinates (x/W-.5, .5-y/H).
      // Keep homogeneous W: this follows perspective, rotation and camera zoom exactly.
      const W = IHK_PAGE.width, H = windowHeight;
      const w0 = -.5 * e[3] + .5 * e[7] + e[15];
      const x0 = -.5 * e[0] + .5 * e[4] + e[12];
      const y0 = -.5 * e[1] + .5 * e[5] + e[13];
      const values = [
        width / 2 * (e[0] + e[3]) / W, height / 2 * (e[3] - e[1]) / W, 0, e[3] / W,
        -width / 2 * (e[4] + e[7]) / H, height / 2 * (e[5] - e[7]) / H, 0, -e[7] / H,
        0, 0, 1, 0,
        width / 2 * (x0 + w0), height / 2 * (w0 - y0), 0, w0,
      ];
      layer.style.height = `${H}px`;
      layer.style.transform = `matrix3d(${values.join(',')})`;
      video.style.top = `${top}px`;
      play.style.top = `${top}px`;
      // Give native controls their actual on-screen size instead of shrinking
      // desktop controls with the 1258px document on phones.
      const project = (x, y) => {
        const w = values[3] * x + values[7] * y + values[15];
        return [(values[0] * x + values[4] * y + values[12]) / w,
          (values[1] * x + values[5] * y + values[13]) / w];
      };
      const a = project(rect.x, top), b = project(rect.x + rect.width, top);
      const scale = Math.max(.1, Math.min(4, Math.hypot(b[0] - a[0], b[1] - a[1]) / rect.width));
      video.style.width = `${rect.width * scale}px`;
      video.style.height = `${rect.height * scale}px`;
      video.style.transform = `scale(${1 / scale})`;
    },
    dispose() {
      unsubscribe();
      release();
      video.removeEventListener('play', activate);
      video.removeEventListener('pointerdown', activate);
      video.removeEventListener('focusin', activate);
      video.removeEventListener('wheel', wheel);
      play.removeEventListener('click', start);
      play.removeEventListener('wheel', wheel);
      layer.remove();
    },
  };
}
