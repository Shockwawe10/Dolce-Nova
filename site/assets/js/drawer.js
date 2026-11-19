// Cart drawer: a modal dialog. Focus trap, Esc, `inert` on everything behind it, iOS-safe scroll lock.
import { totals, setQuantity, remove, count, formatEUR } from './cart.js';
import { getCart, setCart, subscribe, picture } from './store.js';
import { SHIPPING } from './order.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function mountDrawer(catalog, manifest) {
  const drawer = document.getElementById('cart');
  const scrim = document.querySelector('[data-scrim]');
  const lines = drawer.querySelector('[data-cart-lines]');
  const foot = drawer.querySelector('[data-cart-foot]');
  const total = drawer.querySelector('[data-cart-total]');
  const badges = document.querySelectorAll('[data-cart-count]');
  const behind = [...document.body.children].filter((el) => el !== drawer && el !== scrim && el.tagName !== 'SCRIPT');
  let opener = null;
  let scrollY = 0;
  let lastCount = count(getCart());

  function render(cart) {
    const n = count(cart);
    badges.forEach((b) => {
      b.textContent = String(n);
      if (n > lastCount && !reduced()) { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); }
    });
    lastCount = n;
    const t = totals(cart, catalog);
    total.textContent = formatEUR(t.totalCents);
    // how far to free standard shipping, instead of a fixed rule
    const free = SHIPPING.standard.freeFromCents, left = Math.max(0, free - t.totalCents);
    const freeText = drawer.querySelector('[data-cart-free-text]'), freeBar = drawer.querySelector('[data-cart-free-bar]');
    if (freeText) freeText.textContent = left ? `${formatEUR(left)} more for free standard shipping.` : 'Standard shipping is free on this order.';
    if (freeBar) freeBar.style.transform = `scaleX(${Math.min(1, t.totalCents / free)})`;
    foot.hidden = cart.length === 0;
    if (!cart.length) {
      lines.innerHTML = `<div class="drawer__empty"><p>Your cart is empty.</p><a class="link-arrow" href="./#coffees" data-cart-close>Browse the coffees <span aria-hidden="true">→</span></a></div>`;
      return;
    }
    lines.innerHTML = t.lines.map((l, i) => `
      <div class="line">
        ${picture(manifest, l.product.bag, { sizes: '64px', alt: '' })}
        <div>
          <p class="line__name"><a href="coffee-${l.product.id}.html">${l.product.name}</a></p>
          <p class="line__meta">${catalog.sizes[l.size]} · ${catalog.grinds[l.grind]}</p>
          <div class="qty" role="group" aria-label="Quantity of ${l.product.name}">
            <button class="icon-btn" type="button" data-qty="${i}" data-step="-1" aria-label="One fewer">−</button>
            <output aria-live="polite">${l.qty}</output>
            <button class="icon-btn" type="button" data-qty="${i}" data-step="1" aria-label="One more"${l.qty >= 10 ? ' disabled' : ''}>+</button>
          </div>
          <button class="line__remove" type="button" data-remove="${i}">Remove</button>
        </div>
        <p class="line__price">${formatEUR(l.lineCents)}</p>
      </div>`).join('');
  }

  function open(from) {
    opener = from || document.activeElement;
    scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('lock');
    behind.forEach((el) => { el.inert = true; });
    scrim.hidden = false;
    drawer.hidden = false;
    void drawer.offsetWidth; // commit the closed position so the slide runs
    scrim.classList.add('is-open');
    drawer.classList.add('is-open');
    drawer.querySelector('[data-cart-close]').focus({ preventScroll: true });
  }

  function close() {
    if (drawer.hidden) return;
    scrim.classList.remove('is-open');
    drawer.classList.remove('is-open');
    behind.forEach((el) => { el.inert = false; });
    document.body.classList.remove('lock');
    document.body.style.top = '';
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    const done = () => { if (!drawer.classList.contains('is-open')) { drawer.hidden = true; scrim.hidden = true; } };
    if (reduced()) done(); else drawer.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 600); // in case transitionend never fires
    if (opener) opener.focus({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-cart-open]');
    if (o) { open(o); return; }
    if (e.target.closest('[data-cart-close]') || e.target === scrim) {
      const link = e.target.closest('a[href^="#"]');
      close();
      if (link) { e.preventDefault(); document.querySelector(link.getAttribute('href'))?.scrollIntoView(); }
    }
  });
  lines.addEventListener('click', (e) => {
    const q = e.target.closest('[data-qty]');
    const r = e.target.closest('[data-remove]');
    const cart = getCart();
    if (q) { const i = Number(q.dataset.qty); setCart(setQuantity(cart, i, cart[i].qty + Number(q.dataset.step))); }
    if (r) setCart(remove(cart, Number(r.dataset.remove)));
    if (q || r) (drawer.querySelector(q ? `[data-qty="${q.dataset.qty}"][data-step="${q.dataset.step}"]` : '[data-cart-close]') || drawer.querySelector('[data-cart-close]')).focus();
  });
  drawer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...drawer.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  subscribe(render);
  render(getCart());
  return { open, close };
}
