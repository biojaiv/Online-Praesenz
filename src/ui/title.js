import gsap from 'gsap';

/**
 * Buchstabenweise Durchleuchtung des Rollentitels beim Seitenaufruf.
 *
 * Der Text wird in einzelne Spans zerlegt, ein orangefarbener Lichtpunkt
 * wandert einmal von links nach rechts hindurch. Jeder Buchstabe hellt kurz
 * auf und faellt danach in seinen ruhigen Grundton zurueck.
 *
 * Der Originaltext bleibt fuer Screenreader als aria-label erhalten,
 * die Spans selbst sind aus dem Baum genommen.
 */
export function igniteTitle(el, { delay = 0.9 } = {}) {
  if (!el || el.dataset.split === 'done') return null;

  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.dataset.split = 'done';
  el.textContent = '';

  const letters = [];
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'glyph';
    span.setAttribute('aria-hidden', 'true');
    if (ch === ' ') {
      span.classList.add('glyph--space');
      span.innerHTML = '&nbsp;';
    } else {
      span.textContent = ch;
      letters.push(span);
    }
    el.appendChild(span);
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  const tl = gsap.timeline({ delay });

  tl.to(letters, {
    keyframes: [
      {
        color: '#ffc879',
        textShadow: '0 0 10px rgba(240,160,60,0.85), 0 0 22px rgba(240,160,60,0.35)',
        duration: 0.16,
        ease: 'power2.out',
      },
      {
        color: '',
        textShadow: '0 0 0 rgba(240,160,60,0)',
        duration: 0.62,
        ease: 'power2.inOut',
      },
    ],
    stagger: { each: 0.036 },
  });

  // Nachhall: die Zeile atmet einmal als Ganzes
  tl.fromTo(el,
    { textShadow: '0 0 0 rgba(240,160,60,0)' },
    { textShadow: '0 0 18px rgba(240,160,60,0.28)', duration: 0.5, ease: 'power2.out' },
    '-=0.5'
  ).to(el, { textShadow: '0 0 0 rgba(240,160,60,0)', duration: 1.4, ease: 'power2.inOut' });

  return tl;
}
