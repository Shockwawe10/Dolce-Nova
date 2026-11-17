// Entry for the home page and the product pages: header, carousels, the roast path (home only),
// the product form (product pages only) and the cart drawer.
import { load } from './store.js';
import { mountDrawer } from './drawer.js';
import { mountCarousels } from './carousel.js';
import { mountProduct } from './product.js';
import { mountHeader, mountRoastPath, mountAnchors } from './motion.js';

mountHeader();
mountAnchors();
mountCarousels();
mountRoastPath();

const { catalog, manifest } = await load();
const product = document.querySelector('[data-product]');
if (product) mountProduct(product, catalog);
mountDrawer(catalog, manifest);
