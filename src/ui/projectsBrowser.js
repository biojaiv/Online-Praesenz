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
    panel.querySelectorAll('.project-preview').forEach(preview => {
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
    // Render the actual entry page at its future viewport, scaled down without
    // recolouring. Inert frames keep the enclosing link as the single control.
    if (route.startsWith('projekte') && !privateProjects) {
      panel.querySelectorAll('.project-preview').forEach(preview => {
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
    resizePreviews();
  }
  function click(event) { const choice = event.target.closest('[data-project-route]'); if (choice) onNavigate(choice.dataset.projectRoute); }
  panel.addEventListener('click', click);
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
        panel.hidden = false; stage?.cards.showProjectPreview(false);
      }
      // Finish the activating pointer/click sequence before placing a link
      // beneath it, including immediate camera moves with reduced motion.
      if (wasOpen) reveal();
      else timer = requestAnimationFrame(reveal);
    },
    setSuspended(value) {
      suspended = Boolean(value);
      if (suspended) { cancelAnimationFrame(timer); panel.hidden = true; }
      else if (route.startsWith('projekte')) panel.hidden = false;
    },
    dispose() { cancelAnimationFrame(timer); previewObserver.disconnect(); window.removeEventListener('resize', resizePreviews); stage?.setExamplePreviewUpdate(null); unsubscribe(); panel.removeEventListener('click', click); panel.remove(); }
  };
}
