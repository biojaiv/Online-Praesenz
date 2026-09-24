import { t, getLanguage, onLanguageChange } from '../i18n.js';
import { PROJECTS, getProjectUrl } from '../data/projects.js';
import { getProjectionViewport } from './projectionViewport.js';

/** Accessible project choices in the same hologram chrome as the readers. */
export function createProjectsBrowser({ container, stage, onNavigate }) {
  const panel = document.createElement('section');
  panel.className = 'projects-browser'; panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'projects-title');
  container.append(panel);
  let route = 'home', timer = 0, suspended = false;
  let previousRect = '';
  function resizePreviews() {
    const view = getProjectionViewport();
    panel.querySelectorAll('.project-preview[data-project-preview]').forEach(preview => {
      const project = PROJECTS.find(item => item.id === preview.dataset.projectPreview);
      preview.style.aspectRatio = `${view.width} / ${view.height}`;
      const image = preview.querySelector('img');
      const source = project.preview(getLanguage(), view.width <= 580);
      if (image.getAttribute('src') !== source) image.src = source;
      const iframe = preview.querySelector('iframe');
      if (iframe) Object.assign(iframe.style, { width: `${view.width}px`, height: `${view.height}px`,
        transform: `scale(${preview.getBoundingClientRect().width / view.width})` });
    });
  }
  const previewObserver = new ResizeObserver(resizePreviews);
  window.addEventListener('resize', resizePreviews);
  stage?.setExamplePreviewUpdate(({ left, top, width, height }) => {
    const values = [left + width / 2, top + height / 2, width, height].map(value => `${value.toFixed(2)}px`);
    const nextRect = values.join(' ');
    if (nextRect === previousRect) return;
    previousRect = nextRect;
    ['x', 'y', 'width', 'height'].forEach((key, index) => panel.style.setProperty(`--projects-${key}`, values[index]));
  });
  function render() {
    previewObserver.disconnect();
    const privateProjects = route.endsWith('/privat');
    stage?.setProjectPreviewHover(false);
    if (stage && !privateProjects) {
      const project = PROJECTS[0];
      // Keep the original 3D document visible. This overlay supplies only
      // accessible semantics and a hit area over its existing thumbnail.
      panel.innerHTML = `<article class="projects-panel projects-panel--spatial">
        <div class="project-accessible"><h2 id="projects-title">${t('example.previewTitle')}</h2>
          <p>${t('example.previewNote')}</p><p>HTML · CSS · JavaScript · Three.js</p>
          <ul>${t('example.previewFacts').split('|').map(text => `<li>${text}</li>`).join('')}</ul></div>
        <a href="${getProjectUrl(project, getLanguage())}" class="project-choice" data-project-id="${project.id}" data-example-open aria-label="${t(project.title)}">
          <span class="project-preview" aria-hidden="true"></span>
        </a></article>`;
      const choice = panel.querySelector('.project-choice');
      const hover = () => stage.setProjectPreviewHover(choice.matches(':hover, :focus-visible'));
      for (const event of ['pointerenter', 'pointerleave', 'focus', 'blur']) choice.addEventListener(event, hover);
      return;
    }
    panel.innerHTML = `<article class="cv-hologram projects-panel">
      <header class="cv-hologram__header"><span>VL // 02</span><h2 id="projects-title">${t('example.label')}</h2></header>
      <nav class="cv-nav" aria-label="${t('example.projects')}">
        <button type="button" data-project-route="projekte/webseiten" aria-pressed="${!privateProjects}">${t('projects.websites')}</button>
        <button type="button" data-project-route="projekte/privat" aria-pressed="${privateProjects}">${t('projects.private')}</button>
      </nav><div class="cv-hologram__body" tabindex="0">
      ${privateProjects ? `<div class="projects-soon"><span aria-hidden="true">◇</span><h3>${t('projects.private')}</h3><p>${t('projects.soon')}</p></div>` : `<p class="projects-caption">${t('projects.collection')}</p>${PROJECTS.map(project=>`<div class="project-entry"><a href="${getProjectUrl(project, getLanguage())}" class="project-choice example-fallback" data-project-id="${project.id}" data-example-open>
        <span class="project-preview" data-project-preview="${project.id}"><img src="${project.preview(getLanguage(), getProjectionViewport().width <= 580)}" alt="" loading="lazy" /></span>
        <h3>${t(project.title)} <span aria-hidden="true">↗</span></h3><p>${t(project.note)}</p>
      </a>${project.separate ? `<a class="project-direct" href="${project.entry(getLanguage())}">${t('projects.direct')}</a>` : ''}</div>`).join('')}<p class="projects-caption">HTML · CSS · JavaScript</p>`}
      </div></article>`;
    mountPreviews();
    resizePreviews();
  }
  function mountPreviews() {
    // Keep live documents only while their gallery is actually visible.
    if (!panel.hidden && !suspended && route.startsWith('projekte') && !route.endsWith('/privat')) {
      panel.querySelectorAll('.project-preview[data-project-preview]').forEach(preview => {
        if (preview.querySelector('iframe')) return;
        const project = PROJECTS.find(item => item.id === preview.dataset.projectPreview);
        const iframe = document.createElement('iframe');
        iframe.src = getProjectUrl(project, getLanguage(), true);
        iframe.title = t(project.title); iframe.inert = true; iframe.tabIndex = -1;
        iframe.setAttribute('aria-hidden', 'true');
        iframe.addEventListener('load', async () => {
          try {
            await iframe.contentDocument.fonts.ready;
            await Promise.all([...iframe.contentDocument.images].map(image => image.decode().catch(() => {})));
            if (iframe.isConnected) iframe.classList.add('is-ready');
          } catch { /* The matching screenshot remains visible if loading fails. */ }
        });
        preview.append(iframe); previewObserver.observe(preview);
      });
    }
  }
  function click(event) { const choice = event.target.closest('[data-project-route]'); if (choice) onNavigate(choice.dataset.projectRoute); }
  panel.addEventListener('click', click);
  function wheel(event) {
    if (!stage || route.endsWith('/privat') || suspended) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? innerHeight : 1;
    stage.zoomProjectPreview(event.deltaY * unit / innerHeight);
  }
  const touches = new Map(); let pinchDistance = 0, pinched = false;
  panel.addEventListener('pointerdown', event => {
    if (!touches.size) pinched = false;
    if (!stage || route.endsWith('/privat') || event.pointerType !== 'touch') return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size === 2) { pinchDistance = distance(); pinched = true; }
    event.target.setPointerCapture(event.pointerId);
  });
  const distance = () => { const [a, b] = [...touches.values()]; return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)); };
  panel.addEventListener('pointermove', event => {
    if (!touches.has(event.pointerId)) return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size !== 2) return;
    const next = distance(); stage.zoomProjectPreview(Math.log(pinchDistance / next)); pinchDistance = next;
  });
  for (const event of ['pointerup', 'pointercancel']) panel.addEventListener(event, e => touches.delete(e.pointerId));
  panel.addEventListener('click', event => { if (pinched && event.detail > 0) { event.preventDefault(); event.stopPropagation(); pinched = false; } }, true);
  panel.addEventListener('wheel', wheel, { passive: false });
  const unsubscribe = onLanguageChange(render);
  return {
    setRoute(next) {
      const wasOpen = route.startsWith('projekte'); route = next;
      cancelAnimationFrame(timer); render();
      if (!route.startsWith('projekte')) { panel.hidden = true; stage?.cards.showProjectPreview(true); return; }
      // Wait for the real camera tween, including slow rendering devices.
      function reveal() {
        if (suspended) { panel.hidden = true; return; }
        if (stage?.isMoving && !wasOpen) { timer = requestAnimationFrame(reveal); return; }
        panel.hidden = false; mountPreviews(); resizePreviews(); stage?.cards.showProjectPreview(!route.endsWith('/privat'));
      }
      // Finish the activating pointer/click sequence before placing a link
      // beneath it, including immediate camera moves with reduced motion.
      if (wasOpen) reveal();
      else timer = requestAnimationFrame(reveal);
    },
    setSuspended(value) {
      suspended = Boolean(value);
      if (suspended) {
        touches.clear(); pinched = false;
        cancelAnimationFrame(timer); panel.hidden = true; previewObserver.disconnect(); stage?.setProjectPreviewHover(false);
        panel.querySelectorAll('.project-preview iframe').forEach(iframe => iframe.remove());
      } else if (route.startsWith('projekte')) {
        panel.hidden = false; mountPreviews(); resizePreviews();
      }
    },
    dispose() { cancelAnimationFrame(timer); previewObserver.disconnect(); window.removeEventListener('resize', resizePreviews); stage?.setExamplePreviewUpdate(null); unsubscribe(); panel.removeEventListener('click', click); panel.remove(); }
  };
}
