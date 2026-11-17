// Build the shared parts of every page from site/data/catalog.json and the image manifest:
//  - fills the marked blocks (<!-- @name --> ... <!-- /@name -->) in the hand-written pages
//    (header, coffee carousel, footer, cart drawer), so prices and names have one source;
//  - writes one product page per coffee, site/coffee-<id>.html.
// Usage: node tools/pages.mjs   (after tools/images.mjs; the CI test checks the output is current)
import { readFileSync, writeFileSync } from 'node:fs';
import { picture } from '../site/assets/js/store.js';
import { formatEUR } from '../site/assets/js/cart.js';

const catalog = JSON.parse(readFileSync('site/data/catalog.json', 'utf8'));
const manifest = JSON.parse(readFileSync('site/assets/img/manifest.json', 'utf8'));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const from = (p) => Math.min(...Object.values(p.prices));
const roastTag = (p) => `${p.roast} roast · ${p.origin}`;
export const pageOf = (p) => `coffee-${p.id}.html`;

// ---------- partials ----------
// home: '' on the home page (in-page anchors), './' elsewhere. over: the clear bar over the dark hero.
const header = ({ home, over = false, cart = true }) => `<header class="header header--fixed${over ? ' header--over' : ' header--solid'}" id="top">
  <div class="wrap header__bar">
    <a class="skip-link" href="#main">Skip to content</a>
    <nav class="header__nav" aria-label="Main"><a href="${home}#coffees">Coffees</a><a href="${home}#roast">Roast</a><a href="${home}#brew">Brew</a></nav>
    <a class="wordmark" href="${home ? './' : '#top'}" aria-label="Dolce Nova, home">Dolce Nova</a>
    <div class="header__end">${cart ? `
      <button class="cart-btn" type="button" aria-haspopup="dialog" aria-controls="cart" data-cart-open>
        Cart (<span class="cart-btn__count" data-cart-count aria-live="polite">0</span><span class="visually-hidden"> items</span>)
      </button>` : `<a href="./#coffees">Back to the coffees</a>`}
    </div>
  </div>
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
          <button type="button" data-prev aria-label="Previous coffees"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></button>
          <button type="button" data-next aria-label="Next coffees"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></button>
        </div>
      </div>
    </div>`;

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
      <div class="footer__about">
        <p class="tag">About</p>
        <p><strong>Demo shop.</strong> No payment is taken, nothing is shipped, and card details never leave your browser.</p>
        <p>Dolce Nova is a fictional roastery and a portfolio project.</p>
        <a href="credits.html">Photograph credits</a>
      </div>
    </div>
    <p class="footer__mark" aria-hidden="true">Dolce Nov<span>a</span></p>
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
    <p class="drawer__note">Demo checkout. Nothing is charged.</p>
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
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/instrument-serif-latin.woff2" as="font" type="font/woff2" crossorigin>
${preload.join('\n')}<link rel="stylesheet" href="assets/css/fonts.css">
<link rel="stylesheet" href="assets/css/site.css">
<script>document.documentElement.classList.add('js')</script>
<script type="module" src="assets/js/main.js"></script>
</head>`;

// ---------- product pages ----------
function productPage(p) {
  const m = manifest[`${p.bag}-sq`];
  const sizes = '(min-width: 1024px) min(46vw, 628px), (min-width: 640px) 640px, 100vw';
  const set = m.widths.map((w) => `assets/img/${p.bag}-sq-${w}.avif ${w}w`).join(', ');
  const sizesList = Object.entries(catalog.sizes).filter(([k]) => k in p.prices);
  const others = catalog.products.filter((o) => o.id !== p.id);
  return `${head({
    title: `${p.name} · ${p.roast} roast from ${p.origin} · Dolce Nova`,
    description: `${p.name}, a ${p.roast.toLowerCase()} roast from ${p.origin}: ${p.notes.toLowerCase()}. ${catalog.sizes['340g']} from ${formatEUR(from(p))}, whole bean or ground. A demo shop: no payment is taken.`,
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
      <form class="options" data-add novalidate>
        <fieldset class="choice"><legend>Grind</legend><div class="chips">
          ${Object.entries(catalog.grinds).map(([g, label], i) => `<label class="chip"><input type="radio" name="grind" value="${g}"${i === 0 ? ' checked' : ''}>${esc(label)}</label>`).join('\n          ')}
        </div></fieldset>
        <fieldset class="choice"><legend>Size</legend><div class="chips">
          ${sizesList.map(([s, label], i) => `<label class="chip"><input type="radio" name="size" value="${s}" data-price="${formatEUR(p.prices[s])}"${i === 0 ? ' checked' : ''}>${esc(label)} · ${formatEUR(p.prices[s])}</label>`).join('\n          ')}
        </div></fieldset>
        <div class="add">
          <button class="btn btn--block" type="submit"><span data-add-label>Add to cart</span> · <span data-add-price>${formatEUR(p.prices[sizesList[0][0]])}</span></button>
          <p class="add__status" role="status" aria-live="polite"></p>
          <noscript><p>The cart needs JavaScript.</p></noscript>
        </div>
      </form>
      <dl class="facts">
        <dt>Origin</dt><dd>${esc(p.origin)}</dd>
        <dt>Process</dt><dd>${esc(p.process)}</dd>
        <dt>Roast</dt><dd>${esc(p.roast)}</dd>
        <dt>Bag</dt><dd>${sizesList.map(([, l]) => l).join(' or ')}, resealable</dd>
        <dt>Shipping</dt><dd>None: this is a demo shop</dd>
      </dl>
    </div>
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
fill('site/index.html', { header: header({ home: '', over: true }), coffees: carousel(catalog.products, 'The coffees'), footer: footer({ home: '' }), drawer });
for (const f of ['site/checkout.html', 'site/success.html', 'site/credits.html']) fill(f, { header: header({ home: './', cart: false }) });
console.log(`pages: ${catalog.products.length} product pages; index, checkout, success, credits filled`);
