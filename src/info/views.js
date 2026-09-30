import { renderInformationMarkup } from './markup.js';

/** DOM-only view adapter. History, scene state and modal focus ownership stay in the controller. */
export function createInformationViews({ root, getResources, getLanguage }) {
  let activeView = null;
  let backdropView = null;
  let disclosureOrder = [];
  let exploreExit = null;
  const section = view => [...root.querySelectorAll('[data-info-page]')].find(node => node.dataset.infoPage === view);
  const keyed = key => [...root.querySelectorAll('[data-info-focus]')].find(node => node.dataset.infoFocus === key);
  const onToggle = event => {
    const key = event.target.dataset?.infoTerm;
    if (!key) return;
    disclosureOrder = disclosureOrder.filter(item => item !== key);
    if (event.target.open) disclosureOrder.push(key);
  };
  root.addEventListener('toggle', onToggle, true);

  // 30-second reading clock: drives the sigil ring, the station rails and the countdown.
  const PROFILE_SECONDS = 30;
  let clock = 0, clockStart = 0;
  function tickProfile() {
    const sheet = root.querySelector('[data-profile-sheet]');
    if (!sheet) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elapsed = reduced ? PROFILE_SECONDS : Math.min(PROFILE_SECONDS, (performance.now() - clockStart) / 1000);
    sheet.style.setProperty('--profile-progress', (elapsed / PROFILE_SECONDS).toFixed(4));
    sheet.querySelectorAll('[data-profile-station]').forEach(station => {
      const index = Number(station.dataset.profileStation), span = PROFILE_SECONDS / 4;
      const local = Math.max(0, Math.min(1, (elapsed - index * span) / span));
      station.style.setProperty('--station-progress', local.toFixed(4));
      station.classList.toggle('is-reached', elapsed >= index * span);
    });
    const left = Math.ceil(PROFILE_SECONDS - elapsed);
    const value = sheet.querySelector('.info-time__value');
    const complete = elapsed >= PROFILE_SECONDS;
    if (value) value.textContent = complete ? sheet.dataset.doneLabel : `00:${String(left).padStart(2, '0')}`;
    sheet.classList.toggle('is-complete', complete);
    if (complete) stopProfileClock();
  }
  function startProfileClock() {
    stopProfileClock();
    clockStart = performance.now();
    tickProfile();
    if (!root.querySelector('[data-profile-sheet].is-complete')) clock = window.setInterval(tickProfile, 250);
  }
  function stopProfileClock() { window.clearInterval(clock); clock = 0; }

  function pauseMedia() {
    root.querySelectorAll('video').forEach(video => video.pause());
  }

  function applyVisibility() {
    root.hidden = !activeView;
    root.dataset.view = activeView || '';
    root.querySelectorAll('[data-info-page]').forEach(node => {
      const isActive = node.dataset.infoPage === activeView;
      const isBackdrop = activeView === 'kurzprofil' && node.dataset.infoPage === backdropView;
      node.hidden = !isActive && !isBackdrop;
      node.classList.toggle('info-page--behind', isBackdrop);
      node.inert = isBackdrop;
      if (isBackdrop) node.setAttribute('aria-hidden', 'true');
      else node.removeAttribute('aria-hidden');
      if (node.dataset.infoPage === 'kurzprofil' && isActive) {
        node.setAttribute('role', 'dialog');
        node.setAttribute('aria-modal', 'true');
      } else {
        node.removeAttribute('role');
        node.removeAttribute('aria-modal');
      }
    });
  }

  function show(view) {
    cancelExploreExit();
    if (view !== activeView) pauseMedia();
    if (view === 'kurzprofil' && activeView !== 'kurzprofil') backdropView = activeView;
    if (view !== 'kurzprofil') backdropView = null;
    const entering = view === 'kurzprofil' && activeView !== 'kurzprofil';
    activeView = view;
    applyVisibility();
    if (entering) startProfileClock();
    else if (view !== 'kurzprofil') stopProfileClock();
  }

  function translate() {
    cancelExploreExit();
    const focusKey = root.contains(document.activeElement) ? document.activeElement.dataset.infoFocus : null;
    const entryFocused = root.contains(document.activeElement) && document.activeElement.hasAttribute('data-info-entry');
    const openTerms = [...root.querySelectorAll('details[open]')].map(node => node.dataset.infoTerm);
    const scroll = [...root.querySelectorAll('[data-info-page], .info-profile__sheet')].map(node => ({ key: node.dataset.infoPage || 'sheet', top: node.scrollTop, left: node.scrollLeft }));
    const rootScroll = root.scrollTop;
    pauseMedia();
    root.innerHTML = renderInformationMarkup(getLanguage(), getResources());
    if (activeView === 'kurzprofil') tickProfile(); // keep the clock position across languages
    openTerms.forEach(key => root.querySelector(`[data-info-term="${key}"]`)?.setAttribute('open', ''));
    applyVisibility();
    scroll.forEach(({ key, top, left }) => {
      const node = key === 'sheet' ? root.querySelector('.info-profile__sheet') : section(key);
      node?.scrollTo({ top, left, behavior: 'instant' });
    });
    root.scrollTop = rootScroll;
    if (focusKey) keyed(focusKey)?.focus({ preventScroll: true });
    else if (entryFocused) focusEntry(activeView);
  }

  function closeDisclosure() {
    const open = [...(section(activeView)?.querySelectorAll('details[open]') || [])];
    const last = open.find(node => node.dataset.infoTerm === disclosureOrder.at(-1)) || open.at(-1);
    if (!last) return false;
    last.open = false;
    last.querySelector('summary')?.focus({ preventScroll: true });
    return true;
  }

  function focusEntry(view) {
    section(view)?.querySelector('[data-info-entry]')?.focus({ preventScroll: true });
  }

  function cancelExploreExit() {
    const exit = exploreExit;
    if (!exit) return;
    exploreExit = null;
    exit.cancelled = true;
    exit.animations.forEach(animation => animation.cancel());
    exit.overlay?.remove();
    exit.page.inert = exit.wasInert;
    delete root.dataset.infoExiting;
    delete document.documentElement.dataset.entryPhase;
  }

  async function animateExploreExit() {
    cancelExploreExit();
    const page = section('start');
    if (activeView !== 'start' || !page) return Promise.resolve(false);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !page.animate) return Promise.resolve(true);
    const exit = { page, wasInert: page.inert, animations: [], cancelled: false };
    exploreExit = exit;
    page.inert = true;
    root.dataset.infoExiting = 'explore';
    const html = document.documentElement;
    html.dataset.entryPhase = 'fade';
    const current = () => exploreExit === exit && !exit.cancelled;
    function animate(node, keyframes, duration, delay = 0) {
      if (!node) return Promise.resolve(true);
      const animation = node.animate(keyframes, { duration, delay, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards' });
      exit.animations.push(animation);
      return animation.finished.then(() => true, () => false);
    }
    // Finish an in-progress entrance without holding the Explore action hostage.
    page.querySelectorAll('.info-identity, .info-name__glyph, .info-role, .info-identity__summary').forEach(node => {
      node.getAnimations().forEach(animation => animation.finish());
    });
    const fadeNodes = [...page.querySelectorAll('.info-start__copy > :not(.info-identity), .info-topline, .info-start__footer')];
    const faded = await Promise.all(fadeNodes.map(node => animate(node, [
      { opacity: getComputedStyle(node).opacity, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(8px)' },
    ], 850)));
    if (!current() || !faded.every(Boolean)) return false;

    const sourceSigil = page.querySelector('.info-identity__sigil');
    function spin(sigil, from, to, duration, easing) {
      return Promise.all(['outer', 'mid'].map((key, index) => {
        const sign = index ? 1 : -1;
        const animation = sigil.querySelector(`.sigil__${key}`).animate([
          { transform: `rotate(${sign * from}deg)` }, { transform: `rotate(${sign * to}deg)` },
        ], { duration, easing, fill: 'forwards' });
        exit.animations.push(animation);
        return animation.finished.then(() => true, () => false);
      }));
    }
    html.dataset.entryPhase = 'spinup';
    // A quadratic angle curve accelerates from rest to 90deg/s. The next
    // constant-speed segment starts at exactly the same angle and velocity.
    const accelerated = await spin(sourceSigil, 0, 45, 1000, 'cubic-bezier(.333333,0,.666667,.333333)');
    if (!current() || !accelerated.every(Boolean)) return false;

    const brand = document.querySelector('.head__brand');
    const name = brand?.querySelector('.head__name');
    if (!name) return true;
    const overlay = document.createElement('div');
    overlay.className = 'info-identity-flight';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.append(overlay);
    exit.overlay = overlay;
    const flights = [];
    let flyingSigil = null;
    const settleRotation = target => {
      for (const key of ['outer', 'mid']) {
        const to = target?.querySelector(`.sigil__${key}`)?.getAnimations().find(animation => animation.animationName === `sigil-orbit-${key}`);
        if (to) to.currentTime = 170 / 360 * 15400;
      }
    };
    const nameStyle = getComputedStyle(name);
    const sourceName = page.querySelector('.info-name');
    const sourceStyle = getComputedStyle(sourceName);
    const scale = parseFloat(nameStyle.fontSize) / parseFloat(sourceStyle.fontSize);
    // Measure letters once. Individual transforms preserve a wrapped mobile
    // name as it gathers into the compact header without reflowing each frame.
    const targets = [];
    const walker = document.createTreeWalker(name, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode;
      [...text.textContent].forEach((letter, i) => {
        if (/\s/.test(letter)) return;
        const range = document.createRange();
        range.setStart(text, i); range.setEnd(text, i + 1);
        targets.push(range.getBoundingClientRect());
      });
    }
    function fly(source, target, { glyphTarget = null, word = false } = {}) {
      if (!source || !target) return;
      const start = source.getBoundingClientRect();
      const end = glyphTarget || target.getBoundingClientRect();
      const clone = source.cloneNode(true);
      clone.removeAttribute('id'); clone.removeAttribute('tabindex');
      clone.classList.add('info-identity-flight__part');
      const computed = getComputedStyle(source);
      Object.assign(clone.style, {
        left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px`,
        margin: '0', font: computed.font, letterSpacing: computed.letterSpacing,
        textTransform: computed.textTransform, color: computed.color,
        lineHeight: computed.lineHeight,
      });
      let moving = clone;
      if (source.matches('svg')) {
        moving = document.createElement('div');
        moving.className = 'info-identity-flight__part';
        Object.assign(moving.style, { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px` });
        clone.classList.remove('info-identity-flight__part');
        clone.classList.add('info-identity-flight__sigil');
        Object.assign(clone.style, { left: '50%', top: '50%', width: computed.width, height: computed.height });
        moving.append(clone);
      }
      overlay.append(moving);
      if (source.matches('svg')) {
        flyingSigil = clone;
        flights.push(spin(clone, 45, 153, 1200, 'linear').then(results => results.every(Boolean)));
      }
      const textScale = word ? parseFloat(getComputedStyle(target).fontSize) / parseFloat(computed.fontSize) : scale;
      const sourceRange = document.createRange(); sourceRange.selectNodeContents(source);
      const sourceText = glyphTarget ? sourceRange.getBoundingClientRect() : null;
      const sx = glyphTarget ? word ? end.width / sourceText.width : scale : end.width / start.width;
      const sy = glyphTarget ? textScale : end.height / start.height;
      const dx = end.left - start.left;
      const dy = end.top - start.top - (sourceText ? (sourceText.top - start.top) * sy : 0);
      flights.push(animate(moving, [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: 1 },
      ], 1200));
    }
    page.querySelectorAll('.info-name__glyph').forEach((glyph, i) => {
      if (targets[i]) fly(glyph, name, { glyphTarget: targets[i] });
    });
    // Move words rather than fading whole paragraphs. This preserves every
    // shared fact while accommodating different line wraps and header sizing.
    for (const [sourceSelector, targetSelector] of [['.info-role', '.head__role'], ['.info-identity__summary', '.head__summary']]) {
      const target = brand.querySelector(targetSelector);
      if (!target) continue;
      const nodes = [];
      const textWalker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let offset = 0;
      while (textWalker.nextNode()) {
        const node = textWalker.currentNode;
        nodes.push({ node, offset, end: offset + node.textContent.length });
        offset += node.textContent.length;
      }
      const matches = [...target.textContent.matchAll(/\S+/g)];
      page.querySelectorAll(`${sourceSelector} .info-identity__word`).forEach((word, i) => {
        const match = matches[i];
        if (!match) return;
        const first = nodes.find(item => item.end > match.index);
        const last = nodes.find(item => item.end >= match.index + match[0].length);
        const range = document.createRange();
        range.setStart(first.node, match.index - first.offset);
        range.setEnd(last.node, match.index + match[0].length - last.offset);
        fly(word, target, { glyphTarget: range.getBoundingClientRect(), word: true });
      });
    }
    fly(page.querySelector('.info-identity__sigil'), brand.querySelector('.head__sigil'));
    html.dataset.entryPhase = 'warp';
    flights.push(animate(page, [{ opacity: 1 }, { opacity: 0 }], 1000));
    const arrived = await Promise.all(flights);
    if (!current() || !arrived.every(Boolean)) return false;
    // At the destination the rotation eases back to the header's 15.4s orbit.
    // Angle and angular velocity match on both sides of this short settling beat.
    const settled = await spin(flyingSigil, 153, 170, 300, 'cubic-bezier(.333333,.529412,.666667,.86249)');
    if (!current() || !settled.every(Boolean)) return false;
    html.dataset.entryPhase = 'camera';
    settleRotation(brand.querySelector('.head__sigil'));
    overlay.remove();
    return current();
  }

  return {
    show, translate, pauseMedia, closeDisclosure, focusEntry, animateExploreExit, cancelExploreExit,
    get activeSection() { return section(activeView); },
    get activeElement() { return section(activeView); },
    dispose() { stopProfileClock(); cancelExploreExit(); pauseMedia(); root.removeEventListener('toggle', onToggle, true); },
  };
}
