// Screenshots of the 3D roast path at p = 0, .25, .5, .75, 1 (intro, green, light, medium, dark).
// Usage: node tools/serve.mjs & node qa/roast-shots.mjs [chromium|webkit] [WxH ...]
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const engine = args.includes('webkit') ? webkit : chromium;
const sizes = args.filter((a) => /^\d+x\d+$/.test(a)).map((s) => s.split('x').map(Number));
const BASE = (process.env.BASE || 'http://localhost:4600/Dolce-Nova/') + '?qa';
mkdirSync('qa/out/roast', { recursive: true });
const browser = await engine.launch({ args: engine === chromium ? ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] : [] });
for (const [w, h] of sizes.length ? sizes : [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 1024 ? 2 : 1, hasTouch: w < 1024 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const top = await page.evaluate(() => { const s = document.querySelector('[data-roastpath]'); return { top: s.offsetTop, span: s.offsetHeight - s.querySelector('.roastpath__stage').clientHeight }; });
  await page.evaluate((y) => scrollTo(0, y), top.top - 200);
  await page.waitForFunction(() => window.__roast || document.querySelector('.roastpath--fallback'), null, { timeout: 30000 }).catch(() => {});
  const fallback = await page.evaluate(() => !!document.querySelector('.roastpath--fallback'));
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate((y) => scrollTo(0, y), Math.round(top.top + top.span * p));
    if (!fallback) await page.evaluate(() => window.__roast && window.__roast.settled());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `qa/out/roast/${w}-${String(p * 100).padStart(3, '0')}.png` });
  }
  const q = await page.evaluate(() => window.__roast && window.__roast.quality);
  console.log(`${w}x${h}: ${fallback ? 'FALLBACK' : '3D'} quality ${JSON.stringify(q)} errors ${errors.length ? errors.join(' | ') : 'none'}`);
  await page.close();
}
await browser.close();
