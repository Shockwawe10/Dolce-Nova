// The coffee carousel (Canyon's bestsellers row): a native horizontal scroller, so touch, trackpad and
// keyboard (Tab through the slide links) all work without script. Script adds the arrows, the progress line
// and mouse-wheel scrolling while the pointer is over the row. Writes only a transform (the line) and the buttons' disabled state.
const motionOK = () => matchMedia('(prefers-reduced-motion: no-preference)').matches;

export function mountCarousels() {
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const track = root.querySelector('.carousel__track');
    const bar = root.querySelector('.carousel__progress span');
    const prev = root.querySelector('[data-prev]');
    const next = root.querySelector('[data-next]');
    let queued = false;

    const update = () => {
      queued = false;
      const max = track.scrollWidth - track.clientWidth;
      const seen = track.scrollWidth ? (track.scrollLeft + track.clientWidth) / track.scrollWidth : 1;
      bar.style.transform = `scaleX(${Math.min(1, seen).toFixed(4)})`;
      prev.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= max - 1;
      root.classList.toggle('is-static', max <= 1);
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };

    // one slide per press, landing on a slide's start even after free scrolling with the wheel
    const slides = [...track.querySelectorAll('.slide')];
    const go = (dir) => {
      const x = track.scrollLeft, base = slides[0].offsetLeft;
      const starts = slides.map((el) => el.offsetLeft - base);
      const to = dir > 0 ? starts.find((p) => p > x + 2) : [...starts].reverse().find((p) => p < x - 2);
      track.scrollTo({ left: to ?? (dir > 0 ? track.scrollWidth : 0), behavior: motionOK() ? 'smooth' : 'auto' });
    };
    // hover and scroll (the owner, 2026-11-18): a mouse wheel moves the row sideways while the pointer is over it;
    // at either end the wheel goes back to the page, so nobody is trapped. Sideways trackpad swipes stay native.
    track.addEventListener('wheel', (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * track.clientWidth : e.deltaY;
      const max = track.scrollWidth - track.clientWidth;
      if ((dy > 0 && track.scrollLeft >= max - 1) || (dy < 0 && track.scrollLeft <= 1)) return;
      e.preventDefault();
      track.scrollLeft = Math.max(0, Math.min(max, track.scrollLeft + dy));
    }, { passive: false });
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue, { passive: true });
    update();
  });
}
