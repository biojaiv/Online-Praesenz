import cvDe from '../data/cv.de.json';
import cvEn from '../data/cv.en.json';
import { getLanguage, onLanguageChange, t } from '../i18n.js';

/**
 * Native HTML reading version of the CV.
 *
 * The semantic content is kept as two reviewed data sets. Switching language
 * swaps only the active data object and the translated UI chrome; route,
 * camera, open state and document geometry remain untouched.
 */

const ROOT = 'lebenslauf';
const SECTIONS = new Set(['arbeitsleben', 'bildungsweg', 'faehigkeiten', 'kontakt']);
const ANCHORS = {
  uebersicht: '#cv-overview',
  arbeitsleben: '#cv-work',
  bildungsweg: '#cv-education',
  faehigkeiten: '#cv-skills',
  kontakt: '#cv-contact',
};
const CV_DATA = Object.freeze({ de: cvDe, en: cvEn });

function activeData() {
  return CV_DATA[getLanguage()] ?? CV_DATA.en;
}

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sectionFromRoute(route) {
  const section = String(route || '').split('/')[1] || 'uebersicht';
  return SECTIONS.has(section) ? section : 'uebersicht';
}

function compactTimelineItems(items = []) {
  const grouped = new Map();

  for (const item of items) {
    const key = [item.titel, item.beschreibung, item.hinweis]
      .map((value) => String(value ?? '').trim())
      .join('\u0000');
    const existing = grouped.get(key);

    if (existing) {
      if (item.zeitraum) existing.periods.push(item.zeitraum);
      continue;
    }

    grouped.set(key, {
      ...item,
      periods: item.zeitraum ? [item.zeitraum] : [],
    });
  }

  return [...grouped.values()].map(({ periods, ...item }) => ({
    ...item,
    zeitraum: periods.join(' · '),
  }));
}

function timelinePeriods(value) {
  return String(value ?? '')
    .split(' · ')
    .map((period) => period.trim())
    .filter(Boolean)
    .map((period) => `<span>${escapeHTML(period)}</span>`)
    .join('');
}

function timeline(items = [], extraClass = '') {
  return `
    <ol class="cv-timeline ${extraClass}">
      ${compactTimelineItems(items).map((item) => `
        <li>
          <time>${timelinePeriods(item.zeitraum)}</time>
          <div>
            <h3>${escapeHTML(item.titel)}</h3>
            ${item.beschreibung ? `<p>${escapeHTML(item.beschreibung)}</p>` : ''}
            ${item.hinweis ? `<p class="cv-note">${escapeHTML(item.hinweis)}</p>` : ''}
          </div>
        </li>`).join('')}
    </ol>`;
}

function signature(data) {
  const tools = (data.signatur || []).filter(Boolean);
  if (!tools.length && !data.verfuegbar) return '';
  return `
    <div class="cv-signature">
      ${tools.length ? `<p class="cv-signature__tools">${tools
        .map((tool) => `<span>${escapeHTML(tool)}</span>`)
        .join('<i aria-hidden="true">·</i>')}</p>` : ''}
      ${data.verfuegbar ? `<p class="cv-signature__when">${escapeHTML(data.verfuegbar)}</p>` : ''}
    </div>`;
}

function overview(data) {
  const personal = data.persoenlich || {};
  return `
    <section class="cv-section cv-section--overview" id="cv-overview" aria-labelledby="cv-overview-title">
      <div class="cv-id">
        <div class="cv-id__meta">
          <p class="cv-kicker">${escapeHTML(t('reader.kickerProfile'))}</p>
          <h2 id="cv-overview-title">${escapeHTML(data.name)}</h2>
          <p class="cv-lead">${escapeHTML(data.title)}</p>
        </div>
        <span class="cv-id__stamp">VL<br><small>CV // 01</small></span>
      </div>
      <p class="cv-focus"><strong>${escapeHTML(t('reader.focusLabel'))}</strong> ${escapeHTML(data.fokus)}</p>
      ${signature(data)}
      <dl class="cv-facts">
        <div><dt>${escapeHTML(t('reader.factFocus'))}</dt><dd>${escapeHTML(data.interessensschwerpunkte)}</dd></div>
        <div><dt>${escapeHTML(t('reader.factLocation'))}</dt><dd>${escapeHTML(personal.wohnort)}</dd></div>
      </dl>
    </section>`;
}

function education(data) {
  return `
    <section class="cv-section" id="cv-education" aria-labelledby="cv-education-title">
      <p class="cv-kicker">${escapeHTML(t('reader.kickerQualification'))}</p>
      <h2 id="cv-education-title">${escapeHTML(t('reader.educationTitle'))}</h2>
      ${timeline(data.bildungsweg)}
    </section>`;
}

function work(data) {
  return `
    <section class="cv-section cv-section--work" id="cv-work" aria-labelledby="cv-work-title">
      <p class="cv-kicker cv-kicker--amber">${escapeHTML(t('reader.kickerExperience'))}</p>
      <h2 id="cv-work-title">${escapeHTML(t('reader.careerTitle'))}</h2>
      ${timeline(data.beruflicherWerdegang, 'cv-timeline--work')}
    </section>`;
}

function skills(data) {
  const groups = [
    [t('reader.technicalSkills'), data.skills || []],
    [t('reader.languagesWorkingStyle'), data.soft || []],
  ];

  return `
    <section class="cv-section" id="cv-skills" aria-labelledby="cv-skills-title">
      <p class="cv-kicker">${escapeHTML(t('reader.kickerSkills'))}</p>
      <h2 id="cv-skills-title">${escapeHTML(t('reader.skillsTitle'))}</h2>
      <div class="cv-lower-grid cv-lower-grid--skills">
        <div class="cv-skill-groups">
          ${groups.map(([title, rows]) => `
            <div class="cv-skill-group">
              <h3>${escapeHTML(title)}</h3>
              <ul class="cv-skills">
                ${rows.map((skill) => `<li>${escapeHTML(skill.label)}</li>`).join('')}
              </ul>
            </div>`).join('')}
        </div>
        <aside class="cv-skill-side" aria-label="${escapeHTML(t('reader.interestsAria'))}">
          <div class="cv-side-block">
            <p class="cv-kicker">${escapeHTML(t('reader.interestsKicker'))}</p>
            <h3>${escapeHTML(t('reader.interestsTitle'))}</h3>
            <ul class="cv-interests-list">${(data.interessen || [])
              .map((interest) => `<li>${escapeHTML(interest)}</li>`)
              .join('')}</ul>
          </div>
        </aside>
      </div>
    </section>`;
}

function contact(data) {
  const personal = data.persoenlich || {};
  const email = escapeHTML(personal.kontakt);

  return `
    <section class="cv-section cv-section--contact" id="cv-contact" aria-labelledby="cv-contact-title">
      <div class="cv-contact-grid">
        <div>
          <p class="cv-kicker">${escapeHTML(t('reader.kickerContact'))}</p>
          <h2 id="cv-contact-title">${escapeHTML(t('reader.contact'))}</h2>
        </div>
        <dl class="cv-contact-list">
          <div><dt>${escapeHTML(t('reader.email'))}</dt><dd><a href="mailto:${email}">${email}</a></dd></div>
          <div><dt>${escapeHTML(t('reader.location'))}</dt><dd>${escapeHTML(personal.wohnort)}</dd></div>
          <div><dt>${escapeHTML(t('reader.availability'))}</dt><dd>${escapeHTML(data.verfuegbar)}</dd></div>
        </dl>
      </div>
      <a class="cv-primary-action" href="mailto:${email}">${escapeHTML(t('reader.emailAction'))}</a>
    </section>`;
}

function afterAnimation(element, fallback) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      element.removeEventListener('animationend', finish);
      resolve();
    };
    element.addEventListener('animationend', finish);
    window.setTimeout(finish, fallback);
  });
}

export function createReader({ container, onNavigate, onOpenChange, onTransition } = {}) {
  if (!container) return null;

  const panel = document.createElement('div');
  panel.className = 'cv-reader';
  panel.hidden = true;
  panel.innerHTML = `
    <article class="cv-hologram" tabindex="-1">
      <header class="cv-hologram__header">
        <button class="cv-back" type="button" data-cv-close>←</button>
        <div><span>Curriculum Vitæ</span><small data-cv-live></small></div>
        <span class="cv-status" data-cv-status></span>
      </header>
      <nav class="cv-nav">
        <button type="button" data-cv-target="lebenslauf" data-cv-label="reader.profile"></button>
        <button type="button" data-cv-target="lebenslauf/faehigkeiten" data-cv-label="reader.skills"></button>
        <button type="button" data-cv-target="lebenslauf/bildungsweg" data-cv-label="reader.education"></button>
        <button type="button" data-cv-target="lebenslauf/arbeitsleben" data-cv-label="reader.career"></button>
        <button type="button" data-cv-target="lebenslauf/kontakt" data-cv-label="reader.contact"></button>
      </nav>
      <div class="cv-hologram__body" tabindex="0"></div>
      <footer class="cv-hologram__footer"><span>VL // PERSONNEL FILE</span><div class="cv-hologram__actions"></div></footer>
    </article>`;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'cv-action cv-reader-toggle';
  toggle.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');

  const controls = document.querySelector('#nav-sub-lebenslauf') || document.querySelector('[data-target="lebenslauf"]').nextElementSibling;
  toggle.dataset.menuAction = 'reader';
  controls.insertBefore(toggle, controls.querySelector('[data-menu-action="download"]'));
  container.append(panel);

  const article = panel.querySelector('.cv-hologram');
  const body = panel.querySelector('.cv-hologram__body');
  const nav = panel.querySelector('.cv-nav');
  const closeButton = panel.querySelector('[data-cv-close]');
  const liveLabel = panel.querySelector('[data-cv-live]');
  const statusLabel = panel.querySelector('[data-cv-status]');
  const actionSlot = panel.querySelector('.cv-hologram__actions');

  let route = ROOT;
  let data = activeData();
  let open = false;
  let switching = false;
  let requestedOpen = false;
  let lastFocus = null;

  function applyChromeTranslations() {
    article?.setAttribute('aria-label', t('reader.articleAria'));
    closeButton?.setAttribute('aria-label', t('reader.closeAria'));
    if (liveLabel) liveLabel.textContent = t('reader.live');
    if (statusLabel) statusLabel.textContent = t('reader.sync');
    nav?.setAttribute('aria-label', t('reader.navAria'));
    body?.setAttribute('aria-label', t('reader.bodyAria'));
    for (const button of nav?.querySelectorAll('[data-cv-label]') || []) {
      button.textContent = t(button.dataset.cvLabel);
    }
    toggle.textContent = open ? t('reader.projection') : t('reader.readable');
    toggle.setAttribute('aria-label', toggle.textContent);
    toggle.title = toggle.textContent;
  }

  function markActive() {
    for (const button of nav.querySelectorAll('[data-cv-target]')) {
      const active = button.dataset.cvTarget === route;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    }
  }

  function renderContent() {
    if (!data) {
      body.innerHTML = `<p class="cv-state">${escapeHTML(t('reader.invalidData'))}</p>`;
      return;
    }
    body.innerHTML = [
      overview(data),
      skills(data),
      education(data),
      work(data),
      contact(data),
    ].join('');
  }

  function scrollToSection(behavior = 'smooth') {
    const section = sectionFromRoute(route);
    const target = section === 'uebersicht'
      ? body.querySelector(ANCHORS.uebersicht)
      : body.querySelector(ANCHORS[section]);
    const top = target ? Math.max(0, target.offsetTop - 8) : 0;
    body.scrollTo({ top, behavior });
  }

  function refreshLanguage() {
    data = activeData();
    applyChromeTranslations();
    renderContent();
    markActive();
    if (open) {
      scrollToSection('auto');
      requestAnimationFrame(() => scrollToSection('auto'));
    }
  }

  async function setOpen(next) {
    const value = Boolean(next) && route.split('/')[0] === ROOT;
    // A route change during the opening animation must still close the reader.
    requestedOpen = value;
    if (value === open || switching) return;
    switching = true;
    open = value;
    toggle.disabled = true;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.classList.toggle('is-docked', open);
    applyChromeTranslations();

    try {
      if (open) {
        lastFocus = document.querySelector('.nav__link[data-target="lebenslauf"]');
        await onTransition?.(true);
        if (!open || route.split('/')[0] !== ROOT) return;
        article.classList.remove('is-fading');
        panel.classList.remove('is-fading');
        article.classList.add('is-emerging');
        panel.hidden = false;
        controls.insertBefore(toggle, controls.querySelector('[data-menu-action="download"]'));
        scrollToSection('auto');
        requestAnimationFrame(() => scrollToSection('auto'));
        body.focus({ preventScroll: true });
        onOpenChange?.(true);
        await afterAnimation(article, 720);
        article.classList.remove('is-emerging');
      } else {
        const restoreFocus = panel.contains(document.activeElement);
        article.classList.remove('is-emerging');
        article.classList.add('is-fading');
        panel.classList.add('is-fading');
        await afterAnimation(article, 600);
        article.classList.remove('is-fading');
        panel.classList.remove('is-fading');
        panel.hidden = true;
        controls.insertBefore(toggle, controls.querySelector('[data-menu-action="download"]'));
        onOpenChange?.(false);
        onTransition?.(false);
        if (restoreFocus && route.split('/')[0] === ROOT && lastFocus instanceof HTMLElement) {
          lastFocus.focus({ preventScroll: true });
        }
        lastFocus = null;
      }
    } finally {
      switching = false;
      toggle.disabled = false;
      applyChromeTranslations();
      if (requestedOpen !== open) await setOpen(requestedOpen);
    }
  }

  panel.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('[data-cv-target], [data-cv-close]')
      : null;
    if (!target) return;
    if (target.dataset.cvClose !== undefined) {
      setOpen(false);
      return;
    }
    onNavigate?.(target.dataset.cvTarget);
  });

  nav.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...nav.querySelectorAll('[data-cv-target]')];
    const current = Math.max(0, tabs.indexOf(document.activeElement));
    const next = event.key === 'Home' ? 0 : event.key === 'End'
      ? tabs.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  });

  toggle.addEventListener('click', () => setOpen(!open));

  function onKeydown(event) {
    if (event.key !== 'Escape' || !open || document.querySelector('.nav__group.is-open')) return;
    event.stopPropagation();
    event.preventDefault();
    setOpen(false);
  }
  window.addEventListener('keydown', onKeydown, true);

  const unsubscribeLanguage = onLanguageChange(refreshLanguage);
  refreshLanguage();

  return {
    element: panel,
    get isOpen() { return open; },
    close() { return setOpen(false); },
    get actionSlot() { return actionSlot; },
    refreshLanguage,

    setRect(rect) {
      if (!rect?.width || !rect?.height) return;
      article.style.setProperty('--cv-doc-width', `${Math.round(rect.width)}px`);
      article.style.setProperty('--cv-doc-height', `${Math.round(rect.height)}px`);
    },

    setRoute(nextRoute) {
      route = String(nextRoute || 'home');
      const available = route.split('/')[0] === ROOT;
      toggle.hidden = !available;
      if (!available) {
        setOpen(false);
        return;
      }
      markActive();
      if (open) scrollToSection();
    },

    dispose() {
      unsubscribeLanguage();
      window.removeEventListener('keydown', onKeydown, true);
      panel.remove();
      toggle.remove();
    },
  };
}
