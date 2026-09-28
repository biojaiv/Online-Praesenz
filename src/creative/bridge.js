import { getLanguage, setLanguage, onLanguageChange } from '../i18n.js';
/** Same-origin lifecycle shared by the full-screen projector and standalone pages. */
export function createBridge(render, onVisibility = () => {}) {
  const params = new URLSearchParams(location.search);
  const embedded = parent !== window && params.get('embedded') === '1';
  let visible = !embedded;
  const post = (type, data = {}) => { if (embedded) parent.postMessage({type:`example:${type}`, ...data}, location.origin); };
  setLanguage(params.get('lang') || getLanguage());
  const translate = () => { document.documentElement.lang = getLanguage(); render(getLanguage()); };
  const unsubscribe = onLanguageChange(translate);
  const close = () => { if (embedded) { visible = false; onVisibility(false); post('close'); } else location.href = '/#projekte/webseiten'; };
  const message = event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (event.data?.type === 'example:pause') { visible = false; onVisibility(false); }
    if (event.data?.type === 'example:visible') { visible = true; onVisibility(!document.hidden); }
    if (event.data?.type === 'example:language' && ['de','en'].includes(event.data.language)) setLanguage(event.data.language);
  };
  const visibility = () => onVisibility(visible && !document.hidden);
  addEventListener('message', message);
  document.addEventListener('visibilitychange', visibility);
  addEventListener('pagehide', () => { onVisibility(false); unsubscribe(); }, {once:true});
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); close(); }
  });
  document.querySelector('[data-back]').addEventListener('click', event => { event.preventDefault(); close(); });
  document.querySelector('[data-language]').addEventListener('click', () => {
    setLanguage(getLanguage() === 'de' ? 'en' : 'de');
    const url = new URL(location.href); url.searchParams.set('lang',getLanguage()); history.replaceState(null,'',url);
    post('language',{language:getLanguage()});
  });
  translate();
  return { ready(){document.documentElement.dataset.creativeReady='true';post('ready',{language:getLanguage()});visibility();}, get visible(){return visible && !document.hidden;} };
}
