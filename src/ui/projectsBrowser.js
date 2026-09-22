import { t, getLanguage, onLanguageChange } from '../i18n.js';
import { PROJECTS } from '../data/projects.js';

/** Accessible project choices in the same hologram chrome as the readers. */
export function createProjectsBrowser({ container, stage, onNavigate }) {
  const panel = document.createElement('section');
  panel.className = 'projects-browser'; panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'projects-title');
  container.append(panel);
  let route = 'home', timer = 0;
  let previousRect = '';
  stage?.setExamplePreviewUpdate(({ left, top, width, height }) => {
    const values = [left + width / 2, top + height / 2, width, height].map(value => `${value.toFixed(2)}px`);
    const nextRect = values.join(' ');
    if (nextRect === previousRect) return;
    previousRect = nextRect;
    ['x', 'y', 'width', 'height'].forEach((key, index) => panel.style.setProperty(`--projects-${key}`, values[index]));
  });
  function render() {
    const privateProjects = route.endsWith('/privat');
    panel.innerHTML = `<article class="cv-hologram projects-panel">
      <header class="cv-hologram__header"><span>VL // 02</span><h2 id="projects-title">${t('example.label')}</h2></header>
      <nav class="cv-nav" aria-label="${t('example.projects')}">
        <button type="button" data-project-route="projekte/webseiten" aria-pressed="${!privateProjects}">${t('projects.websites')}</button>
        <button type="button" data-project-route="projekte/privat" aria-pressed="${privateProjects}">${t('projects.private')}</button>
      </nav><div class="cv-hologram__body" tabindex="0">
      ${privateProjects ? `<div class="projects-soon"><span aria-hidden="true">◇</span><h3>${t('projects.private')}</h3><p>${t('projects.soon')}</p></div>` : `<p class="projects-caption">${t('projects.collection')}</p>${PROJECTS.map(project=>`<div class="project-entry"><a href="${project.entry(getLanguage())}" class="project-choice example-fallback" data-project-id="${project.id}" data-example-open>
        <img src="${project.preview}" alt="" width="1200" height="800" loading="lazy" />
        <h3>${t(project.title)} <span aria-hidden="true">↗</span></h3><p>${t(project.note)}</p>
      </a>${project.separate ? `<a class="project-direct" href="${project.entry(getLanguage())}">${t('projects.direct')}</a>` : ''}</div>`).join('')}<p class="projects-caption">HTML · CSS · JavaScript</p>`}
      </div></article>`;
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
        if (stage?.isMoving && !wasOpen) { timer = requestAnimationFrame(reveal); return; }
        panel.hidden = false; stage?.cards.showProjectPreview(false);
      }
      // Finish the activating pointer/click sequence before placing a link
      // beneath it, including immediate camera moves with reduced motion.
      if (wasOpen) reveal();
      else timer = requestAnimationFrame(reveal);
    },
    dispose() { cancelAnimationFrame(timer); stage?.setExamplePreviewUpdate(null); unsubscribe(); panel.removeEventListener('click', click); panel.remove(); }
  };
}
