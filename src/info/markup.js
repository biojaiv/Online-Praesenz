import { getInformationContent } from './content.js';
import { translateForLanguage } from '../i18n.js';
import { renderProjectSummary } from './projectSummary.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function renderInformationMarkup(language, resources) {
  const c = getInformationContent(language);
  const lang = language === 'de' ? 'de' : 'en';
  const r = resources;
  const identityWords = text => text.split(' ').map(word => `<span class="info-identity__word">${esc(word)}</span>`).join(' ');
  const fallbackHref = target => {
    if (target === 'lebenslauf') return r.cvUrl;
    if (target === 'abschluss' && r.reportUrl) return r.reportUrl;
    if (target === 'projekte' || target === 'projekte/webseiten') return '/beispiel/';
    if (target === 'projekte/systemintegration') return '/systemintegration/';
    return `#${target}`;
  };
  const route = (target, label, key, className = 'info-link') => `<a class="${className}" href="${esc(fallbackHref(target))}" data-info-route="${target}" data-info-focus="${key}">${esc(label)}</a>`;
  const arrow = label => `${label} →`;
  const cv = (label, key, className = 'info-link') => `<a class="${className}" href="${esc(r.cvUrl)}" download="${esc(r.cvDownload || '')}" data-info-focus="${key}">${esc(label)}</a>`;
  const languages = prefix => `<nav class="info-language" aria-label="${c.language}"><a href="?lang=de" lang="de" hreflang="de" data-info-language="de" data-info-focus="${prefix}-lang-de" ${lang === 'de' ? 'aria-current="true"' : ''}>DE</a><span aria-hidden="true">/</span><a href="?lang=en" lang="en" hreflang="en" data-info-language="en" data-info-focus="${prefix}-lang-en" ${lang === 'en' ? 'aria-current="true"' : ''}>EN</a></nav>`;
  const inspect = prefix => `<button class="info-link info-inspect" type="button" data-info-inspect data-info-focus="${prefix}-inspect">${esc(c.inspect)}</button>`;
  const availability = `<span class="info-availability"><i aria-hidden="true"></i>${esc(c.available)}<span aria-hidden="true"> · </span>${esc(r.location)}<span aria-hidden="true"> · </span>${esc(c.remote)}</span>`;
  const footer = prefix => `<footer class="info-footer">${route('home', c.home, `${prefix}-home`)}${inspect(prefix)}</footer>`;
  const terms = c.terms.map(([id, name, title, text]) => `<details class="info-term" data-info-term="${id}"><summary data-info-focus="term-${id}">${esc(name)}<span aria-hidden="true">+</span></summary><div class="info-term__explanation"><strong>${esc(title)}</strong><p>${esc(text)}</p></div></details>`).join('');

  return `
    <section class="info-page info-start" id="start" data-info-page="start" aria-labelledby="info-start-title" lang="${lang}">
      <div class="info-topline"><span class="info-wordmark">VL <span aria-hidden="true">/</span> PORTFOLIO</span>${languages('start')}</div>
      <div class="info-start__copy">
        <p class="info-eyebrow">${esc(c.discipline)}</p>
        <div class="info-identity">
          <svg class="info-identity__sigil" viewBox="0 0 34 34" aria-hidden="true" focusable="false"><rect class="sigil__outer" x=".5" y=".5" width="33" height="33"/><rect class="sigil__mid" x="7.5" y="7.5" width="19" height="19"/><rect class="sigil__core" x="13.6" y="13.6" width="6.8" height="6.8"/></svg>
          <h1 class="info-name" id="info-start-title" tabindex="-1" data-info-entry aria-label="${esc(r.name)}">${r.name.split(' ').map((word, wi) => `<span class="info-name__word" aria-hidden="true">${[...word].map((letter, i) => `<span class="info-name__glyph" style="--glyph-delay:${(wi ? r.name.indexOf(word) : 0) * 45 + i * 45}ms">${esc(letter)}</span>`).join('')}</span>`).join(' ')}</h1>
          <p class="info-role">${identityWords(translateForLanguage(lang, 'brand.role'))}</p>
          <p class="info-identity__summary">${identityWords(translateForLanguage(lang, 'profile.summary'))}</p>
        </div>
        <p class="info-introduction">${esc(c.introduction)}</p>
        <p class="info-status">${availability}</p>
        <div class="info-actions">${route('kurzprofil', c.profile, 'start-profile', 'info-button info-button--primary')}${route('home', arrow(c.explore), 'start-explore', 'info-button')}</div>
        <div class="info-secondary">${cv(`${c.cvPdf} ↓`, 'start-cv')}${route('kontakt', arrow(c.contact), 'start-contact')}</div>
        <p class="info-scene-status" data-info-scene-status role="status">${esc(c.sceneUnavailable)}</p>
      </div>
      <footer class="info-footer info-start__footer"><span>01 — 03</span>${inspect('start')}</footer>
    </section>

    <section class="info-page info-profile" id="kurzprofil" data-info-page="kurzprofil" aria-labelledby="info-profile-title" lang="${lang}">
      <div class="info-profile__sheet">
        <div class="info-profile__top"><p class="info-eyebrow">${esc(c.profileKicker)} <span class="info-time">30 ${lang === 'de' ? 'SEK' : 'SEC'}</span></p><div class="info-profile__tools">${languages('profile')}<button class="info-close" type="button" data-info-close data-info-focus="profile-close" aria-label="${esc(c.close)}"><span aria-hidden="true">×</span> <span>${esc(c.close)}</span></button></div></div>
        <header class="info-profile__identity"><div class="info-monogram" aria-hidden="true">VL</div><div><h2 id="info-profile-title" tabindex="-1" data-info-entry>${esc(r.name)}</h2><p class="info-role">${esc(c.role)}</p><p class="info-meta">${esc(r.location)} · ${esc(c.remote)} · ${esc(c.available)}</p></div></header>
        <div class="info-profile__fields">${c.profileFields.map(([heading, text], i) => `<section class="info-profile__field"><h3><span aria-hidden="true">0${i + 1}</span>${esc(heading)}</h3><p>${esc(text)}</p><p class="info-profile__note">[ ${c.profileNotes[i].map(esc).join(' • ')} ]</p></section>`).join('')}</div>
        <div class="info-actions info-profile__actions">${route('projekt/abschluss', arrow(c.viewProject), 'profile-project', 'info-button info-button--primary')}${route('lebenslauf', c.openCv, 'profile-cv', 'info-button')}${route('kontakt', c.getInTouch, 'profile-contact', 'info-button')}</div>
      </div>
    </section>

    <section class="info-page info-project" id="projekt/abschluss" data-info-page="projekt/abschluss" aria-labelledby="info-project-title" lang="${lang}">
      <header class="info-project__header"><div><p class="info-eyebrow">01 · ${esc(c.finalProject)}</p><h2 id="info-project-title" tabindex="-1" data-info-entry>${esc(c.projectTitle)}</h2><p class="info-project__location">${esc(c.projectLocation)}</p></div><div class="info-project__availability">${languages('project')}</div></header>
      <div class="info-project__layout"><div class="info-project__body">${renderProjectSummary(lang)}
      <section class="info-terms" aria-labelledby="info-terms-title"><div class="info-terms__heading"><h3 id="info-terms-title">${esc(c.termsHeading)}</h3><p>${esc(c.termsHint)}</p></div><div class="info-terms__list">${terms}</div></section></div>
      <aside class="info-media" aria-label="${esc(c.documentation)}"><section><h3 id="info-film-title">${esc(c.film)}</h3><video controls playsinline preload="none" src="${esc(r.filmUrl)}" poster="${esc(r.posterUrl)}" aria-labelledby="info-film-title" data-info-focus="project-film"><a href="${esc(r.filmUrl)}" download>${esc(c.filmFallback)}</a></video><p>${esc(c.filmHint)}</p></section><section class="info-media__documents"><h3>${esc(c.documentation)}</h3>${route('abschluss', arrow(c.deepDive), 'project-detailed')}${r.reportUrl ? `<a class="info-link" href="${esc(r.reportUrl)}" download data-info-focus="project-report">${esc(c.report)} ↓</a>` : ''}</section><section class="info-media__more"><h3>${esc(c.moreProjects)}</h3>${route('projekte/webseiten', arrow(c.websiteProjects), 'project-websites')}${route('projekte/systemintegration', arrow(c.recovery), 'project-recovery')}</section></aside></div>
      ${footer('project')}
    </section>

    <section class="info-page info-contact" id="kontakt" data-info-page="kontakt" aria-labelledby="info-contact-title" lang="${lang}">
      <div class="info-topline">${route('start', esc(r.name), 'contact-start', 'info-wordmark')}${languages('contact')}</div>
      <div class="info-contact__content"><div class="info-contact__signature" aria-hidden="true"><span>VL</span><small>VLADIMIR<br>LEICHT</small></div><div class="info-contact__copy"><p class="info-eyebrow">${esc(c.contactKicker)}</p><h2 id="info-contact-title" tabindex="-1" data-info-entry>${esc(c.quote)}</h2><p class="info-contact__ambition">${esc(c.ambition)}</p><div class="info-actions">${cv(c.downloadCv, 'contact-cv', 'info-button info-button--primary')}<a class="info-button" href="mailto:${esc(r.email)}" data-info-focus="contact-mail">${esc(c.emailAction)} ↗</a></div><p class="info-meta">${esc(r.location)} · ${esc(c.remote)} · ${esc(c.available)}</p><div class="info-contact__address"><span>${esc(c.addressLabel)}</span><a href="mailto:${esc(r.email)}" data-info-focus="contact-address">${esc(r.email)}</a></div></div></div>
      ${footer('contact')}
    </section>`;
}
