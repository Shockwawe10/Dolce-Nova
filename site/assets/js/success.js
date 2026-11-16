// Shows the last demo order (written by checkout.js; it never contains card data).
import { formatEUR } from './cart.js';

let order = null;
try { order = JSON.parse(sessionStorage.getItem('dn-last-order') || 'null'); } catch { order = null; }
const ref = new URLSearchParams(location.search).get('order');
if (order && order.ref === ref) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  document.querySelector('[data-ref]').textContent = order.ref;
  document.querySelector('[data-lines]').innerHTML = order.lines.map((l) =>
    `<div class="summary__line"><span>${l.qty} × ${esc(l.name)}<br><span class="t-soft">${esc(l.size)} · ${esc(l.grind)}</span></span><span>${formatEUR(l.lineCents)}</span></div>`).join('');
  document.querySelector('[data-total]').textContent = formatEUR(order.totalCents);
  document.querySelector('[data-order]').hidden = false;
}
