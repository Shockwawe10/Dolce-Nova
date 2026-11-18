// The coffee carousel (Canyon's bestsellers row): a native horizontal scroller, so touch, trackpad and
// keyboard (Tab through the slide links) all work without script. Script adds the arrows and a draggable
// scrollbar under the row. Writes only a transform (the line) and the buttons' disabled state.
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
      const frac = track.scrollWidth ? Math.min(1, track.clientWidth / track.scrollWidth) : 1;
      const at = max > 0 ? track.scrollLeft / max : 0;
      bar.style.setProperty('--thumb', `${(frac * 100).toFixed(2)}%`);
      bar.style.transform = `translateX(${((at * (1 - frac)) / frac * 100).toFixed(2)}%)`;
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
    // the scrollbar under the row (the owner, 2026-11-18: "scroll this scroll bar manually by dragging it ... not
    // while scrolling the page"): grab the thumb and drag it, or press the line to jump there. The wheel scrolls the
    // page; the bags stay plain links; touch keeps its native swipe.
    const rail = root.querySelector('.carousel__progress');
    const thumb = rail.querySelector('span');
    rail.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const r = rail.getBoundingClientRect(), t = thumb.getBoundingClientRect();
      const span = r.width - t.width, max = track.scrollWidth - track.clientWidth;
      if (span <= 0 || max <= 0) return;
      // pressed on the thumb: keep the grab point; on the line: centre the thumb under the pointer
      const grab = e.clientX >= t.left && e.clientX <= t.right ? e.clientX - t.left : t.width / 2;
      const seek = (x) => { track.scrollLeft = Math.min(1, Math.max(0, (x - r.left - grab) / span)) * max; };
      seek(e.clientX);
      rail.setPointerCapture(e.pointerId);
      root.classList.add('is-seeking');
      const move = (ev) => seek(ev.clientX);
      const up = () => {
        root.classList.remove('is-seeking');
        rail.removeEventListener('pointermove', move); rail.removeEventListener('pointerup', up); rail.removeEventListener('pointercancel', up);
      };
      rail.addEventListener('pointermove', move);
      rail.addEventListener('pointerup', up);
      rail.addEventListener('pointercancel', up);
    });
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue, { passive: true });
    update();
  });
}
