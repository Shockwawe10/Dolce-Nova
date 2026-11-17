// Guide 6 and 10.2: check pixels, not state. With the slider at 20, 196 and 230 C, compare the section with the canvas shown
// and hidden; the bean must change at least MIN_PIXELS pixels. Runs locked (?qa) and unlocked, including after a
// forced quality step at rest (setSize clears the canvas; a missed redraw would leave it blank).
// Usage: node tools/serve.mjs & node qa/roast-pixels.mjs [chromium|webkit]     BASE=<url> for the live site
import { chromium, webkit } from 'playwright';

const engineName = process.argv.includes('webkit') ? 'webkit' : 'chromium';
const engine = engineName === 'webkit' ? webkit : chromium;
const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
const MIN_PIXELS = 500;
const browser = await engine.launch();
let failed = 0;

async function changed(page) {
  const on = (await page.screenshot()).toString('base64');
  await page.evaluate(() => { document.querySelector('.roast__canvas').style.visibility = 'hidden'; });
  const off = (await page.screenshot()).toString('base64');
  await page.evaluate(() => { document.querySelector('.roast__canvas').style.visibility = ''; });
  return page.evaluate(async ([a, b]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
    x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let k = 0; k < da.length; k += 4) if (Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]) > 60) n++;
    return n;
  }, [on, off]);
}

for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const locked of [true, false]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 1024 ? 2 : 1 });
    await page.goto(BASE + (locked ? '?qa' : ''), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelector('#roast').scrollIntoView());
    await page.waitForFunction(() => window.__roast, null, { timeout: 60000 }).catch(() => {});
    const counts = [];
    for (const u of [0, 60, 100]) {
      await page.evaluate((v) => { const r = document.querySelector('#roast-temp'); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }, u);
      await page.evaluate(() => window.__roast && window.__roast.settled());
      counts.push(await changed(page));
    }
    if (!locked) {
      await page.evaluate(() => window.__roast && window.__roast.stepQuality());
      await page.evaluate(() => window.__roast && window.__roast.settled());
      counts.push(await changed(page));
    }
    const ok = counts.length && counts.every((n) => n >= MIN_PIXELS);
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${engineName} ${w}x${h} ${locked ? 'locked (?qa)' : 'unlocked + forced quality step'}: bean pixels ${counts.join(', ')} (need ${MIN_PIXELS}+ each)`);
    await page.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
