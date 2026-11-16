// Shared state: the catalog, the image manifest and the cart (persisted in localStorage; card data never is).
import { parseCart } from './cart.js';

const KEY = 'dn-cart';
let cart = [];
let catalog = null;
const listeners = new Set();

export async function load() {
  const [cat, manifest] = await Promise.all([
    fetch('data/catalog.json').then((r) => r.json()),
    fetch('assets/img/manifest.json').then((r) => r.json()),
  ]);
  catalog = cat;
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* private mode or blocked storage: start empty */ }
  cart = parseCart(raw, catalog);
  return { catalog, manifest };
}

export const getCart = () => cart;
export const getCatalog = () => catalog;

export function setCart(next) {
  cart = next;
  try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* the cart still works for this visit */ }
  listeners.forEach((fn) => fn(cart));
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** <picture> markup from the manifest: AVIF + WebP srcsets, intrinsic size, alt. */
export function picture(manifest, name, { sizes, alt, lazy = true, cls = '' } = {}) {
  const m = manifest[name];
  const set = (ext) => m.widths.map((w) => `assets/img/${name}-${w}.${ext} ${w}w`).join(', ');
  const mid = m.widths[Math.min(1, m.widths.length - 1)];
  return `<picture${cls ? ` class="${cls}"` : ''}><source type="image/avif" sizes="${sizes}" srcset="${set('avif')}">` +
    `<img src="assets/img/${name}-${mid}.webp" sizes="${sizes}" srcset="${set('webp')}" width="${m.ratio[0]}" height="${m.ratio[1]}"` +
    ` alt="${alt ?? m.alt}"${lazy ? ' loading="lazy"' : ''} decoding="async"></picture>`;
}
