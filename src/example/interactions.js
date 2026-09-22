/** Native scrolling with progressive reveals, position feedback and a gentle
 * hardware parallax. Content stays visible if scripts/observers are unavailable. */
export function enhanceExample(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const progress = document.createElement('div'); progress.className = 'reading-progress'; progress.setAttribute('aria-hidden', 'true'); root.prepend(progress);
  const chapters = [...root.querySelectorAll('.chapter')];
  let frame = 0;
  function update() {
    frame = 0;
    const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    progress.style.transform = `scaleX(${Math.min(1, scrollY / range)})`;
    const hardware = root.querySelector('.hardware');
    if (hardware) hardware.style.setProperty('--parallax', reduced.matches ? '0px' : `${Math.min(scrollY * .075, 55)}px`);
    let active = '';
    for (const chapter of chapters) if (chapter.getBoundingClientRect().top < innerHeight * .5) active = chapter.id;
    root.querySelectorAll('.site-head nav a').forEach(link => {
      if (link.hash === `#${active}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
  }
  function scroll() { if (!frame) frame = requestAnimationFrame(update); }
  let observer;
  if ('IntersectionObserver' in window && !reduced.matches) {
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('reveal-pending'); observer.unobserve(entry.target); }
    }), { threshold: .06 });
    chapters.forEach(chapter => { if (chapter.getBoundingClientRect().top > innerHeight) chapter.classList.add('reveal-pending'); observer.observe(chapter); });
  }
  function revealFocus(event) { event.target.closest('.chapter')?.classList.remove('reveal-pending'); }
  root.addEventListener('focusin', revealFocus);
  addEventListener('scroll', scroll, { passive: true }); addEventListener('resize', scroll);
  update();
  return () => { cancelAnimationFrame(frame); observer?.disconnect(); removeEventListener('scroll', scroll); removeEventListener('resize', scroll); root.removeEventListener('focusin', revealFocus); progress.remove(); };
}
