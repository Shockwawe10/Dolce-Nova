// A product page's choices: the size changes the price on the button; Add puts the variant in the cart.
// The listeners attach at once, before the catalog has downloaded: each size carries its own price in the
// markup, and Add waits for the catalog. (Found live: a size picked while the catalog was still loading
// left the old price on the button.)
import { add } from './cart.js';
import { getCart, setCart } from './store.js';

export function mountProduct(root, ready) {
  const form = root.querySelector('form[data-add]');
  if (!form) return;
  const id = root.dataset.product;

  form.addEventListener('change', (e) => {
    if (e.target.name === 'size') form.querySelector('[data-add-price]').textContent = e.target.dataset.price;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const grind = form.elements.grind.value;
    const size = form.elements.size.value;
    const { catalog } = await ready;
    const p = catalog.products.find((x) => x.id === id);
    if (!p) return;
    setCart(add(getCart(), { id, size, grind }));
    const label = form.querySelector('[data-add-label]');
    const status = form.querySelector('.add__status');
    label.textContent = 'Added';
    status.textContent = `${p.name}, ${catalog.sizes[size]}, ${catalog.grinds[grind].toLowerCase()} is in your cart.`;
    clearTimeout(form._t);
    form._t = setTimeout(() => { label.textContent = 'Add to cart'; }, 1400);
  });
}
