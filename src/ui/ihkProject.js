import { getLanguage, onLanguageChange, t } from '../i18n.js';
import { ihkIcon, IHK_SECTION_ICONS } from './ihkIcons.js';

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
export function createIhkProject({ container, onNavigate, onTransition, onOpenChange }) {
  const overlay = document.createElement('section');
  overlay.className = 'ihk-project';
  overlay.hidden = true;
  overlay.setAttribute('aria-labelledby', 'ihk-title');
  container.append(overlay);
  const frame = container.closest('.frame');
  let section = 'overview';
  let returnFocus = null;
  let route = 'home';
  let open = false;
  let transition = 0;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'cv-action ihk-reader-toggle';
  toggle.hidden = true;
  const download = document.createElement('a');
  download.className = 'cv-action cv-download ihk-projection-download';
  download.hidden = true;
  const film = document.createElement('button');
  film.type = 'button';
  film.className = 'cv-action ihk-film-toggle';
  film.hidden = true;
  container.append(toggle, download, film);

  function refreshControls() {
    const available = route.split('/')[0] === 'abschluss';
    toggle.hidden = !available;
    toggle.textContent = t(open ? 'reader.projection' : 'reader.readable');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-controls', 'ihk-reader');
    toggle.classList.toggle('is-docked', open);
    download.hidden = !available || open;
    film.hidden = !available || open;
    film.textContent = t('ihk.filmAction');
    download.href = getLanguage() === 'de' ? '/ihk/IHK_Projektarbeit_DE.pdf' : '/ihk/IHK_Project_Report_EN.pdf';
    download.download = download.href.split('/').pop();
    download.textContent = t('download.visible');
    download.setAttribute('aria-label', copy(getLanguage() === 'de' ? 'downloadDE' : 'downloadEN'));
  }
  overlay.id = 'ihk-reader';

  async function setOpen(value) {
    const next = Boolean(value) && route.split('/')[0] === 'abschluss';
    if (next === open) return;
    open = next;
    const ticket = ++transition;
    refreshControls();
    if (open) {
      returnFocus = document.activeElement;
      await onTransition?.(true);
      if (ticket !== transition) return;
      overlay.hidden = false;
      render({ focus: true });
      overlay.querySelector('.ihk-panel').classList.add('is-emerging');
      onOpenChange?.(true);
    } else {
      const restore = overlay.contains(document.activeElement);
      overlay.querySelector('.ihk-panel')?.classList.add('is-fading');
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !overlay.hidden) {
        await new Promise((resolve) => setTimeout(resolve, 360));
      }
      if (ticket !== transition) return;
      releaseVideo();
      container.append(toggle);
      overlay.hidden = true;
      overlay.replaceChildren();
      onTransition?.(false);
      onOpenChange?.(false);
      if (restore && route.split('/')[0] === 'abschluss' && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    }
  }
  const clickToggle = () => setOpen(!open);
  toggle.addEventListener('click', clickToggle);
  const clickFilm = () => openMedia('ihk-film');
  film.addEventListener('click', clickFilm);
  function escapeReader(event) {
    if (event.key !== 'Escape' || !open || document.querySelector('.nav__group.is-open')) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
  }
  window.addEventListener('keydown', escapeReader, true);

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
        <p class="ihk-lead cv-lead">${copy('description')}</p>
        <dl class="ihk-metrics cv-facts">
          ${[['40 h', 'time', 'clock'], ['4', 'clientsMetric', 'clients'], ['100 %', 'success', 'check'], ['Windows 11', 'deployment', 'network']]
            .map(([value, label, icon]) => `<div><dt>${ihkIcon(icon)}<span>${value}</span></dt><dd>${copy(label)}</dd></div>`).join('')}
        </dl>
      </div>
      <section class="ihk-areas" aria-labelledby="ihk-areas-title">
        <h3 id="ihk-areas-title" class="ihk-symbol-heading">${ihkIcon('migration')}${copy('areas')}</h3>
        <ul>${SECTIONS.slice(1).map((key) => `<li><a href="#abschluss/${key}" data-ihk-route="abschluss/${key}">
          ${ihkIcon(key)}<span><strong>${copy(key)}</strong><small>${copy(`${key}.summary`)}</small></span></a></li>`).join('')}</ul>
      </section>
      <p class="ihk-result cv-focus">${copy('result')}</p>
      <section class="ihk-tech" aria-labelledby="ihk-tech-title">
        <h3 id="ihk-tech-title" class="ihk-symbol-heading">${ihkIcon('tools')}${copy('technologies')}</h3>
        <p class="cv-signature__tools">${TECHNOLOGIES.map((name) => `<span>${name}</span>`).join('<i aria-hidden="true">·</i>')}</p>
      </section>
      <div class="ihk-media">
        <section id="ihk-downloads" class="ihk-downloads" aria-labelledby="ihk-download-title">
          <h3 id="ihk-download-title" class="ihk-symbol-heading">${ihkIcon('file')}${copy('downloads')}</h3>
          <p>${copy('downloadIntro')}</p>
          <a class="cv-primary-action" href="/ihk/IHK_Projektarbeit_DE.pdf" download lang="de">${copy('downloadDE')}<span aria-hidden="true">↓</span></a>
          <a class="cv-primary-action" href="/ihk/IHK_Project_Report_EN.pdf" download lang="en">${copy('downloadEN')}<span aria-hidden="true">↓</span></a>
        </section>
        <section id="ihk-film" aria-labelledby="ihk-film-title">
          <h3 id="ihk-film-title" class="ihk-symbol-heading">${ihkIcon('play')}${copy('film')}</h3>
          <video controls playsinline preload="none" poster="${POSTERS[getLanguage()]}"
            src="${FILMS[getLanguage()]}" aria-labelledby="ihk-film-title" aria-describedby="ihk-film-caption">
            <a href="${FILMS[getLanguage()]}" download>${copy('filmFallback')}</a>
          </video>
          <p class="ihk-note" id="ihk-film-caption">${copy('filmCaption')}</p>
        </section>
      </div>`;
  }

  function details() {
    return `<p class="ihk-lead cv-lead">${copy(`${section}.lead`)}</p>
      <ol class="ihk-details cv-timeline cv-timeline--work">${['a', 'b', 'c'].map((part, i) => `
        <li><span class="ihk-step" aria-hidden="true">${ihkIcon(IHK_SECTION_ICONS[section][i])}</span><div>
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
          <button type="button" class="ihk-close cv-back" data-ihk-close aria-label="${escapeHTML(t('reader.closeAria'))}">←</button>
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
    overlay.querySelector('.cv-hologram__actions').prepend(toggle);
    overlay.querySelector('.ihk-body').scrollTop = scroll;
    if (focus) overlay.querySelector('#ihk-title').focus({ preventScroll: true });
    else if (focusedRoute) {
      [...overlay.querySelectorAll('[data-ihk-route]')]
        .find((el) => el.dataset.ihkRoute === focusedRoute)?.focus({ preventScroll: true });
    }
  }

  async function openMedia(id) {
    if (section !== 'overview') onNavigate('abschluss');
    await setOpen(true);
    if (!open || overlay.hidden) return;
    const target = overlay.querySelector(`#${id}`);
    const body = overlay.querySelector('.ihk-body');
    body.scrollTo({ top: target.offsetTop - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    target.querySelector('video, a')?.focus({ preventScroll: true });
  }

  function navigate(event) {
    if (event.target.closest('[data-ihk-close]')) { setOpen(false); return; }
    const jump = event.target.closest('[data-ihk-scroll]');
    if (jump) {
      openMedia(jump.dataset.ihkScroll);
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
    refreshControls();
    if (!overlay.hidden) render({ preserveScroll: true });
  });

  refreshControls();
  return {
    get isOpen() { return open; },
    close() { return setOpen(false); },
    setRect(rect) {
      if (!rect?.width || !rect?.height) return;
      overlay.style.setProperty('--cv-doc-width', `${Math.round(rect.width)}px`);
      overlay.style.setProperty('--cv-doc-height', `${Math.round(rect.height)}px`);
    },
    setRoute(nextRoute) {
      route = nextRoute;
      const [root, child] = route.split('/');
      const available = root === 'abschluss';
      frame?.classList.toggle('is-ihk-open', available);
      refreshControls();
      if (!available) { setOpen(false); return; }
      const next = SECTIONS.includes(child) ? child : 'overview';
      const changed = section !== next;
      section = next;
      if (changed && open && !overlay.hidden) render({ focus: true });
    },
    dispose() {
      transition += 1;
      window.removeEventListener('keydown', escapeReader, true);
      toggle.removeEventListener('click', clickToggle);
      film.removeEventListener('click', clickFilm);
      film.remove();
      toggle.remove();
      download.remove();
      unsubscribe();
      releaseVideo();
      overlay.removeEventListener('keydown', navigateByKey);
      overlay.removeEventListener('click', navigate);
      overlay.remove();
      frame?.classList.remove('is-ihk-open');
    },
  };
}
