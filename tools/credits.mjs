// Write site/credits.html from site/assets/img/manifest.json: one entry per source photograph with
// author, licence, source page and whether it was cropped. Usage: node tools/credits.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('site/assets/img/manifest.json', 'utf8'));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const strip = (s) => String(s).replace(/<[^>]+>/g, '').trim();

const bySource = new Map();
for (const [name, m] of Object.entries(manifest)) {
  const e = bySource.get(m.source) || { ...m, uses: [] };
  e.uses.push(name + (m.cropped ? ' (cropped)' : ''));
  bySource.set(m.source, e);
}
const items = [...bySource.values()].map((m) => `
      <li><a class="link" href="${esc(m.page)}">${esc(strip(m.by))}</a>, ${m.licenceUrl ? `<a class="link" href="${esc(m.licenceUrl)}">${esc(m.licence)}</a>` : esc(m.licence)}, via Wikimedia Commons.
        <span class="t-soft">Used as: ${esc(m.uses.join(', '))}. Converted to AVIF and WebP; resized${m.uses.some((u) => u.includes('cropped')) ? ' and cropped' : ''}.</span></li>`).join('');

writeFileSync('site/credits.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Photograph credits · Dolce Nova</title>
<meta name="description" content="The photographers, licences and source pages of the photographs on the Dolce Nova demo shop.">
<meta name="theme-color" content="#f6f1e7">
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/css/fonts.css">
<link rel="stylesheet" href="assets/css/site.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="header">
  <div class="wrap header__bar">
    <a class="wordmark" href="./">Dolce Nova</a>
    <a class="link-arrow" href="./"><span aria-hidden="true">←</span> Back to the shop</a>
  </div>
</header>
<main id="main" class="page">
  <div class="wrap"><div class="done">
    <h1>Photograph credits</h1>
    <p class="t-lede">Dolce Nova is fictional, so every photograph is a licensed stand-in by the photographers below, not a picture of this shop or its coffee.</p>
    <ul class="credits">${items}
    </ul>
    <p class="t-soft">The 3D roast path uses <a class="link" href="https://threejs.org/">three.js</a> (MIT licence). Fonts: EB Garamond and Figtree (SIL Open Font License).</p>
  </div></div>
</main>
</body>
</html>
`);
console.log('credits.html:', bySource.size, 'sources');
