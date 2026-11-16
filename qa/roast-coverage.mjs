// Guide 8.2: in the pinned roast path, neither half of the screen may go bare at any scroll position.
// The bean owns one half (right on desktop, top on a phone); a stage card must be readable in the other half
// at every position. Steps through the whole section and lists the bare positions.
// Usage: node tools/serve.mjs & node qa/roast-coverage.mjs   -> exits 1 if any position is bare
import { webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
const MIN_VISIBLE = 0.9; // the card must be at least 90% on screen (a sliver is not readable)
const browser = await webkit.launch();
let failed = 0;
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE + '?qa', { waitUntil: 'networkidle' });
  const res = await page.evaluate(async ({ MIN_VISIBLE }) => {
    const s = document.querySelector('[data-roastpath]');
    const stage = s.querySelector('.roastpath__stage');
    const header = document.querySelector('.header').getBoundingClientRect().height;
    const span = s.offsetHeight - stage.clientHeight;
    const bare = [];
    const STEPS = 120;
    for (let i = 0; i <= STEPS; i++) {
      scrollTo(0, s.offsetTop + (span * i) / STEPS);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const covered = [...s.querySelectorAll('.roastpath__card')].some((c) => {
        const r = c.getBoundingClientRect();
        const vis = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, header));
        return vis >= r.height * MIN_VISIBLE;
      });
      if (!covered) bare.push(+(i / STEPS).toFixed(3));
    }
    return { bare, steps: STEPS + 1 };
  }, { MIN_VISIBLE });
  const ok = res.bare.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} roast coverage ${w}x${h}: ${res.steps - res.bare.length}/${res.steps} positions show a whole card` +
    (ok ? '' : `; bare at p = ${res.bare.slice(0, 12).join(', ')}${res.bare.length > 12 ? ' ...' : ''}`));
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
