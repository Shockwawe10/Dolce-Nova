// Demo checkout: contact, delivery address, shipping and a demo card, all checked in the browser. On success it
// records the ORDER (contact, address, shipping, lines, totals; never the card) for this tab only and moves on.
// The pay button ships disabled in the HTML and is enabled once the order is ready: before this script runs, a
// submit would go out as a native GET and put what was typed in the URL (found 2026-11-17).
import { totals, formatEUR } from './cart.js';
import { checkCard } from './card.js';
import { SHIPPING, shippingCents, deliveryWindow, formatWindow, checkContact, COUNTRIES } from './order.js';
import { load, getCart, setCart } from './store.js';

const form = document.querySelector('[data-pay]');
const summary = document.querySelector('[data-summary]');
const payBtn = document.querySelector('[data-pay-btn]');
const status = document.querySelector('[data-pay-status]');
const out = (k) => document.querySelector(`[data-sum-${k}]`);
const FIELDS = ['email', 'firstName', 'lastName', 'address1', 'postcode', 'city', 'country', 'shipping', 'name', 'number', 'expiry', 'cvc'];

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
  const full = `${form.firstName.value} ${form.lastName.value}`.trim();
  form.name.value = form.name.value || full || 'Test Customer';
  form.number.value = '4242 4242 4242 4242';
  form.expiry.value = '12/34';
  form.cvc.value = '123';
  for (const k of ['name', 'number', 'expiry', 'cvc']) setError(k, '');
  payBtn.focus();
});

function setError(name, msg) {
  const el = form.querySelector(`[data-err="${name}"]`);
  if (el) el.textContent = msg;
  const input = name === 'shipping' ? form.querySelector('.ships') : form.elements[name];
  if (input && input.setAttribute) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
}
const showErrors = (errors) => FIELDS.forEach((k) => setError(k, errors[k] || ''));
// a field's message clears as soon as it is fixed, not only on the next submit
form.addEventListener('change', (e) => { if (e.target.name && form.querySelector(`[data-err="${e.target.name}"]`)?.textContent) setError(e.target.name, ''); });

let catalog = null;
let t = { lines: [], totalCents: 0 };
const method = () => (form.querySelector('input[name="shipping"]:checked') || {}).value || 'standard';

// the summary: subtotal, shipping for the chosen method, total, and when it would arrive
function renderTotals() {
  const now = new Date();
  for (const key of Object.keys(SHIPPING)) {
    const cost = shippingCents(key, t.totalCents);
    const price = document.querySelector(`[data-ship-price="${key}"]`);
    const time = document.querySelector(`[data-ship-time="${key}"]`);
    if (price) price.textContent = cost === 0 ? 'Free' : formatEUR(cost);
    if (time) time.textContent = `${SHIPPING[key].days[0]}–${SHIPPING[key].days[1]} working days · ${formatWindow(deliveryWindow(key, now))}`;
  }
  const m = method(), ship = t.lines.length ? shippingCents(m, t.totalCents) : 0;   // nothing to ship, nothing to charge
  out('subtotal').textContent = formatEUR(t.totalCents);
  out('method').textContent = SHIPPING[m].label;
  out('shipping').textContent = ship === 0 ? 'Free' : formatEUR(ship);
  out('total').textContent = formatEUR(t.totalCents + ship);
  out('eta').textContent = t.lines.length ? `Arrives ${formatWindow(deliveryWindow(m, now))}` : '';
  out('total-short').textContent = t.lines.length ? formatEUR(t.totalCents + ship) : '';
  const n = t.lines.reduce((s, l) => s + l.qty, 0);
  out('count').textContent = n ? `· ${n} ${n === 1 ? 'item' : 'items'}` : '';
  if (t.lines.length) payBtn.textContent = `Place order · ${formatEUR(t.totalCents + ship)}`;
}
form.addEventListener('change', (e) => { if (e.target.name === 'shipping' && catalog) renderTotals(); });

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!catalog || !t.lines.length) return;
  const v = (k) => (form.elements[k] ? form.elements[k].value.trim() : '');
  const fields = { email: v('email'), firstName: v('firstName'), lastName: v('lastName'), address1: v('address1'), postcode: v('postcode'), city: v('city'), country: v('country'), shipping: method() };
  const errors = { ...checkContact(fields), ...checkCard({ name: form.name.value, number: form.number.value, expiry: form.expiry.value, cvc: form.cvc.value }) };
  showErrors(errors);
  const first = FIELDS.find((k) => errors[k]);
  if (first) {
    (first === 'shipping' ? form.querySelector('input[name="shipping"]') : form.elements[first]).focus();
    status.textContent = `Please check the highlighted ${Object.keys(errors).length === 1 ? 'field' : 'fields'}.`;
    return;
  }
  payBtn.disabled = true;
  status.textContent = 'Placing your order…';
  const now = new Date(), m = fields.shipping, ship = shippingCents(m, t.totalCents), win = deliveryWindow(m, now);
  const ref = 'DN-' + [...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const order = {
    ref, placed: now.toISOString(),
    contact: { email: fields.email, firstName: fields.firstName, lastName: fields.lastName, phone: v('phone') },
    address: { line1: fields.address1, line2: v('address2'), postcode: fields.postcode, city: fields.city, country: COUNTRIES.find(([c]) => c === fields.country)[1] },
    shipping: { method: SHIPPING[m].label, cents: ship, from: win.from.toISOString(), to: win.to.toISOString() },
    subtotalCents: t.totalCents, totalCents: t.totalCents + ship,
    lines: t.lines.map((l) => ({ name: l.product.name, size: catalog.sizes[l.size], grind: catalog.grinds[l.grind], qty: l.qty, lineCents: l.lineCents })),
  };
  form.reset(); // the card fields are wiped before anything else happens; they were never stored
  try { sessionStorage.setItem('dn-last-order', JSON.stringify(order)); } catch { /* the confirmation shows a plain thank-you instead */ }
  setCart([]);
  location.href = `success.html?order=${encodeURIComponent(ref)}`;
});

({ catalog } = await load());
t = totals(getCart(), catalog);
if (!t.lines.length) {
  summary.innerHTML = '<p>Your cart is empty.</p><p><a class="link-arrow" href="./#coffees">Choose a coffee <span aria-hidden="true">→</span></a></p>';
} else {
  summary.innerHTML = t.lines.map((l) => `<div class="summary__line"><span>${l.qty} × ${l.product.name}<br><span class="t-soft">${catalog.sizes[l.size]} · ${catalog.grinds[l.grind]}</span></span><span>${formatEUR(l.lineCents)}</span></div>`).join('');
  payBtn.disabled = false;
  // on a phone or tablet the order folds into a bar under the heading (the CSS shows the bar below 1024 only);
  // without this script, or with an empty cart, the summary simply stays open
  const toggle = document.querySelector('[data-sum-toggle]');
  toggle.hidden = false;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => toggle.setAttribute('aria-expanded', String(toggle.getAttribute('aria-expanded') !== 'true')));
}
renderTotals();
