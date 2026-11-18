// The coffee carousel (Canyon's bestsellers row): a native horizontal scroller, so touch, trackpad and
// keyboard (Tab through the slide links) all work without script. Script adds the arrows, a draggable
// scrollbar under the row, and dragging the row itself with the mouse. Writes only a transform (the line) and the buttons' disabled state.
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
    // drag with the mouse (the owner, 2026-11-18: "scrolled with the mouse pointer ... not with the scroll itself"):
    // grab the row and pull it, or drag the line under it like a scrollbar. The wheel scrolls the page as usual;
    // touch keeps its native swipe. A drag never opens a coffee; a plain click still does.
    let drag = null, swallowClick = false;
    track.addEventListener('dragstart', (e) => e.preventDefault());   // links and images would start a native drag
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, id: e.pointerId, moved: false };
    });
    addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; root.classList.add('is-dragging'); }
      if (drag.moved) track.scrollLeft = drag.left - dx;
    });
    const endDrag = () => {
      if (drag && drag.moved) swallowClick = true;
      drag = null;
      root.classList.remove('is-dragging');
    };
    addEventListener('pointerup', endDrag);
    addEventListener('pointercancel', endDrag);
    track.addEventListener('click', (e) => { if (swallowClick) { e.preventDefault(); e.stopPropagation(); swallowClick = false; } }, true);
    // the scrollbar: press anywhere to centre the thumb there, then drag
    const rail = root.querySelector('.carousel__progress');
    const seek = (clientX) => {
      const r = rail.getBoundingClientRect(), frac = track.clientWidth / track.scrollWidth;
      const t = Math.min(1, Math.max(0, ((clientX - r.left) / r.width - frac / 2) / (1 - frac || 1)));
      track.scrollLeft = t * (track.scrollWidth - track.clientWidth);
    };
    rail.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      rail.setPointerCapture(e.pointerId);
      seek(e.clientX);
      const move = (ev) => seek(ev.clientX);
      const up = () => { rail.removeEventListener('pointermove', move); rail.removeEventListener('pointerup', up); rail.removeEventListener('pointercancel', up); };
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
