// The order confirmation. Shows the last order (written by checkout.js for this tab only; it never contains card
// data): the bag(s) just bought under a parcel label addressed to the buyer, what happens next with real dates,
// a brew card for the grind they chose, and, folded away, the email a live shop would send. Nothing is sent.
// Without an order in this tab (opened directly, or the tab was closed) the page stays a plain thank-you.
import { formatEUR } from './cart.js';
import { formatDay, formatWindow, addWorkingDays } from './order.js';
import { load, picture } from './store.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const $ = (sel) => document.querySelector(sel);

// The brew card for each grind: the headline figures of the home page's recipes (index.html #brew), which hold
// the full steps; "Full recipe" opens that tab there (brew.js reads the hash).
const BREW = {
  filter: { title: 'Brew it as a pour-over', specs: [['Coffee', '15 g'], ['Water', '250 g at 94 °C'], ['Time', 'About 3 min']],
    links: [['Full recipe', 'recipe-pourover']] },
  espresso: { title: 'Brew it as an espresso', specs: [['Coffee', '18 g'], ['In the cup', '36 g'], ['Time', '25 to 30 s']],
    links: [['Full recipe', 'recipe-espresso'], ['Or in a moka pot', 'recipe-moka']] },
  whole: { title: 'Grind it just before you brew', text: 'Grind only what you need for each brew: fine for espresso and the moka pot, medium for pour-over.',
    links: [['Pour-over', 'recipe-pourover'], ['Moka pot', 'recipe-moka'], ['Espresso', 'recipe-espresso']] },
};

let order = null;
try { order = JSON.parse(sessionStorage.getItem('dn-last-order') || 'null'); } catch { order = null; }
const ref = new URLSearchParams(location.search).get('order');

if (order && order.ref === ref && order.shipping) {
  const placed = new Date(order.placed);
  const win = formatWindow({ from: new Date(order.shipping.from), to: new Date(order.shipping.to) });
  const ship = order.shipping.cents === 0 ? 'Free' : formatEUR(order.shipping.cents);
  const a = order.address, c = order.contact;
  const addressLines = [`${c.firstName} ${c.lastName}`, a.line1, a.line2, `${a.postcode} ${a.city}`, a.country].filter(Boolean);
  const lineRows = order.lines.map((l) =>
    `<div class="summary__line"><span>${l.qty} × ${esc(l.name)}<br><span class="t-soft">${esc(l.size)} · ${esc(l.grind)}</span></span><span>${formatEUR(l.lineCents)}</span></div>`).join('');

  $('[data-lede]').textContent = `Nothing was charged and no email was sent: this shop is a showcase. Here is what ${c.email} would be told.`;
  $('[data-fallback]').hidden = true;

  // the parcel label: who it is for, what is inside, the order number
  $('[data-label]').innerHTML = `
    <span class="lion parcel-label__seal" aria-hidden="true"></span>
    <span class="parcel-label__to"><span class="tag">For</span> ${esc(`${c.firstName} ${c.lastName}`)}<br><span class="t-soft">${esc(a.city)}, ${esc(a.country)}</span></span>
    <span class="parcel-label__lines">${order.lines.map((l) => `<span>${l.qty} × ${esc(l.name)} <span class="t-soft">${esc(l.size)} · ${esc(l.grind)}</span></span>`).join('')}</span>
    <span class="parcel-label__ref"><span class="tag">Order</span> ${esc(order.ref)}</span>`;

  // what happens next: placed today, roasted and sent by the next working day, arrives in the window. "By", not
  // "on": Express can arrive on that same next working day (order.js: 1 to 2 working days), so it leaves sooner
  const roast = addWorkingDays(placed, 1);
  $('[data-steps]').innerHTML = [
    ['Placed', formatDay(placed), `Order ${esc(order.ref)}`],
    ['Roasted and sent', `By ${formatDay(roast)}`, `${esc(order.shipping.method)} shipping`],
    ['Arrives', win, `${esc(a.postcode)} ${esc(a.city)}`],
  ].map(([what, when, note], i) => `<li class="step${i === 0 ? ' is-done' : ''}"><span class="step__what">${what}</span><span class="step__when">${when}</span><span class="step__note t-soft">${note}</span></li>`).join('');
  $('[data-total-line]').innerHTML = `<span>Total</span><span>${formatEUR(order.totalCents)}</span><span class="t-soft">${formatEUR(order.subtotalCents)} coffee · ${ship === 'Free' ? 'free' : ship} shipping</span>`;
  $('[data-next]').hidden = false;

  // the email, folded away: the receipt in full, as a live shop would send it
  document.querySelectorAll('[data-email-to]').forEach((el) => { el.textContent = c.email; });
  $('[data-email-subject]').textContent = `Your Dolce Nova order ${order.ref}`;
  $('[data-email-body]').innerHTML = `
    <p>Hi ${esc(c.firstName)},</p>
    <p>Thank you for your order. We roast it on the next working day and send it ${esc(order.shipping.method.toLowerCase())}.</p>
    <div class="email__lines">${lineRows}</div>
    <p class="summary__row"><span>Subtotal</span><span>${formatEUR(order.subtotalCents)}</span></p>
    <p class="summary__row"><span>Shipping (${esc(order.shipping.method)})</span><span>${ship}</span></p>
    <p class="summary__total"><span>Total</span><span>${formatEUR(order.totalCents)}</span></p>
    <p><strong>Arriving ${win}</strong>, to:<br>${addressLines.map(esc).join('<br>')}</p>
    <p>Order ${esc(order.ref)}. Questions? Reply to this email.</p>`;
  $('[data-email]').hidden = false;

  // the bags and the brew card need the catalog (bag images, grind keys); the page reads fine without them
  load().then(({ catalog, manifest }) => {
    const byName = new Map(catalog.products.map((p) => [p.name, p]));
    const seen = new Set();
    const bags = order.lines.map((l) => byName.get(l.name)).filter((p) => p && manifest[`${p.bag}-sq`] && !seen.has(p.id) && seen.add(p.id));
    if (bags.length) {
      const one = bags.length === 1;
      $('[data-bag-grid]').classList.toggle('is-many', !one);
      $('[data-bag-grid]').innerHTML = bags.slice(0, 4).map((p) => picture(manifest, `${p.bag}-sq`, {
        sizes: one ? '(min-width: 1024px) 40vw, 100vw' : '(min-width: 1024px) 20vw, 50vw', alt: `The ${p.name} bag`, lazy: false })).join('');
      $('[data-bags]').hidden = false;
    }
    const grindKey = Object.keys(catalog.grinds).find((k) => catalog.grinds[k] === order.lines[0]?.grind);
    const b = BREW[grindKey];
    if (b) {
      $('[data-brew]').innerHTML = `
        <h2 id="brew-card-title">${b.title}</h2>
        ${b.specs ? `<dl class="recipe__specs">${b.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
        ${b.text ? `<p>${b.text}</p>` : ''}
        <p class="done__brew-links">${b.links.map(([t, id]) => `<a class="link-arrow" href="./#${id}">${t} <span aria-hidden="true">→</span></a>`).join('')}</p>`;
      $('[data-brew]').hidden = false;
    }
  }).catch(() => { /* no bags or brew card: the label, steps and email still stand */ });
}
