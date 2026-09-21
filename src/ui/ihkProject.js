import { getLanguage, onLanguageChange, t } from '../i18n.js';

const SECTIONS = ['overview', 'server', 'uem', 'clients', 'migration'];
const TECHNOLOGIES = ['VMware vSphere', 'Windows Server 2022', 'Active Directory',
  'Microsoft SQL Server', 'baramundi Management Suite', 'DIP / baraDIP', 'PXE',
  'TFTP', 'WinPE', 'Windows ADK', 'DISM', 'bDeploy', 'TLS', 'VLAN', 'DHCP'];
const FILMS = { de: '/ihk/IHK_Projektfilm_DE.mp4', en: '/ihk/IHK_Project_Film_EN.mp4' };
const POSTERS = { de: '/ihk/IHK_Poster_DE.webp', en: '/ihk/IHK_Poster_EN.webp' };
const escapeHTML = (value) => String(value).replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const copy = (key) => escapeHTML(t(`ihk.${key}`));

/** A native HTML reading layer inside the existing stage and hash router. */
export function createIhkProject({ container, onNavigate }) {
  const overlay = document.createElement('section');
  overlay.className = 'ihk-project';
  overlay.hidden = true;
  overlay.setAttribute('aria-labelledby', 'ihk-title');
  container.append(overlay);
  const frame = container.closest('.frame');
  let section = 'overview';
  let returnFocus = null;

  function releaseVideo() {
    const video = overlay.querySelector('video');
    if (!video) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
  }

  function overview() {
    return `
      <div class="ihk-summary">
        <div><p class="ihk-lead">${copy('description')}</p><p>${copy('implementation')}</p></div>
        <dl class="ihk-metrics">
          ${[['40 h', 'time'], ['4', 'clientsMetric'], ['100 %', 'success'], ['Windows 11', 'deployment']]
            .map(([value, label]) => `<div><dt>${value}</dt><dd>${copy(label)}</dd></div>`).join('')}
        </dl>
      </div>
      <p class="ihk-result">${copy('result')}</p>
      <section class="ihk-tech" aria-labelledby="ihk-tech-title">
        <h3 id="ihk-tech-title">${copy('technologies')}</h3>
        <ul>${TECHNOLOGIES.map((name) => `<li>${name}</li>`).join('')}</ul>
      </section>
      <div class="ihk-media">
        <section aria-labelledby="ihk-film-title">
          <h3 id="ihk-film-title">${copy('film')}</h3>
          <video controls playsinline preload="none" poster="${POSTERS[getLanguage()]}"
            src="${FILMS[getLanguage()]}" aria-labelledby="ihk-film-title" aria-describedby="ihk-film-caption">
            <a href="${FILMS[getLanguage()]}" download>${copy('filmFallback')}</a>
          </video>
          <p class="ihk-note" id="ihk-film-caption">${copy('filmCaption')}</p>
        </section>
        <section class="ihk-downloads" aria-labelledby="ihk-download-title">
          <h3 id="ihk-download-title">${copy('downloads')}</h3>
          <p>${copy('downloadIntro')}</p>
          <a href="/ihk/IHK_Projektarbeit_DE.pdf" download lang="de">${copy('downloadDE')}<span aria-hidden="true">↓</span></a>
          <a href="/ihk/IHK_Project_Report_EN.pdf" download lang="en">${copy('downloadEN')}<span aria-hidden="true">↓</span></a>
        </section>
      </div>`;
  }

  function details() {
    return `<p class="ihk-lead">${copy(`${section}.lead`)}</p>
      <div class="ihk-details">${['a', 'b', 'c'].map((part, i) => `
        <section><span class="ihk-step" aria-hidden="true">0${i + 1}</span>
          <h3>${copy(`${section}.${part}.title`)}</h3>
          <p>${copy(`${section}.${part}.text`)}</p></section>`).join('')}</div>
      <a class="ihk-return" href="#abschluss" data-ihk-route="abschluss">← ${copy('overview')}</a>`;
  }

  function render({ focus = false, preserveScroll = false } = {}) {
    const scroll = preserveScroll ? overlay.querySelector('.ihk-body')?.scrollTop || 0 : 0;
    const focusedRoute = overlay.contains(document.activeElement)
      ? document.activeElement.dataset.ihkRoute : null;
    releaseVideo();
    overlay.innerHTML = `
      <article class="ihk-panel">
        <header class="ihk-toolbar"><p>${copy('kicker')}</p>
          <button type="button" class="ihk-close" data-ihk-route="home" aria-label="${copy('close')}">×</button>
        </header>
        <nav class="ihk-nav" aria-label="${copy('nav')}">
          ${SECTIONS.map((key) => `<a href="#abschluss${key === 'overview' ? '' : `/${key}`}"
            data-ihk-route="abschluss${key === 'overview' ? '' : `/${key}`}"
            ${section === key ? 'aria-current="page"' : ''}>${copy(key)}</a>`).join('')}
        </nav>
        <div class="ihk-body" tabindex="0" role="region" aria-label="${copy('content')}">
          <div class="ihk-heading"><span class="ihk-scope">${copy('scope')}</span>
            <h2 id="ihk-title" tabindex="-1">${copy(section === 'overview' ? 'title' : `${section}.title`)}</h2>
            ${section === 'overview' ? `<p class="ihk-subtitle">${copy('subtitle')}</p>` : ''}
          </div>
          ${section === 'overview' ? overview() : details()}
        </div>
      </article>`;
    overlay.querySelector('.ihk-body').scrollTop = scroll;
    if (focus) overlay.querySelector('#ihk-title').focus({ preventScroll: true });
    else if (focusedRoute) {
      [...overlay.querySelectorAll('[data-ihk-route]')]
        .find((el) => el.dataset.ihkRoute === focusedRoute)?.focus({ preventScroll: true });
    }
  }

  function navigate(event) {
    const control = event.target.closest('[data-ihk-route]');
    if (!control || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(control.dataset.ihkRoute);
  }
  overlay.addEventListener('click', navigate);
  const unsubscribe = onLanguageChange(() => {
    if (!overlay.hidden) render({ preserveScroll: true });
  });

  return {
    setRoute(route) {
      const [root, child] = route.split('/');
      const visible = root === 'abschluss';
      frame?.classList.toggle('is-ihk-open', visible);
      const wasVisible = !overlay.hidden;
      if (!visible) {
        const restore = overlay.contains(document.activeElement);
        releaseVideo();
        overlay.hidden = true;
        overlay.replaceChildren();
        if (restore && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
        return;
      }
      if (!wasVisible) returnFocus = document.activeElement instanceof HTMLElement
        && document.activeElement !== document.body ? document.activeElement
          : document.querySelector('.nav__link[data-target="abschluss"]');
      const next = SECTIONS.includes(child) ? child : 'overview';
      if (wasVisible && next === section) return;
      section = next;
      overlay.hidden = false;
      render({ focus: true });
    },
    dispose() {
      unsubscribe();
      releaseVideo();
      overlay.removeEventListener('click', navigate);
      overlay.remove();
      frame?.classList.remove('is-ihk-open');
    },
  };
}
