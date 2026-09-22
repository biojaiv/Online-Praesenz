import './exampleProjection.css';
import { createWarpTunnel } from './warpTunnel.js';
import { playSound } from './audio.js';
import { getLanguage, setLanguage, onLanguageChange, t } from '../i18n.js';

export function createExampleProjection({ stage, container, onNavigate }) {
  const trigger = document.getElementById('scene');
  const frame = container.closest('.frame');
  const dialog = document.createElement('dialog');
  dialog.className = 'example-projection';
  dialog.innerHTML = `<div class="example-projection__controls"><button type="button" data-example-back></button></div><p class="example-projection__status" role="status"></p><div class="example-projection__light"><i class="projection-wave" aria-hidden="true"></i><i class="projection-wave" aria-hidden="true"></i><i class="projection-wave" aria-hidden="true"></i><div class="example-projection__screen"></div></div>`;
  document.body.append(dialog);
  const back = dialog.querySelector('[data-example-back]');
  const screen = dialog.querySelector('.example-projection__screen');
  const status = dialog.querySelector('[role=status]');
  const tunnel = createWarpTunnel(dialog, screen);
  let state = 'closed', originFocus = null, iframe = null, events = null, timer = 0, ticket = 0;
  function translate() {
    dialog.setAttribute('aria-label', t('example.label'));
    back.innerHTML = `<kbd>ESC</kbd><span>${t('example.back')}</span><span aria-hidden="true">↩</span>`;
    status.textContent = t('example.loading');
    if (iframe) iframe.title = t('example.label');
  }
  translate();
  const unsubscribe = onLanguageChange(translate);
  async function close(route) {
    if (state === 'closed' || state === 'closing') return;
    state = 'closing'; ++ticket;
    tunnel.stop();
    playSound('release');
    dialog.dataset.state = state;
    window.clearTimeout(timer);
    events?.abort(); events = null;
    iframe?.remove(); iframe = null;
    await stage?.exampleFlight.close();
    dialog.close(); state = 'closed';
    frame?.classList.remove('is-example-projected');
    stage?.cards.setTemporaryActive(null);
    const restoredFocus = originFocus?.isConnected ? originFocus : document.querySelector('.project-choice') || trigger;
    restoredFocus?.focus?.({ preventScroll: true });
    if (route) onNavigate(route);
  }
  async function open(source = trigger) {
    if (!stage) { location.href = `/beispiel/?lang=${getLanguage()}`; return; }
    if (state !== 'closed' || document.querySelector('.frame.is-intro') || !document.querySelector('#boot.is-done')) return;
    const current = ++ticket;
    originFocus = source;
    playSound('focus');
    stage.cards.setTemporaryActive('projekte');
    state = 'opening'; dialog.dataset.state = state;
    status.hidden = false;
    translate();
    dialog.showModal(); back.focus({ preventScroll: true });
    events = new AbortController();
    window.addEventListener('message', event => {
      if (event.origin !== location.origin || event.source !== iframe?.contentWindow) return;
      if (event.data?.type === 'example:close') close();
      if (event.data?.type === 'example:navigate' && ['abschluss', 'lebenslauf'].includes(event.data.route)) close(event.data.route);
      if (event.data?.type === 'example:language' && ['de', 'en'].includes(event.data.language)) setLanguage(event.data.language);
      if (event.data?.type === 'example:ready') {
        clearTimeout(timer); status.hidden = true;
        if (state === 'open') { iframe.inert = false; iframe.tabIndex = 0; }
        iframe.dataset.ready = 'true';
      }
    }, { signal: events.signal });
    // The iframe loads in parallel with the flight, but remains inert until arrival.
    iframe = document.createElement('iframe');
    iframe.title = t('example.label');
    iframe.src = `/beispiel/?embedded=1&lang=${getLanguage()}`;
    iframe.inert = true; iframe.tabIndex = -1;
    screen.replaceChildren(iframe);
    timer = window.setTimeout(() => { status.textContent = t('example.error'); }, 12000);
    await stage.exampleFlight.open();
    if (current !== ticket) return;
    state = 'open'; dialog.dataset.state = state;
    frame?.classList.add('is-example-projected');
    tunnel.start();
    if (iframe.dataset.ready) { iframe.inert = false; iframe.tabIndex = 0; }
  }
  function activate(event) {
    const link = event.target.closest('[data-example-open]');
    if (!link || !stage) return;
    event.preventDefault(); open(link);
  }
  function onCancel(event) { event.preventDefault(); close(); }
  function onBack() { close(); }
  // Escape must be handled before the portfolio router changes its route.
  function onEscape(event) {
    if (state !== 'closed' && event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); close();
    }
  }
  document.addEventListener('click', activate);
  window.addEventListener('keydown', onEscape, true);
  dialog.addEventListener('cancel', onCancel);
  back.addEventListener('click', onBack);
  return {
    open, close,
    get isOpen() { return state !== 'closed'; },
    dispose() {
      ++ticket; events?.abort(); clearTimeout(timer);
      stage?.setExamplePreviewUpdate(null);
      document.removeEventListener('click', activate);
      window.removeEventListener('keydown', onEscape, true);
      dialog.removeEventListener('cancel', onCancel);
      back.removeEventListener('click', onBack);
      frame?.classList.remove('is-example-projected');
      stage?.cards.setTemporaryActive(null);
      tunnel.dispose();
      dialog.close(); dialog.remove(); unsubscribe();
    },
  };
}
