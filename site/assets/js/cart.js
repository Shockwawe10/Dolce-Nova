// Cart model: pure functions over an array of lines { id, size, grind, qty }. Prices are never stored in a
// line; they are always read from the catalog, in integer cents.
export const MAX_QTY = 10;

const same = (a, b) => a.id === b.id && a.size === b.size && a.grind === b.grind;

export function add(cart, item) {
  const i = cart.findIndex((l) => same(l, item));
  if (i === -1) return [...cart, { id: item.id, size: item.size, grind: item.grind, qty: 1 }];
  return cart.map((l, j) => (j === i ? { ...l, qty: Math.min(MAX_QTY, l.qty + 1) } : l));
}

export function setQuantity(cart, index, qty) {
  if (qty <= 0) return remove(cart, index);
  return cart.map((l, j) => (j === index ? { ...l, qty: Math.min(MAX_QTY, Math.floor(qty)) } : l));
}

export const remove = (cart, index) => cart.filter((_, j) => j !== index);

export const count = (cart) => cart.reduce((s, l) => s + l.qty, 0);

export function totals(cart, catalog) {
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  const lines = cart.map((l) => {
    const p = byId.get(l.id);
    const unitCents = p.prices[l.size];
    return { ...l, product: p, unitCents, lineCents: unitCents * l.qty };
  });
  return { lines, totalCents: lines.reduce((s, l) => s + l.lineCents, 0) };
}

/** Parse a stored cart and keep only lines that are valid against the catalog. */
export function parseCart(raw, catalog) {
  let data;
  try { data = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(data)) return [];
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  const out = [];
  for (const l of data) {
    const p = l && byId.get(l.id);
    if (!p || !(l.size in p.prices) || !(l.grind in catalog.grinds)) continue;
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY) continue;
    out.push({ id: l.id, size: l.size, grind: l.grind, qty: l.qty });
  }
  return out;
}

const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
export const formatEUR = (cents) => eur.format(cents / 100);
