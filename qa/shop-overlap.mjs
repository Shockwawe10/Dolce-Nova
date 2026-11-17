// No coffee name may overlap its price at any phone width (gate finding "collide", 2026-11-17).
// Usage: node tools/serve.mjs & node qa/shop-overlap.mjs   (BASE env for another server)
import { webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
const browser = await webkit.launch();
let bad = 0;
for (const w of [320, 360, 375, 390, 414, 430]) {
  const page = await browser.newPage({ viewport: { width: w, height: 800 } });
  await page.goto(BASE + '?qa', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const hits = await page.evaluate(() => [...document.querySelectorAll('.coffee__row')].flatMap((row) => {
    const name = row.querySelector('.coffee__toggle').getBoundingClientRect();
    const r = document.createRange(); r.selectNodeContents(row.querySelector('.coffee__toggle'));
    const text = r.getBoundingClientRect();   // the words themselves, which can spill past the button
    const price = row.querySelector('.coffee__price').getBoundingClientRect();
    const over = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    return over(text, price) || over(name, price) ? [row.querySelector('.coffee__toggle').textContent.trim()] : [];
  }));
  console.log(`${hits.length ? 'FAIL' : 'PASS'} ${w}px: ${hits.length ? 'overlaps ' + hits.join(', ') : 'no name overlaps its price'}`);
  bad += hits.length;
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
