// The shop list: one row per coffee; the open row shows its grind preview, grind and size choices, and Add.
import { add, formatEUR } from './cart.js';
import { getCart, setCart, picture } from './store.js';

const GRIND_IMG = { espresso: 'grind-espresso', filter: 'grind-filter' };
const PREVIEW_SIZES = '(min-width: 1024px) 480px, 92vw';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function row(p, catalog, manifest, open) {
  const from = Math.min(...Object.values(p.prices));
  const grinds = Object.entries(catalog.grinds);
  const sizes = Object.entries(catalog.sizes).filter(([k]) => k in p.prices);
  const img = (g) => (g === 'whole' ? p.texture : GRIND_IMG[g]);
  return `
  <article class="coffee" data-id="${p.id}">
    <div class="coffee__row">
      <span class="coffee__thumb" aria-hidden="true">${picture(manifest, p.texture, { sizes: '(min-width: 1024px) 96px, 64px', alt: '' })}</span>
      <h3 class="coffee__name"><button class="coffee__toggle" type="button" id="t-${p.id}" aria-expanded="${open}" aria-controls="p-${p.id}">${esc(p.name)}</button></h3>
      <p class="coffee__meta"><span class="tag">${esc(p.roast)} roast</span> ${esc(p.origin)} · ${esc(p.process)}</p>
      <p class="coffee__price">from ${formatEUR(from)}</p>
      <span class="coffee__icon" aria-hidden="true"></span>
    </div>
    <div class="coffee__panel" id="p-${p.id}" role="region" aria-labelledby="t-${p.id}"${open ? '' : ' hidden'}>
      <form class="options" data-add novalidate>
        <p class="options__notes">${esc(p.notes)}.</p>
        <fieldset class="choice"><legend>Grind</legend><div class="chips">
          ${grinds.map(([g, label], i) => `<label class="chip"><input type="radio" name="grind" value="${g}"${i === 0 ? ' checked' : ''}>${esc(label)}</label>`).join('')}
        </div></fieldset>
        <fieldset class="choice"><legend>Size</legend><div class="chips">
          ${sizes.map(([s, label], i) => `<label class="chip"><input type="radio" name="size" value="${s}"${i === 0 ? ' checked' : ''}>${esc(label)} · ${formatEUR(p.prices[s])}</label>`).join('')}
        </div></fieldset>
        <div class="add">
          <button class="btn" type="submit"><span data-add-label>Add to cart</span> · <span data-price>${formatEUR(p.prices[sizes[0][0]])}</span></button>
          <p class="add__status" role="status" aria-live="polite"></p>
        </div>
      </form>
      <div class="preview" role="img" data-preview aria-label="${esc(manifest[img('whole')].alt)}">
        ${grinds.map(([g], i) => picture(manifest, img(g), { sizes: PREVIEW_SIZES, alt: '', cls: i === 0 ? 'is-on' : '' }).replace('<picture', `<picture data-grind="${g}"`)).join('')}
      </div>
    </div>
  </article>`;
}

function setOpen(article, open) {
  const btn = article.querySelector('.coffee__toggle');
  const panel = article.querySelector('.coffee__panel');
  btn.setAttribute('aria-expanded', String(open));
  if (!open) { panel.hidden = true; return; }
  panel.hidden = false;
  panel.classList.add('is-entering');
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-entering')));
}

export function mountShop(root, catalog, manifest) {
  root.innerHTML = catalog.products.map((p, i) => row(p, catalog, manifest, i === 0)).join('');
  const byId = new Map(catalog.products.map((p) => [p.id, p]));

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.coffee__toggle');
    if (!btn) return;
    const article = btn.closest('.coffee');
    const opening = btn.getAttribute('aria-expanded') !== 'true';
    const before = btn.getBoundingClientRect().top;
    root.querySelectorAll('.coffee').forEach((a) => a !== article && setOpen(a, false));
    setOpen(article, opening);
    // keep the row the visitor touched where it was, even if a panel above it just closed
    const delta = btn.getBoundingClientRect().top - before;
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' });
  });

  // a link elsewhere on the page ("Choose a grind" in the featured block) opens that coffee's row
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-open-coffee]');
    if (!link) return;
    const article = root.querySelector(`.coffee[data-id="${link.dataset.openCoffee}"]`);
    if (!article) return;
    e.preventDefault();
    root.querySelectorAll('.coffee').forEach((a) => setOpen(a, a === article));
    article.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    article.querySelector('.coffee__toggle').focus({ preventScroll: true });
  });

  root.addEventListener('change', (e) => {
    const form = e.target.closest('form[data-add]');
    if (!form) return;
    const article = form.closest('.coffee');
    const p = byId.get(article.dataset.id);
    if (e.target.name === 'grind') {
      const g = e.target.value;
      const preview = article.querySelector('[data-preview]');
      preview.querySelectorAll('picture').forEach((pic) => pic.classList.toggle('is-on', pic.dataset.grind === g));
      preview.setAttribute('aria-label', manifest[g === 'whole' ? p.texture : GRIND_IMG[g]].alt);
    }
    if (e.target.name === 'size') form.querySelector('[data-price]').textContent = formatEUR(p.prices[e.target.value]);
  });

  root.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const article = form.closest('.coffee');
    const p = byId.get(article.dataset.id);
    const grind = form.elements.grind.value;
    const size = form.elements.size.value;
    setCart(add(getCart(), { id: p.id, size, grind }));
    const label = form.querySelector('[data-add-label]');
    const status = form.querySelector('.add__status');
    label.textContent = 'Added';
    status.textContent = `${p.name}, ${catalog.sizes[size]}, ${catalog.grinds[grind].toLowerCase()} is in your cart.`;
    clearTimeout(form._t);
    form._t = setTimeout(() => { label.textContent = 'Add to cart'; }, 1400);
  });
}
