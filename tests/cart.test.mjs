// node --test tests/   (Node's built-in runner; no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { add, setQuantity, remove, totals, count, parseCart, formatEUR, MAX_QTY } from '../site/assets/js/cart.js';
import { luhn, checkCard } from '../site/assets/js/card.js';

const catalog = JSON.parse(readFileSync(new URL('../site/data/catalog.json', import.meta.url)));
// An independent statement of the prices, typed by hand: if the catalog drifts, the random test fails.
const PRICES = { yirgacheffe: [1950, 4900], nyeri: [2250, 5600], huila: [1700, 4200], huehuetenango: [1750, 4400], decaf: [1850, 4500], cerrado: [1550, 3800] };

test('adding the same variant twice merges into one line', () => {
  let c = add([], { id: 'huila', size: '340g', grind: 'filter' });
  c = add(c, { id: 'huila', size: '340g', grind: 'filter' });
  assert.deepEqual(c, [{ id: 'huila', size: '340g', grind: 'filter', qty: 2 }]);
  c = add(c, { id: 'huila', size: '340g', grind: 'whole' });
  assert.equal(c.length, 2);
});

test('quantity is clamped to 1..MAX_QTY and 0 removes the line', () => {
  let c = add([], { id: 'decaf', size: '1kg', grind: 'whole' });
  c = setQuantity(c, 0, 99);
  assert.equal(c[0].qty, MAX_QTY);
  c = setQuantity(c, 0, 0);
  assert.deepEqual(c, []);
  c = add(c, { id: 'decaf', size: '1kg', grind: 'whole' });
  assert.deepEqual(remove(c, 0), []);
});

test('50 random carts: totals match an independent cents recomputation', () => {
  let seed = 20261116;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % n; };
  const ids = Object.keys(PRICES);
  for (let i = 0; i < 50; i++) {
    let c = [];
    let expected = 0;
    const lines = 1 + rnd(6);
    for (let j = 0; j < lines; j++) {
      const id = ids[rnd(ids.length)], sizeIx = rnd(2), grind = ['whole', 'espresso', 'filter'][rnd(3)], q = 1 + rnd(3);
      for (let k = 0; k < q; k++) c = add(c, { id, size: ['340g', '1kg'][sizeIx], grind });
    }
    for (const l of c) expected += PRICES[l.id][l.size === '340g' ? 0 : 1] * l.qty;
    const t = totals(c, catalog);
    assert.equal(t.totalCents, expected, `cart ${i}`);
    assert.ok(Number.isInteger(t.totalCents));
    assert.equal(count(c), c.reduce((s, l) => s + l.qty, 0));
  }
});

test('stored carts are re-validated: unknown ids, sizes, grinds and bad quantities are dropped', () => {
  const raw = JSON.stringify([
    { id: 'huila', size: '340g', grind: 'filter', qty: 2, price: 1 },
    { id: 'nope', size: '340g', grind: 'filter', qty: 1 },
    { id: 'huila', size: '5kg', grind: 'filter', qty: 1 },
    { id: 'huila', size: '340g', grind: 'cafetiere', qty: 1 },
    { id: 'huila', size: '340g', grind: 'whole', qty: 1.5 },
    { id: 'huila', size: '340g', grind: 'espresso', qty: true },
  ]);
  assert.deepEqual(parseCart(raw, catalog), [{ id: 'huila', size: '340g', grind: 'filter', qty: 2 }]);
  assert.deepEqual(parseCart('not json', catalog), []);
  assert.deepEqual(parseCart('{"a":1}', catalog), []);
  assert.deepEqual(parseCart(null, catalog), []);
});

test('prices come from the catalog, never from a stored line', () => {
  const c = parseCart(JSON.stringify([{ id: 'nyeri', size: '1kg', grind: 'whole', qty: 1, unit: 1 }]), catalog);
  assert.equal(totals(c, catalog).totalCents, 5600);
});

test('EUR formatting from integer cents', () => {
  assert.equal(formatEUR(1450), '€14.50');
  assert.equal(formatEUR(5600), '€56.00');
  assert.equal(formatEUR(0), '€0.00');
  assert.equal(formatEUR(123456), '€1,234.56');
});

test('Luhn accepts the Stripe test card and rejects a one-digit change', () => {
  assert.equal(luhn('4242424242424242'), true);
  assert.equal(luhn('4242424242424241'), false);
  assert.equal(luhn(''), false);
});

test('card check: number, expiry in the future, CVC, name', () => {
  const now = new Date(2026, 10, 16);
  const ok = { name: 'Ada Lovelace', number: '4242 4242 4242 4242', expiry: '12/34', cvc: '123' };
  assert.deepEqual(checkCard(ok, now), {});
  assert.ok(checkCard({ ...ok, number: '4242 4242 4242 4241' }, now).number);
  assert.ok(checkCard({ ...ok, number: '4242' }, now).number);
  assert.ok(checkCard({ ...ok, expiry: '10/26' }, now).expiry, 'past month');
  assert.deepEqual(checkCard({ ...ok, expiry: '11/26' }, now), {}, 'current month is still valid');
  assert.ok(checkCard({ ...ok, expiry: '13/30' }, now).expiry);
  assert.ok(checkCard({ ...ok, cvc: '12' }, now).cvc);
  assert.ok(checkCard({ ...ok, name: ' ' }, now).name);
});
