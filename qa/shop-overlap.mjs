// No coffee name may overlap its neighbours at any phone width: the carousel captions and the product page head.
// Usage: node tools/serve.mjs & node qa/shop-overlap.mjs   (BASE env for another server)
import { webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
const browser = await webkit.launch();
let bad = 0;
const over = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
for (const w of [320, 360, 375, 390, 414, 430]) {
  const page = await browser.newPage({ viewport: { width: w, height: 800 } });
  const hits = [];
  for (const path of ['', 'coffee-huehuetenango.html']) {
    await page.goto(BASE + path + '?qa', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    hits.push(...await page.evaluate((overSrc) => {
      const over = new Function('return ' + overSrc)();
      const box = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
      const out = [];
      // every caption line in a slide stays inside its slide and off its neighbours
      for (const s of document.querySelectorAll('.slide')) {
        const sr = s.getBoundingClientRect();
        const lines = [...s.querySelectorAll('.tag, .slide__name, .slide__notes, .slide__price')];
        lines.forEach((el, i) => {
          const b = box(el);
          if (b.right > sr.right + 0.5) out.push(el.textContent.trim() + ' runs out of its slide');
          lines.slice(i + 1).forEach((o) => { if (over(b, box(o))) out.push(el.textContent.trim() + ' over ' + o.textContent.trim()); });
        });
      }
      // the product page title stays inside its column
      const h1 = document.querySelector('.pdp h1');
      if (h1 && box(h1).right > h1.parentElement.getBoundingClientRect().right + 0.5) out.push('product title runs out of its column');
      return out;
    }, over.toString()));
  }
  console.log(`${hits.length ? 'FAIL' : 'PASS'} ${w}px: ${hits.length ? hits.join('; ') : 'no caption or title overlaps or runs out'}`);
  bad += hits.length;
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
