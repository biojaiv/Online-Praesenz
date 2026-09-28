import { metadataFor } from '../data/pageMetadata.js';

export function updatePageMetadata(language) {
  const data = metadataFor(location.pathname, language);
  if (!data) return;
  document.title = data.title;
  const values = {
    'meta[name="description"]': data.description,
    'meta[property="og:title"]': data.title,
    'meta[property="og:description"]': data.description,
    'meta[property="og:locale"]': language === 'de' ? 'de_DE' : 'en_US',
    'meta[name="twitter:title"]': data.title,
    'meta[name="twitter:description"]': data.description,
  };
  for (const [selector, value] of Object.entries(values)) document.querySelector(selector)?.setAttribute('content', value);
}
