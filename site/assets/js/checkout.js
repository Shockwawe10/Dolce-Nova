// Demo checkout: validates the card form locally, then records the ORDER (never the card) and moves on.
// The pay button ships disabled in the HTML and is enabled only once the order is ready: before this script
// runs, a submit would go out as a native GET and put the typed card number in the URL (found 2026-11-17
// with a slow catalog). The fields' own listeners attach at once.
import { totals, formatEUR } from './cart.js';
import { checkCard } from './card.js';
import { load, getCart, setCart } from './store.js';

const form = document.querySelector('[data-pay]');
const summary = document.querySelector('[data-summary]');
const totalEl = document.querySelector('[data-sum-total]');
const payBtn = document.querySelector('[data-pay-btn]');
const status = document.querySelector('[data-pay-status]');


// light formatting while typing: groups of four, MM/YY
form.number.addEventListener('input', () => {
  const d = form.number.value.replace(/\D/g, '').slice(0, 19);
  form.number.value = d.replace(/(\d{4})(?=\d)/g, '$1 ');
});
form.expiry.addEventListener('input', (e) => {
  const d = form.expiry.value.replace(/\D/g, '').slice(0, 4);
  form.expiry.value = d.length > 2 || (d.length === 2 && e.inputType !== 'deleteContentBackward') ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
});
form.cvc.addEventListener('input', () => { form.cvc.value = form.cvc.value.replace(/\D/g, '').slice(0, 4); });

document.querySelector('[data-test-card]').addEventListener('click', () => {
  form.name.value = form.name.value || 'Test Customer';
  form.number.value = '4242 4242 4242 4242';
  form.expiry.value = '12/34';
  form.cvc.value = '123';
  showErrors({});
  payBtn.focus();
});

function showErrors(errors) {
  for (const name of ['name', 'number', 'expiry', 'cvc']) {
    const msg = errors[name] || '';
    form.querySelector(`[data-err="${name}"]`).textContent = msg;
    form[name].setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
}

let catalog = null;
let t = { lines: [], totalCents: 0 };

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!catalog || !t.lines.length) return;
  const errors = checkCard({ name: form.name.value, number: form.number.value, expiry: form.expiry.value, cvc: form.cvc.value });
  showErrors(errors);
  const first = Object.keys(errors)[0];
  if (first) { form[first].focus(); status.textContent = 'Please check the highlighted fields.'; return; }
  payBtn.disabled = true;
  status.textContent = 'Placing your demo order…';
  const ref = 'DN-' + [...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const order = { ref, totalCents: t.totalCents, lines: t.lines.map((l) => ({ name: l.product.name, size: catalog.sizes[l.size], grind: catalog.grinds[l.grind], qty: l.qty, lineCents: l.lineCents })) };
  form.reset(); // card fields are wiped before anything else happens; they were never stored
  try { sessionStorage.setItem('dn-last-order', JSON.stringify(order)); } catch { /* the success page shows a plain thank-you instead */ }
  setCart([]);
  location.href = `success.html?order=${encodeURIComponent(ref)}`;
});

({ catalog } = await load());
t = totals(getCart(), catalog);
totalEl.textContent = formatEUR(t.totalCents);
if (!t.lines.length) {
  summary.innerHTML = '<p>Your cart is empty.</p><p><a class="link-arrow" href="./#coffees">Choose a coffee <span aria-hidden="true">→</span></a></p>';
} else {
  summary.innerHTML = t.lines.map((l) => `<div class="summary__line"><span>${l.qty} × ${l.product.name}<br><span class="t-soft">${catalog.sizes[l.size]} · ${catalog.grinds[l.grind]}</span></span><span>${formatEUR(l.lineCents)}</span></div>`).join('');
  payBtn.textContent = `Place demo order · ${formatEUR(t.totalCents)}`;
  payBtn.disabled = false;
}
