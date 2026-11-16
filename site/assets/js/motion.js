// Motion: scroll reveals (once), header divider, hero depth on fine pointers, and the roast peak.
// Every effect writes only opacity or transform. Nothing here runs under prefers-reduced-motion.
const motionOK = () => matchMedia('(prefers-reduced-motion: no-preference)').matches;

export function mountReveals(root = document) {
  const items = root.querySelectorAll('[data-reveal]:not(.is-in)');
  if (!motionOK() || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  items.forEach((el) => io.observe(el));
}

export function mountHeader() {
  const header = document.querySelector('.header');
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none';
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);
}

/** A scroll-driven loop that only runs while its element is on screen. */
function whileVisible(el, frame) {
  let on = false, queued = false;
  const tick = () => { queued = false; frame(); };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !on) { on = true; addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll, { passive: true }); onScroll(); }
    if (!e.isIntersecting && on) { on = false; removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); frame(); }
  }).observe(el);
}

export function mountHeroDepth() {
  if (!motionOK() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return; // never on touch
  const hero = document.querySelector('.hero');
  const pic = hero && hero.querySelector('.hero__photo picture');
  if (!pic) return;
  pic.classList.add('has-depth');
  whileVisible(hero, () => {
    const y = Math.min(Math.max(window.scrollY, 0), hero.offsetHeight);
    pic.style.transform = `translate3d(0, ${(y * 0.12).toFixed(1)}px, 0)`;
  });
}

export function mountRoast() {
  const section = document.querySelector('[data-roast]');
  if (!section || !motionOK()) return;
  const stage = section.querySelector('.roast__stage');
  const pics = [...section.querySelectorAll('[data-frames] picture')];
  const shown = pics.map(() => -1); // last opacity written per layer, so unchanged layers cost nothing
  const heat = section.querySelector('.roast__heat');
  const stages = [...section.querySelectorAll('[data-stages] li')];
  let last = -1;
  // Eager-load the four frames once the section is near, so the crossfade never waits on the network.
  new IntersectionObserver(([e], io) => {
    if (e.isIntersecting) { section.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }); io.disconnect(); }
  }, { rootMargin: '100% 0px' }).observe(section);
  whileVisible(section, () => {
    const r = section.getBoundingClientRect();
    const stickyTop = parseFloat(getComputedStyle(stage).top) || 0; // the header height
    const travel = r.height - stage.offsetHeight;
    const p = Math.min(Math.max((stickyTop - r.top) / (travel || 1), 0), 1);
    const x = p * 3; // 0..3 across green, light, medium, dark
    // layer 0 (green) is the base; layer i fades in over [i-1, i]. Only the top opaque layer and the one
    // fading over it are painted: everything below a fully opaque layer, or at 0, is hidden.
    const opacity = pics.map((_, i) => (i === 0 ? 1 : Math.min(Math.max(x - (i - 1), 0), 1)));
    const topOpaque = opacity.lastIndexOf(1);
    pics.forEach((pic, i) => {
      const o = i < topOpaque ? 0 : Math.round(opacity[i] * 1000) / 1000;
      if (o === shown[i]) return;
      shown[i] = o;
      pic.style.opacity = String(o);
      pic.style.visibility = o === 0 ? 'hidden' : 'visible';
    });
    heat.style.setProperty('--p', p.toFixed(3));
    const idx = Math.min(3, Math.round(x));
    if (idx !== last) {
      stages.forEach((li, i) => { li.classList.toggle('is-on', i === idx); if (i === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      last = idx;
    }
  });
}
