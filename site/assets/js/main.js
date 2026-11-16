// Home page entry: load data, build the shop, wire the drawer and motion.
import { load } from './store.js';
import { mountShop } from './shop.js';
import { mountDrawer } from './drawer.js';
import { mountReveals, mountHeader, mountHeroDepth, mountRoast } from './motion.js';

mountHeader();
mountHeroDepth();
mountRoast();
mountReveals();

const { catalog, manifest } = await load();
mountShop(document.querySelector('[data-coffees]'), catalog, manifest);
mountDrawer(catalog, manifest);
