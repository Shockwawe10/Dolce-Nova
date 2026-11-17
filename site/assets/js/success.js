// Shows the last demo order (written by checkout.js for this tab only; it never contains card data) and a
// preview of the confirmation email a live shop would send. Nothing here sends anything.
import { formatEUR } from './cart.js';
import { formatWindow } from './order.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const $ = (sel) => document.querySelector(sel);
let order = null;
try { order = JSON.parse(sessionStorage.getItem('dn-last-order') || 'null'); } catch { order = null; }
const ref = new URLSearchParams(location.search).get('order');

if (order && order.ref === ref && order.shipping) {
  const win = formatWindow({ from: new Date(order.shipping.from), to: new Date(order.shipping.to) });
  const ship = order.shipping.cents === 0 ? 'Free' : formatEUR(order.shipping.cents);
  const a = order.address, c = order.contact;
  const addressLines = [`${c.firstName} ${c.lastName}`, a.line1, a.line2, `${a.postcode} ${a.city}`, a.country].filter(Boolean);
  const lineRows = order.lines.map((l) =>
    `<div class="summary__line"><span>${l.qty} × ${esc(l.name)}<br><span class="t-soft">${esc(l.size)} · ${esc(l.grind)}</span></span><span>${formatEUR(l.lineCents)}</span></div>`).join('');

  $('[data-ref]').textContent = order.ref;
  $('[data-lede]').textContent = `This was a demo order, so nothing was charged and nothing will ship. A live shop would send the confirmation below to ${c.email}.`;
  $('[data-lines]').innerHTML = lineRows;
  $('[data-subtotal]').textContent = formatEUR(order.subtotalCents);
  $('[data-method]').textContent = order.shipping.method;
  $('[data-shipping]').textContent = ship;
  $('[data-total]').textContent = formatEUR(order.totalCents);
  $('[data-eta]').textContent = `Arrives ${win}`;
  $('[data-address]').innerHTML = `<span class="t-soft">Delivering to</span><br>${addressLines.map(esc).join('<br>')}`;
  $('[data-order]').hidden = false;

  // the email, as a live shop would send it
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
    <p>Order ${esc(order.ref)}. Questions? Reply to this email.</p>
    <p class="t-soft">Dolce Nova is a fictional roastery and this was a demo order: nothing was charged and nothing will ship.</p>`;
  $('[data-email]').hidden = false;
}
