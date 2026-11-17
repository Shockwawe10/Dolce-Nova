// The desktop hero: the words line up with the bag (the owner, 2026-11-17). Measures the text block (the h1's
// top to the buttons' bottom) against the bag's printed body, which fills 13.3% to 89.8% of its square photo
// (measured from the owner's render), and the hero's height against the window.
// Usage: node tools/serve.mjs & node qa/hero-align.mjs   -> exits 1 if a size is out of line
import { webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
const BAG = [0.133, 0.898];          // the bag's top and bottom inside its square image
const MAX_CENTRE = 24;               // px between the two centres
const MAX_EDGE = 64;                 // px between the text's top/bottom and the bag's
const browser = await webkit.launch();
let failed = 0;
for (const [w, h] of [[1024, 768], [1280, 800], [1440, 900], [1876, 960], [1920, 1080], [2560, 1440]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1400);   // the entrance has settled
  const m = await page.evaluate(([b0, b1]) => {
    const img = document.querySelector('.hero__bag img').getBoundingClientRect();
    const top = document.querySelector('.hero h1').getBoundingClientRect().top;
    const bottom = document.querySelector('.hero .actions').getBoundingClientRect().bottom;
    const bag = { top: img.top + img.height * b0, bottom: img.top + img.height * b1 };
    return { text: { top, bottom }, bag, hero: document.querySelector('.hero').getBoundingClientRect().height };
  }, BAG);
  const dc = Math.abs((m.text.top + m.text.bottom) / 2 - (m.bag.top + m.bag.bottom) / 2);
  const dt = Math.abs(m.text.top - m.bag.top), db = Math.abs(m.text.bottom - m.bag.bottom);
  const ok = dc <= MAX_CENTRE && dt <= MAX_EDGE && db <= MAX_EDGE && m.hero <= h;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} hero ${w}x${h}: centres ${dc.toFixed(0)}px apart, top ${dt.toFixed(0)}px, bottom ${db.toFixed(0)}px; hero ${Math.round(m.hero)}px of ${h}`);
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
