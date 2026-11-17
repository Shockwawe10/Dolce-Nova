// Entry for the home page and the product pages: header, carousels, the roast path (home only),
// the product form (product pages only) and the cart drawer. Everything a visitor can touch is wired
// before the catalog has loaded; only the cart itself waits for it.
import { load } from './store.js';
import { mountDrawer } from './drawer.js';
import { mountCarousels } from './carousel.js';
import { mountProduct } from './product.js';
import { mountBrew } from './brew.js';
import { mountRoastUI } from './roast-ui.js';
import { mountHeader, mountRoastPath, mountAnchors } from './motion.js';

mountHeader();
mountAnchors();
mountCarousels();
mountBrew();
mountRoastUI();
mountRoastPath();

const ready = load();
const product = document.querySelector('[data-product]');
if (product) mountProduct(product, ready);
const { catalog, manifest } = await ready;
mountDrawer(catalog, manifest);
