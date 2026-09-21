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
        <div><p class="ihk-lead cv-lead">${copy('description')}</p><p>${copy('implementation')}</p></div>
        <dl class="ihk-metrics cv-facts">
          ${[['40 h', 'time'], ['4', 'clientsMetric'], ['100 %', 'success'], ['Windows 11', 'deployment']]
            .map(([value, label]) => `<div><dt>${value}</dt><dd>${copy(label)}</dd></div>`).join('')}
        </dl>
      </div>
      <p class="ihk-result cv-focus">${copy('result')}</p>
      <section class="ihk-tech" aria-labelledby="ihk-tech-title">
        <h3 id="ihk-tech-title">${copy('technologies')}</h3>
        <p class="cv-signature__tools">${TECHNOLOGIES.map((name) => `<span>${name}</span>`).join('<i aria-hidden="true">·</i>')}</p>
      </section>
      <div class="ihk-media">
        <section id="ihk-film" aria-labelledby="ihk-film-title">
          <h3 id="ihk-film-title">${copy('film')}</h3>
          <video controls playsinline preload="none" poster="${POSTERS[getLanguage()]}"
            src="${FILMS[getLanguage()]}" aria-labelledby="ihk-film-title" aria-describedby="ihk-film-caption">
            <a href="${FILMS[getLanguage()]}" download>${copy('filmFallback')}</a>
          </video>
          <p class="ihk-note" id="ihk-film-caption">${copy('filmCaption')}</p>
        </section>
        <section id="ihk-downloads" class="ihk-downloads" aria-labelledby="ihk-download-title">
          <h3 id="ihk-download-title">${copy('downloads')}</h3>
          <p>${copy('downloadIntro')}</p>
          <a class="cv-primary-action" href="/ihk/IHK_Projektarbeit_DE.pdf" download lang="de">${copy('downloadDE')}<span aria-hidden="true">↓</span></a>
          <a class="cv-primary-action" href="/ihk/IHK_Project_Report_EN.pdf" download lang="en">${copy('downloadEN')}<span aria-hidden="true">↓</span></a>
        </section>
      </div>`;
  }

  function details() {
    return `<p class="ihk-lead cv-lead">${copy(`${section}.lead`)}</p>
      <ol class="ihk-details cv-timeline cv-timeline--work">${['a', 'b', 'c'].map((part, i) => `
        <li><span class="ihk-step" aria-hidden="true">0${i + 1}</span><div>
          <h3>${copy(`${section}.${part}.title`)}</h3>
          <p>${copy(`${section}.${part}.text`)}</p></div></li>`).join('')}</ol>
      <a class="ihk-return cv-primary-action" href="#abschluss" data-ihk-route="abschluss">← ${copy('overview')}</a>`;
  }

  function render({ focus = false, preserveScroll = false } = {}) {
    const scroll = preserveScroll ? overlay.querySelector('.ihk-body')?.scrollTop || 0 : 0;
    const focusedRoute = overlay.contains(document.activeElement)
      ? document.activeElement.dataset.ihkRoute : null;
    releaseVideo();
    overlay.innerHTML = `
      <article class="ihk-panel cv-hologram">
        <header class="ihk-toolbar cv-hologram__header">
          <button type="button" class="ihk-close cv-back" data-ihk-route="home" aria-label="${copy('close')}">←</button>
          <div><span>${escapeHTML(t('route.finalProject'))}</span><small>${copy('kicker')}</small></div>
          <span class="cv-status">PoC</span>
        </header>
        <nav class="ihk-nav cv-nav" aria-label="${copy('nav')}">
          ${SECTIONS.map((key) => `<button type="button"
            data-ihk-route="abschluss${key === 'overview' ? '' : `/${key}`}"
            ${section === key ? 'class="is-active" aria-current="page"' : ''}>${copy(key)}</button>`).join('')}
        </nav>
        <div class="ihk-body cv-hologram__body" tabindex="0" role="region" aria-label="${copy('content')}">
          <section class="cv-section" aria-labelledby="ihk-title">
            <div class="ihk-heading cv-id">
              <div class="cv-id__meta"><p class="cv-kicker">${copy('scope')}</p>
                <h2 id="ihk-title" tabindex="-1">${copy(section === 'overview' ? 'title' : `${section}.title`)}</h2>
              </div>
              ${section === 'overview' ? '<span class="cv-id__stamp" aria-hidden="true">VL<br><small>IHK // 01</small></span>' : ''}
            </div>
            ${section === 'overview' ? `<p class="ihk-subtitle cv-lead">${copy('subtitle')}</p>` : ''}
            ${section === 'overview' ? overview() : details()}
          </section>
        </div>
        <footer class="cv-hologram__footer"><span>VL // IHK · 2026</span>
          <div class="cv-hologram__actions">
            <button type="button" class="cv-action is-docked" data-ihk-scroll="ihk-film">${copy('filmAction')}</button>
            <button type="button" class="cv-action is-docked" data-ihk-scroll="ihk-downloads">${copy('downloads')}</button>
          </div>
        </footer>
      </article>`;
    overlay.querySelector('.ihk-body').scrollTop = scroll;
    if (focus) overlay.querySelector('#ihk-title').focus({ preventScroll: true });
    else if (focusedRoute) {
      [...overlay.querySelectorAll('[data-ihk-route]')]
        .find((el) => el.dataset.ihkRoute === focusedRoute)?.focus({ preventScroll: true });
    }
  }

  function navigate(event) {
    const jump = event.target.closest('[data-ihk-scroll]');
    if (jump) {
      if (section !== 'overview') onNavigate('abschluss');
      const target = overlay.querySelector(`#${jump.dataset.ihkScroll}`);
      const body = overlay.querySelector('.ihk-body');
      body.scrollTo({ top: target.offsetTop - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      target.querySelector('video, a')?.focus({ preventScroll: true });
      return;
    }
    const control = event.target.closest('[data-ihk-route]');
    if (!control || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(control.dataset.ihkRoute);
  }
  overlay.addEventListener('click', navigate);
  function navigateByKey(event) {
    if (!event.target.closest('.ihk-nav') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...overlay.querySelectorAll('.ihk-nav button')];
    const current = Math.max(0, tabs.indexOf(document.activeElement));
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    const target = tabs[next].dataset.ihkRoute;
    onNavigate(target);
    overlay.querySelector(`.ihk-nav [data-ihk-route="${target}"]`)?.focus();
  }
  overlay.addEventListener('keydown', navigateByKey);
  const unsubscribe = onLanguageChange(() => {
    if (!overlay.hidden) render({ preserveScroll: true });
  });

  return {
    setRect(rect) {
      if (!rect?.width || !rect?.height) return;
      overlay.style.setProperty('--cv-doc-width', `${Math.round(rect.width)}px`);
      overlay.style.setProperty('--cv-doc-height', `${Math.round(rect.height)}px`);
    },
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
      if (!wasVisible) overlay.querySelector('.ihk-panel').classList.add('is-emerging');
    },
    dispose() {
      unsubscribe();
      releaseVideo();
      overlay.removeEventListener('keydown', navigateByKey);
      overlay.removeEventListener('click', navigate);
      overlay.remove();
      frame?.classList.remove('is-ihk-open');
    },
  };
}
