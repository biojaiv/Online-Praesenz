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
    current = t;
    markActive(t);
    if (push && normalise(location.hash) !== t) {
      history.pushState({ t }, '', t === 'home' ? '#' : `#${t}`);
    }
    if (t !== 'home') markExplored(t);
    onEnter?.(t);
  }

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-target]');
    if (!btn) return;
    go(btn.dataset.target);
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

  // Tastaturbedienung der Untermenues: Fokus oeffnet die zugehoerige Gruppe.
  navLinks.forEach((el) => {
    el.addEventListener('focus', () => {
      for (const group of nav.querySelectorAll('.nav__group')) group.classList.remove('is-open');
      el.closest('.nav__group')?.classList.add('is-open');
    });
  });

  go(location.hash, false);

  return { go };
}
