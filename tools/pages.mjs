// Build the shared parts of every page from site/data/catalog.json and the image manifest:
//  - fills the marked blocks (<!-- @name --> ... <!-- /@name -->) in the hand-written pages
//    (header, coffee carousel, footer, cart drawer), so prices and names have one source;
//  - writes one product page per coffee, site/coffee-<id>.html.
// Usage: node tools/pages.mjs   (after tools/images.mjs; the CI test checks the output is current)
import { readFileSync, writeFileSync } from 'node:fs';
import { picture } from '../site/assets/js/store.js';
import { formatEUR } from '../site/assets/js/cart.js';
import { LEGAL, SOCIAL, UPDATED } from './legal-content.mjs';

const catalog = JSON.parse(readFileSync('site/data/catalog.json', 'utf8'));
const manifest = JSON.parse(readFileSync('site/assets/img/manifest.json', 'utf8'));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const from = (p) => Math.min(...Object.values(p.prices));
const roastTag = (p) => `${p.roast} roast · ${p.origin}`;
// A small drawn mark per grind (the brief: "the choice is visual, not a dropdown"): the whole bean with its cut,
// fine even grains for espresso, fewer and larger grains for filter. One stroke weight, currentColor.
const dots = (pts, r) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
const GRIND_MARK = {
  whole: '<svg class="grind-mark" viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="10" cy="10" rx="5.5" ry="7.5" transform="rotate(30 10 10)" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12.4 4.9c-2.6 2.2-.4 4.7-2.6 7.4-1 1.2-1.7 1.9-2.2 2.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  espresso: `<svg class="grind-mark" viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">${dots([[4, 5], [8, 4], [12, 5], [16, 4], [6, 8], [10, 8], [14, 9], [4, 12], [8, 12], [12, 12], [16, 12], [6, 16], [10, 16], [14, 15]], 1.1)}</svg>`,
  filter: `<svg class="grind-mark" viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">${dots([[5, 5], [12, 4.5], [8.5, 10], [15.5, 10], [4.5, 14.5], [12, 15.5]], 2)}</svg>`,
};
// What each process means, in a line, under the fact (the critique, 2026-11-19: "Washed" was never explained).
const PROCESS = {
  Washed: 'The fruit is washed off before the beans dry: a clean, bright cup.',
  Natural: 'The beans dry inside the whole cherry: a fruitier, heavier cup.',
  'Sugarcane EA': 'Decaffeinated with ethyl acetate made from sugarcane, before roasting.',
};
export const pageOf = (p) => `coffee-${p.id}.html`;

// ---------- partials ----------
// home: '' on the home page (in-page anchors), './' elsewhere. over: the clear bar over the dark hero.
const header = ({ home, over = false, cart = true }) => `<header class="header header--fixed${over ? ' header--over' : ' header--solid'}" id="top">
  <div class="wrap header__bar">
    <a class="skip-link" href="#main">Skip to content</a>
    <nav class="header__nav" aria-label="Main">
      <button class="header__menu" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <div class="header__links" id="site-nav"><a href="${home}#coffees">Coffees</a><a href="${home}#roast">Roast</a><a href="${home}#brew">Brew</a></div>
    </nav>
    <a class="wordmark" href="${home ? './' : '#top'}" aria-label="Dolce Nova, home">Dolce Nova</a>
    <div class="header__end">${cart ? `
      <button class="cart-btn" type="button" aria-haspopup="dialog" aria-controls="cart" data-cart-open>
        Cart (<span class="cart-btn__count" data-cart-count aria-live="polite">0</span><span class="visually-hidden"> items</span>)
      </button>` : `<a class="header__back" href="./#coffees">Back to the coffees</a>`}
    </div>
  </div>
  <script>/* the phone menu (2026-11-19): opens and closes the section links; a link or Esc closes it */
  (() => { const h = document.currentScript.closest('header'), b = h.querySelector('.header__menu');
    const set = (o) => { b.setAttribute('aria-expanded', String(o)); h.classList.toggle('is-menu', o); };
    b.addEventListener('click', () => set(b.getAttribute('aria-expanded') !== 'true'));
    h.querySelectorAll('.header__links a').forEach((a) => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && b.getAttribute('aria-expanded') === 'true') { set(false); b.focus(); } }); })();</script>
</header>`;

// lazy: on the home page the row is the second screen, so its bags load with the page at low priority (lazy images
// in a sideways scroller load late and show empty frames); on a product page the row is far below the fold.
const slide = (p, lazy) => `<li class="slide">
          <a class="slide__link" href="${pageOf(p)}">
            <div class="slide__media">${picture(manifest, p.bag, { sizes: '(min-width: 1024px) 360px, (min-width: 640px) 40vw, 76vw', lazy }).replace('<img ', lazy ? '<img ' : '<img fetchpriority="low" ')}</div>
            <p class="tag">${esc(roastTag(p))}</p>
            <h3 class="slide__name">${esc(p.name)}</h3>
            <p class="slide__notes">${esc(p.notes)}</p>
            <p class="slide__price">from ${formatEUR(from(p))}</p>
          </a>
        </li>`;

const carousel = (products, label, lazy = false) => `<div class="carousel" data-carousel>
      <ul class="carousel__track" aria-label="${esc(label)}">
        ${products.map((p) => slide(p, lazy)).join('\n        ')}
      </ul>
      <div class="wrap carousel__bar">
        <div class="carousel__progress" aria-hidden="true"><span></span></div>
        <div class="carousel__nav">
          <button type="button" data-prev aria-label="Previous coffees"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.25" fill="none"/></svg></button>
          <button type="button" data-next aria-label="Next coffees"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.25" fill="none"/></svg></button>
        </div>
      </div>
    </div>`;

const legalLinks = () => LEGAL.map((l) => `<a href="${l.file}">${esc(l.label)}</a>`);
const external = (x) => `<a href="${x.href}" target="_blank" rel="noopener noreferrer">${esc(x.name)}<span class="visually-hidden"> (opens ${new URL(x.href).hostname.replace('www.', '')} in a new tab)</span></a>`;
const copyright = '© 2026 Dolce Nova. All rights reserved.';

const footer = ({ home }) => `<footer class="footer">
  <div class="wrap footer__wrap">
    <div class="footer__cols">
      <nav aria-label="Coffees">
        <p class="tag">Coffees</p>
        ${catalog.products.map((p) => `<a href="${pageOf(p)}">${esc(p.name)}</a>`).join('\n        ')}
      </nav>
      <nav aria-label="Craft">
        <p class="tag">Craft</p>
        <a href="${home}#origin">Origin</a>
        <a href="${home}#roast">Roast</a>
        <a href="${home}#brew">Brew</a>
      </nav>
      <nav aria-label="Help">
        <p class="tag">Help</p>
        ${legalLinks().join('\n        ')}
      </nav>
      <nav aria-label="Follow">
        <p class="tag">Follow</p>
        ${SOCIAL.map(external).join('\n        ')}
      </nav>
      <div class="footer__about">
        <p class="tag">About</p>
        <p>Dolce Nova roasts six single-origin coffees in small batches and sends them out whole or ground for your brewer.</p>
        <p>Standard shipping is free from €40.</p>
      </div>
    </div>
    <div class="footer__bar">
      <p class="footer__legal"><span class="lion" aria-hidden="true"></span>${copyright}</p>
      <a href="credits.html">Photograph credits</a>
    </div>
    <p class="footer__mark" aria-hidden="true">Dolce Nov<span>a</span></p>
  </div>
</footer>`;

// checkout, confirmation and credits: just the policies and the copyright line
const footerSlim = `<footer class="footer footer--slim">
  <div class="wrap footer__bar">
    <p class="footer__legal"><span class="lion" aria-hidden="true"></span>${copyright}</p>
    <nav aria-label="Policies">${[...legalLinks(), '<a href="credits.html">Photograph credits</a>'].join(' ')}</nav>
  </div>
</footer>`;

const drawer = `<div class="scrim" data-scrim hidden></div>
<aside class="drawer" id="cart" role="dialog" aria-modal="true" aria-labelledby="cart-title" tabindex="-1" hidden>
  <div class="drawer__head">
    <h2 id="cart-title">Your cart</h2>
    <button class="icon-btn" type="button" data-cart-close aria-label="Close cart">
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
    </button>
  </div>
  <div class="drawer__body" data-cart-lines></div>
  <div class="drawer__foot" data-cart-foot>
    <p class="drawer__total"><span>Subtotal</span><span data-cart-total>€0.00</span></p>
    <a class="btn btn--block" href="checkout.html" data-checkout>Go to checkout</a>
    <div class="drawer__free" data-cart-free>
      <p class="drawer__note" data-cart-free-text>Standard shipping is free from €40.</p>
      <span class="drawer__free-track" aria-hidden="true"><span data-cart-free-bar></span></span>
    </div>
  </div>
</aside>`;

const head = ({ title, description, image, preload = [] }) => `<!doctype html>
<html lang="en" data-type="product">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#f7f5f0">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="product">
<meta property="og:image" content="${image}">
<link rel="icon" href="assets/icon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="assets/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="assets/icon-180.png">
<link rel="preload" href="assets/fonts/instrument-serif-latin.woff2" as="font" type="font/woff2" crossorigin>
${preload.join('\n')}<link rel="stylesheet" href="assets/css/fonts.css">
<link rel="stylesheet" href="assets/css/site.css">
<script>document.documentElement.classList.add('js')</script>
<script type="module" src="assets/js/main.js"></script>
</head>`;

// ---------- product pages ----------
// where the coffee comes from: the land, full width, then the story and the facts (typical of the region)
function originStory(p) {
  const r = p.region;
  if (!r) return '';
  return `  <section class="origin-story" aria-labelledby="origin-title">
    <figure class="origin-story__photo" data-parallax>
      ${picture(manifest, r.photo, { sizes: 'max(100vw, 120vh)' })}   <!-- the band is up to 64vh tall (x1.24 with parallax), cropped from 3:2 -->
      <figcaption class="wrap"><span class="tag">${esc(r.caption)}</span></figcaption>
    </figure>
    <div class="wrap origin-story__body">
      <div class="origin-story__head">
        <p class="tag">Origin · ${esc(r.country)}</p>
        <h2 id="origin-title">${esc(r.title)}</h2>
      </div>
      <div class="origin-story__text">
        ${r.text.map((t) => `<p>${esc(t)}</p>`).join('\n        ')}
        <dl class="facts">
          ${r.facts.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('\n          ')}
        </dl>
        <p class="origin-story__note">Altitude, harvest and varieties are typical of the region.</p>
      </div>
    </div>
  </section>
`;
}

function productPage(p) {
  const m = manifest[`${p.bag}-sq`];
  const sizes = '(min-width: 1024px) min(46vw, 628px), (min-width: 640px) 640px, 100vw';
  const set = m.widths.map((w) => `assets/img/${p.bag}-sq-${w}.avif ${w}w`).join(', ');
  const sizesList = Object.entries(catalog.sizes).filter(([k]) => k in p.prices);
  const others = catalog.products.filter((o) => o.id !== p.id);
  return `${head({
    title: `${p.name} · ${p.roast} roast from ${p.origin} · Dolce Nova`,
    description: `${p.name}, a ${p.roast.toLowerCase()} roast from ${p.origin}: ${p.notes.toLowerCase()}. ${catalog.sizes['340g']} from ${formatEUR(from(p))}, whole bean or ground.`,
    image: `assets/img/${p.bag}-sq-1024.webp`,
    preload: [`<link rel="preload" as="image" type="image/avif" fetchpriority="high" imagesrcset="${set}" imagesizes="${sizes}">\n`],
  })}
<body>
<!-- @header -->
${header({ home: './' })}
<!-- /@header -->

<main id="main" class="pdp" data-product="${p.id}">
  <div class="wrap pdp__grid">
    <div class="pdp__media">
      ${picture(manifest, `${p.bag}-sq`, { sizes, lazy: false }).replace('<img ', '<img fetchpriority="high" ')}
    </div>
    <div class="pdp__info">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="./#coffees">Coffees</a> / <span aria-current="page">${esc(p.name)}</span></nav>
      <div class="pdp__head">
        <p class="tag">${esc(roastTag(p))} · ${esc(p.process)}</p>
        <h1>${esc(p.name)}</h1>
        <p class="pdp__price">${catalog.sizes['340g']} · ${formatEUR(p.prices['340g'])}</p>
      </div>
      <p class="pdp__notes">${esc(p.notes)}.</p>
      <p>${esc(p.about)}</p>
      <form class="options" id="buy" data-add novalidate>
        <fieldset class="choice" aria-describedby="grind-hint-${p.id}"><legend>Grind</legend>
        <p class="choice__hint" id="grind-hint-${p.id}">Whole bean for your own grinder. Espresso is fine, for machines and moka pots. Filter is medium, for pour-over and drip.</p>
        <div class="chips chips--grind">
          ${Object.entries(catalog.grinds).map(([g, label], i) => `<label class="chip chip--grind"><input type="radio" name="grind" value="${g}"${i === 0 ? ' checked' : ''}>${GRIND_MARK[g] || ''}${esc(label)}</label>`).join('\n          ')}
        </div></fieldset>
        <fieldset class="choice"><legend>Size</legend><div class="chips">
          ${sizesList.map(([s, label], i) => `<label class="chip"><input type="radio" name="size" value="${s}" data-price="${formatEUR(p.prices[s])}"${i === 0 ? ' checked' : ''}>${esc(label)} · ${formatEUR(p.prices[s])}</label>`).join('\n          ')}
        </div></fieldset>
        <div class="add">
          <button class="btn btn--block" type="submit"><span data-add-label>Add to cart</span> · <span data-add-price>${formatEUR(p.prices[sizesList[0][0]])}</span></button>
          <p class="add__status" role="status" aria-live="polite"></p>
          <p class="add__next" data-add-next hidden><button class="link-arrow" type="button" data-cart-open>View cart</button><a class="link-arrow" href="checkout.html">Checkout <span aria-hidden="true">→</span></a></p>
          <noscript><p>The cart needs JavaScript.</p></noscript>
        </div>
      </form>
      <dl class="facts">
        <dt>Origin</dt><dd>${esc(p.origin)}</dd>
        <dt>Process</dt><dd>${esc(p.process)}${PROCESS[p.process] ? `<span class="facts__note">${PROCESS[p.process]}</span>` : ''}</dd>
        <dt>Roast</dt><dd>${esc(p.roast)}</dd>
        <dt>Bag</dt><dd>${sizesList.map(([, l]) => l).join(' or ')}, resealable</dd>
        <dt>Shipping</dt><dd>Standard 3–5 working days, free from €40; Express 1–2 working days</dd>
      </dl>
    </div>
  </div>

${originStory(p)}
  <!-- on a phone, until the choices come into view: the name, the lowest price, and a jump to the choices
       (product.js). It never adds by itself: the grind is the buyer's to choose -->
  <div class="buy-bar" data-buy-bar hidden>
    <p class="buy-bar__what"><span>${esc(p.name)}</span><span class="t-soft">from ${formatEUR(Math.min(...Object.values(p.prices)))}</span></p>
    <a class="btn" href="#buy" data-buy-jump>Choose grind<span class="buy-bar__more">&amp; size</span></a>
  </div>
  <section class="more coffees" aria-labelledby="more-title">
    <div class="wrap section__head"><h2 id="more-title">More coffees</h2></div>
    ${carousel(others, 'More coffees', true)}
  </section>
</main>

<!-- @footer -->
${footer({ home: './' })}
<!-- /@footer -->

<!-- @drawer -->
${drawer}
<!-- /@drawer -->
</body>
</html>
`;
}

// ---------- the legal pages (tools/legal-content.mjs) ----------
const inline = (part) => (typeof part === 'string' ? esc(part) : `<a class="link" href="${part.href}"${/^https?:/.test(part.href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(part.text)}</a>`);
const block = (b) => {
  if (typeof b === 'string') return `<p>${esc(b)}</p>`;
  if (b[0] === 'list') return `<ul class="legal__list">${b.slice(1).map((li) => `<li>${esc(li)}</li>`).join('')}</ul>`;
  return `<p>${b.map(inline).join('')}</p>`;
};
function legalPage(l) {
  return `${head({ title: `${l.title} · Dolce Nova`, description: l.lede, image: 'assets/img/bag-cerrado-sq-1024.webp' })}
<body>
<!-- @header -->
${header({ home: './' })}
<!-- /@header -->

<main id="main" class="page legal">
  <div class="wrap legal__wrap">
    <header class="legal__head">
      <p class="tag">Last updated ${UPDATED}</p>
      <h1>${esc(l.title)}</h1>
      <p class="t-lede">${esc(l.lede)}</p>
    </header>
    <div class="legal__body">
      ${l.sections.map(([h, blocks]) => `<section>
        <h2>${esc(h)}</h2>
        ${blocks.map(block).join('\n        ')}
      </section>`).join('\n      ')}
    </div>
  </div>
</main>

<!-- @footer -->
${footer({ home: './' })}
<!-- /@footer -->

<!-- @drawer -->
${drawer}
<!-- /@drawer -->
</body>
</html>
`;
}

// ---------- fill the marked blocks in the hand-written pages ----------
function fill(file, blocks) {
  let html = readFileSync(file, 'utf8');
  for (const [name, content] of Object.entries(blocks)) {
    const re = new RegExp(`(<!-- @${name} -->)[\\s\\S]*?(<!-- /@${name} -->)`);
    if (!re.test(html)) throw new Error(`${file}: no <!-- @${name} --> block`);
    html = html.replace(re, (_, a, b) => `${a}\n${content}\n${b}`);
  }
  writeFileSync(file, html);
}

for (const p of catalog.products) writeFileSync(`site/${pageOf(p)}`, productPage(p));
// the roast section ends on the coffees, grouped by the roast they are sold at (the critique, 2026-11-19: the
// section led nowhere); the catalog's roasts are light, medium and medium-dark
const ROAST_ORDER = ['Light', 'Medium', 'Medium-dark', 'Dark'];
const roastShop = `<nav class="roast__shop" aria-label="The coffees by roast">
        ${ROAST_ORDER.filter((r) => catalog.products.some((p) => p.roast === r)).map((r) => `<div class="roast__shop-group">
          <p class="roast__shop-roast">${r}</p>
          <p>${catalog.products.filter((p) => p.roast === r).map((p) => `<a class="link" href="${pageOf(p)}">${esc(p.name)}</a>`).join(', ')}</p>
        </div>`).join('\n        ')}
      </nav>`;
fill('site/index.html', { header: header({ home: '', over: true }), roastshop: roastShop, coffees: carousel(catalog.products, 'The coffees'), footer: footer({ home: '' }), drawer });
for (const l of LEGAL) writeFileSync(`site/${l.file}`, legalPage(l));
for (const f of ['site/checkout.html', 'site/success.html', 'site/credits.html']) fill(f, { header: header({ home: './', cart: false }), footer: footerSlim });
console.log(`pages: ${catalog.products.length} product pages, ${LEGAL.length} legal pages; index, checkout, success, credits filled`);
