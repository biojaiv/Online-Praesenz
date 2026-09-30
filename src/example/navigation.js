import { createHologramBorder } from '../ui/hologramBorder.js';

export function navigationMarkup(language = 'de', frame = true) {
  const german = language === 'de';
  return `${frame ? '<div class="tiefgang-frame" aria-hidden="true"></div>' : ''}<nav class="tiefgang-navigation" aria-label="${german ? 'Tiefgang-Rücknavigation' : 'Tiefgang return navigation'}"><a data-tiefgang-start href="/beispiel/?lang=${language}"><span aria-hidden="true">↶</span> ${german ? 'Tiefgang-Start' : 'Tiefgang start'}</a><a data-tiefgang-hologram href="/?lang=${language}#projekte/webseiten"><span aria-hidden="true">◇</span> ${german ? 'Zum Hologramm' : 'Back to hologram'}</a></nav>`;
}

export function startNavigation() {
  const embedded = parent !== window && new URLSearchParams(location.search).get('embedded') === '1';
  document.documentElement.classList.add(embedded ? 'tiefgang-embedded' : 'tiefgang-standalone');
  const navigation = document.querySelector('.tiefgang-navigation');
  const language = document.documentElement.lang === 'en' ? 'en' : 'de';
  navigation.outerHTML = navigationMarkup(language, false);
  const border = embedded ? null : createHologramBorder(document.querySelector('.tiefgang-frame'));
  border?.start();

  // Stay in the projection when opening the explainer, glossary or another chapter.
  // Its existing outer frame and return controls then remain available throughout.
  function onClick(event) {
    const link = event.target.closest('a[href]');
    if (!embedded || !link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname.startsWith('/beispiel/') && url.pathname !== location.pathname) {
      url.searchParams.set('embedded', '1');
      event.preventDefault();
      location.assign(url);
    } else if (url.pathname === '/' && url.hash === '#abschluss') {
      event.preventDefault();
      parent.postMessage({ type: 'example:navigate', route: 'abschluss' }, location.origin);
    }
  }
  document.addEventListener('click', onClick);
  if (embedded) {
    parent.postMessage({ type: 'example:language', language }, location.origin);
    parent.postMessage({ type: 'example:ready' }, location.origin);
  }
  if (embedded && document.body.classList.contains('explained-page')) {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        parent.postMessage({ type: 'example:close' }, location.origin);
      }
    });
  }
  const onPageHide = () => border?.stop();
  const onPageShow = () => border?.start();
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  return {
    translate(language) {
      document.querySelector('.tiefgang-navigation').outerHTML = navigationMarkup(language, false);
    },
  };
}
