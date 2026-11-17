// A product page's choices: the size changes the price on the button; Add puts the variant in the cart.
import { add, formatEUR } from './cart.js';
import { getCart, setCart } from './store.js';

export function mountProduct(root, catalog) {
  const p = catalog.products.find((x) => x.id === root.dataset.product);
  const form = root.querySelector('form[data-add]');
  if (!p || !form) return;

  form.addEventListener('change', (e) => {
    if (e.target.name === 'size') form.querySelector('[data-price]').textContent = formatEUR(p.prices[e.target.value]);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const grind = form.elements.grind.value;
    const size = form.elements.size.value;
    setCart(add(getCart(), { id: p.id, size, grind }));
    const label = form.querySelector('[data-add-label]');
    const status = form.querySelector('.add__status');
    label.textContent = 'Added';
    status.textContent = `${p.name}, ${catalog.sizes[size]}, ${catalog.grinds[grind].toLowerCase()} is in your cart.`;
    clearTimeout(form._t);
    form._t = setTimeout(() => { label.textContent = 'Add to cart'; }, 1400);
  });
}
