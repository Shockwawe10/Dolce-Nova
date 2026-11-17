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
const items = [...bySource.values()].map((m) => m.owner ? `
      <li>${esc(m.by)}: the bag designs and renders, ${esc(m.licence)}.
        <span class="t-soft">Used as: ${esc(m.uses.join(', '))}. Converted to AVIF and WebP; resized and cropped.</span></li>` : `
      <li><a class="link" href="${esc(m.page)}">${esc(strip(m.by))}</a>, ${m.licenceUrl ? `<a class="link" href="${esc(m.licenceUrl)}">${esc(m.licence)}</a>` : esc(m.licence)}, via Wikimedia Commons.
        <span class="t-soft">Used as: ${esc(m.uses.join(', '))}. Converted to AVIF and WebP; resized${m.uses.some((u) => u.includes('cropped')) ? ' and cropped' : ''}.</span></li>`).join('');

writeFileSync('site/credits.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Photograph credits · Dolce Nova</title>
<meta name="description" content="The photographers, licences and source pages of the photographs on the Dolce Nova site.">
<meta name="theme-color" content="#f7f5f0">
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/css/fonts.css">
<link rel="stylesheet" href="assets/css/site.css">
</head>
<body>
<!-- @header -->
<!-- /@header -->
<main id="main" class="page">
  <div class="wrap"><div class="done">
    <h1>Photograph credits</h1>
    <p class="t-lede">The bags are our own designs. The other photographs are by the photographers below, used under their licences.</p>
    <ul class="credits">${items}
    </ul>
    <p class="t-soft">The 3D roast path uses <a class="link" href="https://threejs.org/">three.js</a> (MIT licence). Fonts: Instrument Serif and Instrument Sans (SIL Open Font License).</p>
  </div></div>
</main>
</body>
</html>
`);
console.log('credits.html:', bySource.size, 'sources');
