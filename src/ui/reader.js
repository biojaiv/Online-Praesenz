/**
 * Die Lesefassung des Lebenslaufs.
 *
 * Im Raum steht die Projektion des gestalteten Dokuments. Der Inhalt selbst
 * bleibt daneben echtes HTML aus `cv.json`: markierbar, durchsuchbar,
 * indexierbar und mit Screenreader bedienbar. Frueher lag dieselbe Fassung
 * unsichtbar per CSS3D im 3D-Raum ueber der Projektion — zwei Darstellungen
 * desselben Inhalts an derselben Stelle, eine davon mit `opacity: 0`. Die
 * Ebene rendert jetzt flach, nur auf Wunsch, und kostet im Ruhezustand nichts.
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
const CV_URL = '/data/cv.json';
const REQUEST_TIMEOUT = 8000;

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

function timeline(items = [], extraClass = '') {
  return `
    <ol class="cv-timeline ${extraClass}">
      ${items.map((item) => `
        <li>
          <time>${escapeHTML(item.zeitraum)}</time>
          <div>
            <h3>${escapeHTML(item.titel)}</h3>
            ${item.beschreibung ? `<p>${escapeHTML(item.beschreibung)}</p>` : ''}
            ${item.hinweis ? `<p class="cv-note">${escapeHTML(item.hinweis)}</p>` : ''}
          </div>
        </li>`).join('')}
    </ol>`;
}

/**
 * Signaturzeile und Verfuegbarkeit — dieselbe Setzung wie im gestalteten
 * Blatt, nur als markierbarer Text: eine knappe Reihe der Leitwerkzeuge, eine
 * Haarlinie, darunter der Zeitpunkt.
 */
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
          <p class="cv-kicker">Systemprofil · 2026</p>
          <h2 id="cv-overview-title">${escapeHTML(data.name)}</h2>
          <p class="cv-lead">${escapeHTML(data.title)}</p>
        </div>
        <span class="cv-id__stamp">VL<br><small>CV // 01</small></span>
      </div>
      <p class="cv-focus"><strong>Mein Fokus</strong> ${escapeHTML(data.fokus)}</p>
      ${signature(data)}
      <dl class="cv-facts">
        <div><dt>Schwerpunkt</dt><dd>${escapeHTML(data.interessensschwerpunkte)}</dd></div>
        <div><dt>Standort</dt><dd>${escapeHTML(personal.wohnort)}</dd></div>
        <div><dt>Geboren</dt><dd>${escapeHTML(personal.geburtsdatum)}</dd></div>
      </dl>
    </section>`;
}

function education(data) {
  return `
    <section class="cv-section" id="cv-education" aria-labelledby="cv-education-title">
      <p class="cv-kicker">Chronologie</p>
      <h2 id="cv-education-title">Bildungsweg</h2>
      ${timeline(data.bildungsweg)}
    </section>`;
}

function work(data) {
  return `
    <section class="cv-section cv-section--work" id="cv-work" aria-labelledby="cv-work-title">
      <p class="cv-kicker cv-kicker--amber">Arbeitsleben</p>
      <h2 id="cv-work-title">Beruflicher Werdegang</h2>
      ${timeline(data.beruflicherWerdegang, 'cv-timeline--work')}
    </section>`;
}

function skills(data) {
  const personal = data.persoenlich || {};
  const groups = [
    ['Technische Fähigkeiten', data.skills || []],
    ['Persönliche Fähigkeiten', data.soft || []],
  ];
  return `
    <section class="cv-section" id="cv-skills" aria-labelledby="cv-skills-title">
      <p class="cv-kicker">Kompetenzmatrix</p>
      <h2 id="cv-skills-title">Fähigkeiten</h2>
      <div class="cv-lower-grid">
        <div class="cv-skill-groups">
          ${groups.map(([title, rows]) => `
            <div class="cv-skill-group">
              <h3>${escapeHTML(title)}</h3>
              <ul class="cv-skills">
                ${rows.map((skill) => `<li>${escapeHTML(skill.label)}</li>`).join('')}
              </ul>
            </div>`).join('')}
        </div>
        <aside class="cv-skill-side" aria-label="Interessen und persönliche Informationen">
          <div class="cv-side-block">
            <p class="cv-kicker">Freiraum</p>
            <h3>Interessen</h3>
            <ul class="cv-interests-list">${(data.interessen || []).map((interest) => `<li>${escapeHTML(interest)}</li>`).join('')}</ul>
          </div>
          <div class="cv-side-block">
            <p class="cv-kicker cv-kicker--amber">Persönliche Informationen</p>
            <dl class="cv-personal-list">
              <div><dt>Geburtsdatum</dt><dd>${escapeHTML(personal.geburtsdatum)}</dd></div>
              <div><dt>Kontakt</dt><dd><a href="mailto:${escapeHTML(personal.kontakt)}">${escapeHTML(personal.kontakt)}</a></dd></div>
              <div><dt>Wohnort</dt><dd>${escapeHTML(personal.wohnort)}</dd></div>
            </dl>
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
          <p class="cv-kicker">Persönliche Daten</p>
          <h2 id="cv-contact-title">Kontakt</h2>
        </div>
        <dl class="cv-contact-list">
          <div><dt>E-Mail</dt><dd><a href="mailto:${email}">${email}</a></dd></div>
          <div><dt>Standort</dt><dd>${escapeHTML(personal.wohnort)}</dd></div>
          <div><dt>Geburtsdatum</dt><dd>${escapeHTML(personal.geburtsdatum)}</dd></div>
        </dl>
      </div>
      <div class="cv-interests">
        <p class="cv-kicker">Freiraum</p>
        <h3>Interessen</h3>
        <ul>${(data.interessen || []).map((interest) => `<li>${escapeHTML(interest)}</li>`).join('')}</ul>
      </div>
      <a class="cv-primary-action" href="mailto:${email}">Nachricht verfassen</a>
    </section>`;
}

/** Wartet auf das Ende einer CSS-Animation, notfalls auf die Uhr. */
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
    <article class="cv-hologram" aria-label="Lebenslauf von Vladimir Leicht" tabindex="-1">
      <header class="cv-hologram__header">
        <button class="cv-back" type="button" data-cv-close aria-label="Lesefassung schließen">←</button>
        <div><span>Curriculum Vitæ</span><small>Lesefassung · Live-Datensatz</small></div>
        <span class="cv-status">Synchron</span>
      </header>
      <nav class="cv-nav" aria-label="Lebenslaufbereiche" role="tablist">
        <button type="button" role="tab" data-cv-target="lebenslauf">Übersicht</button>
        <button type="button" role="tab" data-cv-target="lebenslauf/arbeitsleben">Arbeitsleben</button>
        <button type="button" role="tab" data-cv-target="lebenslauf/bildungsweg">Bildungsweg</button>
        <button type="button" role="tab" data-cv-target="lebenslauf/faehigkeiten">Fähigkeiten</button>
        <button type="button" role="tab" data-cv-target="lebenslauf/kontakt">Kontakt</button>
      </nav>
      <div class="cv-hologram__body" tabindex="0" aria-label="Scrollbarer Lebenslaufinhalt">
        <p class="cv-state">Lebenslaufdaten werden entschlüsselt …</p>
      </div>
      <footer class="cv-hologram__footer"><span>VL // PERSONNEL FILE</span><div class="cv-hologram__actions"></div></footer>
    </article>`;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'cv-action cv-reader-toggle';
  toggle.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = 'Lesefassung';

  container.append(toggle, panel);

  const article = panel.querySelector('.cv-hologram');
  const body = panel.querySelector('.cv-hologram__body');
  const nav = panel.querySelector('.cv-nav');
  // Solange die Lesefassung offen steht, sitzen Umschalter und Download in
  // der Fusszeile des Blattes; ueber der Projektion stehen sie frei auf der
  // Buehne. So ueberdeckt nie ein Knopf den Text.
  const actionSlot = panel.querySelector('.cv-hologram__actions');

  let route = ROOT;
  let data = null;
  let error = null;
  let open = false;
  let switching = false;
  let controller = null;
  let lastFocus = null;

  function markActive() {
    for (const button of nav.querySelectorAll('[data-cv-target]')) {
      const active = button.dataset.cvTarget === route;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    }
  }

  /** Inhalt entsteht genau einmal; Routenwechsel bewegen nur den Anker. */
  function renderContent() {
    if (error) {
      body.innerHTML = `<div class="cv-state cv-state--error"><strong>Datenkanal unterbrochen</strong><span>${escapeHTML(error.message)}</span><button type="button" data-cv-retry>Erneut laden</button></div>`;
      body.querySelector('[data-cv-retry]')?.addEventListener('click', load);
      return;
    }
    if (!data) {
      body.innerHTML = '<p class="cv-state">Lebenslaufdaten werden entschlüsselt …</p>';
      return;
    }
    body.innerHTML = [
      overview(data),
      education(data),
      skills(data),
      contact(data),
      work(data),
    ].join('');
  }

  function scrollToSection(behavior = 'smooth') {
    const section = sectionFromRoute(route);
    if (section === 'uebersicht') {
      body.scrollTo({ top: 0, behavior });
      return;
    }
    body.querySelector(ANCHORS[section])?.scrollIntoView({ block: 'start', behavior });
  }

  async function load() {
    controller?.abort();
    controller = new AbortController();
    error = null;
    data = null;
    renderContent();
    try {
      const signals = [controller.signal];
      if (AbortSignal.timeout) signals.push(AbortSignal.timeout(REQUEST_TIMEOUT));
      const response = await fetch(CV_URL, {
        signal: AbortSignal.any && signals.length > 1 ? AbortSignal.any(signals) : controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
    } catch (cause) {
      if (cause?.name === 'AbortError') return;      // bewusst verworfen
      if (cause?.name === 'TimeoutError') error = new Error('Zeitüberschreitung beim Laden');
      else if (cause instanceof SyntaxError) error = new Error('Ungültiges Datenformat');
      else error = new Error(cause?.message || 'Netzwerkverbindung fehlgeschlagen');
    }
    renderContent();
    if (open) scrollToSection('auto');
  }

  /**
   * Der Wechsel zwischen Projektion und Lesefassung.
   *
   * Beide nehmen dieselbe Flaeche ein, also darf keiner von beiden einfach
   * erscheinen: erst raeumt die Buehne (`onTransition`), dann waechst das
   * Blatt aus der Helix heraus. Waehrend der Sequenz bleibt der Umschalter
   * stumm, damit sich zwei Laeufe nicht kreuzen.
   */
  async function setOpen(next) {
    const value = Boolean(next) && route.split('/')[0] === ROOT;
    if (value === open || switching) return;
    switching = true;
    open = value;
    toggle.disabled = true;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? 'Projektion' : 'Lesefassung';
    toggle.classList.toggle('is-docked', open);

    try {
      if (open) {
        lastFocus = document.activeElement;
        await onTransition?.(true);
        if (!open) return;                       // zwischenzeitlich abgebrochen
        article.classList.remove('is-fading');
        panel.classList.remove('is-fading');
        article.classList.add('is-emerging');
        panel.hidden = false;
        actionSlot.prepend(toggle);
        scrollToSection('auto');
        body.focus({ preventScroll: true });
        onOpenChange?.(true);
        await afterAnimation(article, 1100);
        article.classList.remove('is-emerging');
      } else {
        article.classList.remove('is-emerging');
        article.classList.add('is-fading');
        panel.classList.add('is-fading');
        await afterAnimation(article, 600);
        article.classList.remove('is-fading');
        panel.classList.remove('is-fading');
        panel.hidden = true;
        container.prepend(toggle);
        onOpenChange?.(false);
        onTransition?.(false);
        if (lastFocus instanceof HTMLElement) {
          lastFocus.focus({ preventScroll: true });
          lastFocus = null;
        }
      }
    } finally {
      switching = false;
      toggle.disabled = false;
    }
  }

  panel.addEventListener('click', (event) => {
    const target = event.target.closest('[data-cv-target], [data-cv-close]');
    if (!target) return;
    if (target.dataset.cvClose !== undefined) {
      setOpen(false);
      return;
    }
    onNavigate?.(target.dataset.cvTarget);
  });

  nav.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...nav.querySelectorAll('[role="tab"]')];
    const current = Math.max(0, tabs.indexOf(document.activeElement));
    const next = event.key === 'Home' ? 0 : event.key === 'End'
      ? tabs.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  });

  toggle.addEventListener('click', () => setOpen(!open));

  // Escape schliesst zuerst die Lesefassung und erst danach den Bereich.
  function onKeydown(event) {
    if (event.key !== 'Escape' || !open) return;
    event.stopPropagation();
    event.preventDefault();
    setOpen(false);
  }
  window.addEventListener('keydown', onKeydown, true);

  load();

  return {
    element: panel,
    get isOpen() { return open; },
    /** Ablage in der Fusszeile fuer weitere Knoepfe der offenen Lesefassung. */
    get actionSlot() { return actionSlot; },

    /**
     * Flaeche der Projektion, in CSS-Pixeln: die Lesefassung nimmt genau
     * dieselbe ein und steht an derselben Stelle.
     */
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
      controller?.abort();
      window.removeEventListener('keydown', onKeydown, true);
      panel.remove();
      toggle.remove();
    },
  };
}
