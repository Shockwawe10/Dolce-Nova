// The roast slider without the 3D: the temperature readout, the phase note, each batch's status, and the marks.
// Runs on its own (no three.js), so the words work even where WebGL does not; the 3D scene listens for
// 'roast:input' on the section and draws the beans.
import { state } from './roast-state.js';

export function mountRoastUI() {
  const root = document.querySelector('[data-roastpath]');
  if (!root) return;
  const range = root.querySelector('#roast-temp');
  const out = root.querySelector('[data-roast-temp]');
  const note = root.querySelector('[data-roast-note]');
  const statuses = [...root.querySelectorAll('[data-bean-status]')];
  let lastPhase = '';

  const update = () => {
    const u = Number(range.value);
    const st = state(u);
    const t = Math.round(st.temp);
    out.textContent = `${t} °C`;
    range.setAttribute('aria-valuetext', `${t} °C, ${st.phase.name.toLowerCase()}`);
    range.style.setProperty('--fill', `${u}%`);
    if (st.phase.name !== lastPhase) {            // the live region speaks only when the phase changes
      note.innerHTML = `<strong>${st.phase.name}.</strong> ${st.phase.note}`;
      lastPhase = st.phase.name;
    }
    statuses.forEach((el, k) => {
      if (k === 0) return;
      el.textContent = st.done[k] ? 'Done' : t > 20 ? 'Roasting' : 'Waiting';
      el.classList.toggle('is-done', st.done[k]);
    });
    root.dispatchEvent(new CustomEvent('roast:input', { detail: { u } }));
  };

  range.addEventListener('input', update);
  root.querySelectorAll('[data-roast-tick]').forEach((b) => b.addEventListener('click', () => {
    range.value = b.dataset.roastTick;
    update();
  }));
  update();
}
