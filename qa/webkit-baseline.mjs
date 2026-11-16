// Baselines for the WebKit frame-time number. The same scripted scroll on two bare pages with no CSS
// effects or JS: (a) text only, (b) text plus the site's own photographs as plain <img>. If (b) is slow
// too, this engine build (Playwright WebKit on Windows, software-rendered) is the floor, not the site.
// Usage: node tools/serve.mjs & node qa/webkit-baseline.mjs
import { webkit } from 'playwright';

const BASE = 'http://localhost:4600/Dolce-Nova/';
const text = '<p style="margin:0 16px 16px">Plain paragraph of text for a scroll baseline.</p>'.repeat(40);
const img = (n) => `<img src="${BASE}assets/img/${n}" style="display:block;width:100%;height:auto">`;
const PAGES = {
  'bare text': text.repeat(10),
  'bare text + site photographs': [img('hero-1280.webp'), text, img('origin-1280.webp'), text, img('roast-dark-840.webp'), text, img('brew-1280.webp'), text].join(''),
};

for (const dpr of [3, 1]) {
  for (const [name, body] of Object.entries(PAGES)) {
    const browser = await webkit.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
    await page.goto(BASE + 'credits.html');
    await page.setContent(`<!doctype html><body style="margin:0;font:16px/1.6 sans-serif">${body}</body>`, { waitUntil: 'networkidle' });
    const r = await page.evaluate(async () => {
      const deltas = []; let last = performance.now(), on = true;
      const loop = (t) => { deltas.push(t - last); last = t; if (on) requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      const max = document.documentElement.scrollHeight - innerHeight;
      await new Promise((done) => { let y = 0, prev = performance.now(); const step = (t) => { y = Math.min(max, y + (t - prev) * 1.4); prev = t; scrollTo(0, y); if (y < max) requestAnimationFrame(step); else done(); }; requestAnimationFrame(step); });
      on = false;
      const d = deltas.slice(2);
      return { n: d.length, pct: (100 * d.filter((x) => x < 20).length) / d.length, p95: d.sort((a, b) => a - b)[Math.floor(d.length * 0.95)] };
    });
    console.log(`WebKit (Playwright, Windows) @${dpr}x ${name}: ${r.pct.toFixed(1)}% of ${r.n} frames < 20 ms, p95 ${r.p95.toFixed(1)} ms`);
    await browser.close();
  }
}
