/** A single brief signal ripple on deliberate input, never continuous flashing. */
export function createControlDistortion() {
  const selector = '.nav button, .nav a, .foot button, .foot a, .foot summary, .project-choice, .projects-browser button, [data-example-back]';
  const timers = new Map();
  function pulse(event) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const control = event.target.closest(selector);
    if (!control || control.contains(event.relatedTarget) || timers.has(control)) return;
    control.classList.add('control-ripple');
    function finish() {
      clearTimeout(timers.get(control)?.timer);
      control.removeEventListener('animationend', ended);
      control.classList.remove('control-ripple'); timers.delete(control);
    }
    function ended(event) { if (event.target === control && event.animationName === 'control-signal') finish(); }
    control.addEventListener('animationend', ended);
    // Let the browser finish the visible animation, including a delayed first paint.
    timers.set(control, { timer: setTimeout(finish, 2500), finish });
  }
  document.addEventListener('pointerover', pulse);
  document.addEventListener('focusin', pulse);
  return () => { document.removeEventListener('pointerover', pulse); document.removeEventListener('focusin', pulse); for (const record of [...timers.values()]) record.finish(); timers.clear(); };
}
