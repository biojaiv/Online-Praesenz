import cv from './cv.de.json' with { type: 'json' };
import { IHK_FILMS, IHK_POSTERS, IHK_REPORTS } from './ihkMedia.js';

/** One source for profile identity and document links in every presentation. */
export function profileResources(language = 'en') {
  const lang = language === 'de' ? 'de' : 'en';
  return {
    name: cv.name, email: cv.persoenlich.kontakt, location: cv.persoenlich.wohnort,
    cvUrl: `/cv/CV_${lang.toUpperCase()}.pdf`,
    cvDownload: `Vladimir_Leicht_CV_${lang.toUpperCase()}.pdf`,
    filmUrl: IHK_FILMS[lang], posterUrl: IHK_POSTERS[lang], reportUrl: IHK_REPORTS[lang],
  };
}
