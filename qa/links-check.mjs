// Every internal link and asset on every page points at a file that exists (2026-11-18, with the legal pages):
// href and src values that are not external, mailto or in-page anchors, resolved against site/, plus each
// in-page anchor (#id) that targets an element on its own page. External links must open safely.
// Usage: node qa/links-check.mjs   (no server needed)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'site';
const pages = readdirSync(SITE).filter((f) => f.endsWith('.html'));
const ids = Object.fromEntries(pages.map((p) => [p, new Set([...readFileSync(join(SITE, p), 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
const bad = [];
let checked = 0;
for (const p of pages) {
  const html = readFileSync(join(SITE, p), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    const url = m[2];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(url)) continue;
    checked++;
    const [path, hash] = url.split('#');
    const file = path === '' ? p : path === './' ? 'index.html' : path.replace(/^\.\//, '').split('?')[0];
    if (!existsSync(join(SITE, file))) { bad.push(`${p}: ${url} (no ${file})`); continue; }
    if (hash && file.endsWith('.html') && ids[file] && !ids[file].has(hash) && hash !== 'top') bad.push(`${p}: ${url} (no #${hash} in ${file})`);
  }
  for (const m of html.matchAll(/<a\s[^>]*href="https?:[^"]+"[^>]*>/g)) {
    checked++;
    if (/target="_blank"/.test(m[0]) && !/rel="[^"]*noopener/.test(m[0])) bad.push(`${p}: external link opens a new tab without rel=noopener: ${m[0].slice(0, 80)}`);
  }
}
console.log(`${bad.length ? 'FAIL' : 'PASS'} links: ${checked} links and assets on ${pages.length} pages${bad.length ? '\n  ' + bad.join('\n  ') : ', every one resolves'}`);
process.exit(bad.length ? 1 : 0);
