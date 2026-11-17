// The coffee carousel (Canyon's bestsellers row): a native horizontal scroller, so touch, trackpad and
// keyboard (Tab through the slide links) all work without script. Script adds the arrow buttons and the
// progress line under it. Writes only a transform (the line) and the buttons' disabled state.
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

    // one slide per press: the distance between two slide starts, so the next slide lands on the edge line
    const step = () => {
      const s = track.querySelectorAll('.slide');
      return s.length > 1 ? s[1].offsetLeft - s[0].offsetLeft : track.clientWidth;
    };
    const go = (dir) => track.scrollBy({ left: dir * step(), behavior: motionOK() ? 'smooth' : 'auto' });
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue, { passive: true });
    update();
  });
}
