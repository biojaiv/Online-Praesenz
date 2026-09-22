import { getLanguage } from '../i18n.js';

import { IHK_PAGE } from '../data/ihkMedia.js';
const PAGE_COUNT = IHK_PAGE.count;
export function ihkProjectionSource(language = getLanguage()) {
  return {
    url: `/ihk/IHK_Projection_${language.toUpperCase()}.webp`,
    pageCount: PAGE_COUNT,
    pageAspect: IHK_PAGE.width / IHK_PAGE.height,
    webTransform: false,
  };
}
export function getIhkAnchor(section) {
  const index = ['overview', 'server', 'uem', 'clients', 'migration'].indexOf(section);
  return (index > 0 ? index + 1 : 0) / PAGE_COUNT;
}
