// The generated pages agree with the catalog (tools/pages.mjs): a price changed in catalog.json without
// re-running the generator fails here, in CI, before it reaches the live site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { formatEUR } from '../site/assets/js/cart.js';

const read = (f) => readFileSync(new URL(`../site/${f}`, import.meta.url), 'utf8');
const catalog = JSON.parse(read('data/catalog.json'));
const index = read('index.html');

test('every coffee has a product page with its name, every price and its add form', () => {
  for (const p of catalog.products) {
    const file = `coffee-${p.id}.html`;
    assert.ok(existsSync(new URL(`../site/${file}`, import.meta.url)), `${file} exists`);
    const html = read(file);
    assert.match(html, new RegExp(`<h1>${p.name}</h1>`));
    for (const cents of Object.values(p.prices)) assert.ok(html.includes(formatEUR(cents)), `${file} shows ${formatEUR(cents)}`);
    assert.match(html, new RegExp(`data-product="${p.id}"`));
  }
});

test('the home carousel links every coffee with its lowest price, in catalog order', () => {
  const links = [...index.matchAll(/class="slide__link" href="coffee-([a-z]+)\.html"/g)].map((m) => m[1]);
  assert.deepEqual(links, catalog.products.map((p) => p.id));
  for (const p of catalog.products) assert.ok(index.includes(`from ${formatEUR(Math.min(...Object.values(p.prices)))}`), `${p.id} from-price`);
});

test('the bag image named in the catalog exists in both crops', () => {
  const manifest = JSON.parse(read('assets/img/manifest.json'));
  for (const p of catalog.products) { assert.ok(manifest[p.bag], p.bag); assert.ok(manifest[`${p.bag}-sq`], `${p.bag}-sq`); }
});

test('every coffee page tells where it comes from: its own landscape photograph, title, story and facts', () => {
  const manifest = JSON.parse(read('assets/img/manifest.json'));
  for (const p of catalog.products) {
    const html = read(`coffee-${p.id}.html`);
    assert.ok(p.region, `${p.id} has a region in the catalog`);
    assert.ok(manifest[p.region.photo], `${p.region.photo} is built`);
    assert.ok(html.includes(`assets/img/${p.region.photo}-`), `${p.id} shows ${p.region.photo}`);
    assert.ok(html.includes(`<h2 id="origin-title">${p.region.title.replace(/’/g, '’')}</h2>`), `${p.id} origin title`);
    assert.equal(p.region.text.length, 2);
    assert.ok(p.region.facts.length >= 4);
  }
});
