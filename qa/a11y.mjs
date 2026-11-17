// axe-core, WCAG 2.0/2.1/2.2 A + AA, on every page and UI state, in WebKit at 390x844 and 1440x900.
// Usage: node tools/serve.mjs & node qa/a11y.mjs   -> exits 1 on any serious or critical violation
import { webkit } from 'playwright';
import { readFileSync } from 'node:fs';

const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const BASE = 'http://localhost:4600/Dolce-Nova/';
const STATES = [
  ['home', '', async () => {}],
  ['product page, filter grind', 'coffee-huila.html', async (p) => { await p.locator('form[data-add] label:has-text("Filter")').click(); }],
  ['product page: drawer open', 'coffee-yirgacheffe.html', async (p) => { await p.locator('form[data-add] button[type=submit]').click(); await p.click('[data-cart-open]'); await p.waitForSelector('#cart.is-open'); }],
  ['checkout: errors shown', 'checkout.html', async (p) => { await p.click('[data-pay-btn]'); }],
  ['success', 'success.html', async () => {}],
  ['credits', 'credits.html', async () => {}],
];

const browser = await webkit.launch();
let serious = 0;
for (const [w, h] of [[390, 844], [1440, 900]]) {
  for (const [name, path, setup] of STATES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('dn-cart', JSON.stringify([{ id: 'huila', size: '340g', grind: 'filter', qty: 2 }]));
      sessionStorage.setItem('dn-last-order', JSON.stringify({ ref: 'DN-A11Y', totalCents: 2500, lines: [{ name: 'Huila La Plata', size: '250 g', grind: 'Filter', qty: 2, lineCents: 2500 }] }));
    });
    await page.goto(BASE + path + (path === 'success.html' ? '?order=DN-A11Y' : ''), { waitUntil: 'networkidle' });
    await setup(page);
    await page.evaluate(AXE);
    const res = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
    const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    serious += bad.length;
    const line = res.violations.map((v) => `${v.impact} ${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${name} @${w}: ${res.violations.length} violations, ${res.passes.length} rules passed, ${res.incomplete.length} need review${line.length ? '\n  ' + line.join('\n  ') : ''}`);
    await ctx.close();
  }
}
await browser.close();
process.exit(serious ? 1 : 0);
