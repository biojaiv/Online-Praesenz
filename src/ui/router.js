import { markExplored } from '../state/explored.js';
import { playSound } from './audio.js';

/**
 * Router ohne Unterseiten.
 *
 * Es gibt genau ein Dokument. Bereiche werden ueber den Hash adressiert,
 * damit Links teilbar und der Zurueck-Button nutzbar bleibt, aber es
 * wird nie neu geladen.
 */
export function createRouter({ onEnter }) {
  const nav = document.getElementById('nav');
  const navLinks = [...nav.querySelectorAll('.nav__link')];
  const groups = [...nav.querySelectorAll('.nav__group')];
  let openGroup = null;

  function setOpenGroup(next) {
    openGroup = next;
    for (const group of groups) {
      const expanded = group === next;
      group.classList.toggle('is-open', expanded);
      group.querySelector('.nav__link').setAttribute('aria-expanded', String(expanded));
      group.querySelector('.nav__sub').inert = !expanded;
    }
  }

  for (const group of groups) {
    const button = group.querySelector('.nav__link');
    const submenu = group.querySelector('.nav__sub');
    submenu.id = `nav-sub-${button.dataset.target}`;
    button.setAttribute('aria-controls', submenu.id);
  }

  function normalise(raw) {
    return (raw || '').replace(/^#/, '').trim() || 'home';
  }

  function markActive(target) {
    const root = target.split('/')[0];
    for (const el of navLinks) el.classList.toggle('is-active', el.dataset.target === root);
  }

  let current = 'home';

  function go(target, push = true) {
    const t = normalise(target);
    setOpenGroup(null);
    current = t;
    markActive(t);
    if (push && normalise(location.hash) !== t) {
      history.pushState({ t }, '', t === 'home' ? '#' : `#${t}`);
    }
    if (t !== 'home') markExplored(t);
    onEnter?.(t);
  }

  nav.addEventListener('click', (e) => {
    if (e.target.closest('[data-menu-action]')) { setOpenGroup(null); return; }
    const btn = e.target.closest('[data-target]');
    if (!btn) return;
    const group = btn.closest('.nav__group');
    if (btn.classList.contains('nav__link') && group) {
      if (openGroup === group) {
        setOpenGroup(null);
        return;
      }
      if (current.split('/')[0] !== btn.dataset.target) go(btn.dataset.target);
      setOpenGroup(group);
      return;
    }
    go(btn.dataset.target);
  });

  // Outside activation closes the disclosure without changing the route.
  document.addEventListener('click', (event) => {
    if (openGroup && !openGroup.contains(event.target)) setOpenGroup(null);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !openGroup) return;
    const button = openGroup.querySelector('.nav__link');
    setOpenGroup(null);
    button.focus({ preventScroll: true });
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  nav.addEventListener('keydown', (event) => {
    const group = event.target.closest('.nav__group');
    if (!group) return;
    const button = group.querySelector('.nav__link');
    const items = [...group.querySelectorAll('.nav__sub button, .nav__sub a')].filter(el => !el.hidden);
    if (event.target === button && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      setOpenGroup(group);
      items[event.key === 'ArrowDown' ? 0 : items.length - 1]?.focus();
    } else if (items.includes(event.target) && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const index = items.indexOf(event.target);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    }
    if (event.key === 'Tab') requestAnimationFrame(() => {
      if (openGroup && !openGroup.contains(document.activeElement)) setOpenGroup(null);
    });
  });

  document.querySelector('.head__brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    go('home');
  });

  // popstate deckt Vor und Zurueck ab, hashchange von Hand editierte Adressen.
  const syncFromHash = () => {
    const t = normalise(location.hash);
    if (t !== current) go(t, false);
  };
  window.addEventListener('popstate', syncFromHash);
  window.addEventListener('hashchange', syncFromHash);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const el = e.target;
    if (el instanceof HTMLElement
      && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
    // Auch die Fluchttaste faehrt aus dem Sockel heraus und klingt so.
    if (current !== 'home') playSound('release');
    go('home');
  });

  go(location.hash, false);

  return { go };
}
