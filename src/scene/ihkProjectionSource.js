import { getLanguage } from '../i18n.js';

const PAGE_COUNT = 5;
export function ihkProjectionSource(language = getLanguage()) {
  return {
    url: `/ihk/IHK_Projection_${language.toUpperCase()}.webp`,
    pageCount: PAGE_COUNT,
    pageAspect: 1258 / 1920,
    webTransform: false,
  };
}
export function getIhkAnchor(section) {
  const index = ['overview', 'server', 'uem', 'clients', 'migration'].indexOf(section);
  return Math.max(0, index) / PAGE_COUNT;
}
