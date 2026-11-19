// A product page's choices: the size changes the price on the button; Add puts the variant in the cart.
// The listeners attach at once, before the catalog has downloaded: each size carries its own price in the
// markup, and Add waits for the catalog. (Found live: a size picked while the catalog was still loading
// left the old price on the button.)
import { add } from './cart.js';
import { getCart, setCart } from './store.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    // the way on, right where the buyer is looking (the critique: the only route was the small cart link up top)
    form.querySelector('[data-add-next]').hidden = false;
    clearTimeout(form._t);
    form._t = setTimeout(() => { label.textContent = 'Add to cart'; }, 1400);
  });

  // the phone's buy bar: shown while the choices are still below the screen, gone once they are reached
  const bar = root.querySelector('[data-buy-bar]');
  const addBtn = form.querySelector('button[type="submit"]');
  if (bar && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      bar.hidden = e.isIntersecting || e.boundingClientRect.top < 0;
    }).observe(addBtn);
    bar.querySelector('[data-buy-jump]').addEventListener('click', (e) => {
      e.preventDefault();
      form.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
      form.querySelector('input[name="grind"]:checked').focus({ preventScroll: true });
    });
  }
}
