// Motion: header state, smooth in-page links, and loading the roast path.
// (Scroll reveals were removed on 2026-11-17, the owner's decision D3 in REDESIGN-GUIDE.md.)
// Every effect writes only opacity or transform. Nothing here runs under prefers-reduced-motion.
const motionOK = () => matchMedia('(prefers-reduced-motion: no-preference)').matches;

/** Smooth scrolling for in-page links only. Not page-wide: keyboard focus must scroll instantly so the
 * focused control is on screen at once (LESSONS.md). */
export function mountAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || a.closest('#cart')) return;
    const target = a.getAttribute('href') === '#top' ? document.body : document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto' });
    history.pushState(null, '', a.getAttribute('href'));
  });
}

export function mountHeader() {
  const header = document.querySelector('.header');
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  addEventListener('scroll', update, { passive: true });
  update();
}


/** The roast path: load three.js and the 3D bean only when the section is about a screen and a half away,
 * so the first screen never pays for it. Any failure (no WebGL, no import maps) shows the photo fallback. */
export function mountRoastPath() {
  const section = document.querySelector('[data-roastpath]');
  if (!section) return;
  const fail = () => section.classList.add('roastpath--fallback');
  let started = false;
  const go = () => { if (started) return; started = true; import('./roast3d.js').then((m) => m.mount(section)).catch(fail); };
  // Start in idle time after the visitor's first scroll, so the one-time setup happens while they are still
  // reading the shop, not while the roast section is moving. A visitor who jumps straight there starts it at once.
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 200));
  addEventListener('scroll', idle, { once: true, passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '150% 0px' }).observe(section);
  } else go();
}