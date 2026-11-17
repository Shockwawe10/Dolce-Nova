// Guide 8.2 for the still-life roast: at every scroll position through the pinned section, the words are whole
// on screen (the header never covers them), exactly one stage is marked, and the note shown is that stage's.
// Usage: node tools/serve.mjs & node qa/roast-coverage.mjs   -> exits 1 on any bad position
import { webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
const browser = await webkit.launch();
let failed = 0;
for (const [w, h] of [[1440, 900], [390, 844], [360, 640]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE + '?qa', { waitUntil: 'networkidle' });
  await page.evaluate(() => { const s = document.querySelector('[data-roastpath]'); scrollTo(0, s.offsetTop - 200); });
  await page.waitForFunction(() => window.__roast, null, { timeout: 60000 }).catch(() => {});
  const res = await page.evaluate(async () => {
    const s = document.querySelector('[data-roastpath]');
    const stage = s.querySelector('.roastpath__stage');
    const text = s.querySelector('.roastpath__copy');
    const header = document.querySelector('.header').getBoundingClientRect().bottom;
    const span = s.offsetHeight - stage.clientHeight;
    const bad = [];
    const STEPS = 60;
    for (let i = 0; i <= STEPS; i++) {
      scrollTo(0, s.offsetTop + (span * i) / STEPS);
      if (window.__roast) await window.__roast.settled();
      const r = text.getBoundingClientRect();
      const on = [...s.querySelectorAll('[data-roast-stage].is-on')];
      const notes = [...s.querySelectorAll('[data-roast-note].is-on')];   // the class, not the computed opacity: that may be mid-fade
      const steps = [...s.querySelectorAll('[data-roast-stage]')];
      const why = [];
      if (r.top < header - 0.5 || r.bottom > innerHeight + 0.5) why.push(`words cut (${Math.round(r.top)} to ${Math.round(r.bottom)})`);
      if (on.length !== 1) why.push(`${on.length} stages marked`);
      else if (notes.length !== 1 || [...s.querySelectorAll('[data-roast-note]')].indexOf(notes[0]) !== steps.indexOf(on[0])) why.push('the note shown is not the marked stage');
      if (why.length) bad.push(`p ${(i / STEPS).toFixed(2)}: ${why.join(', ')}`);
    }
    return { bad, steps: STEPS + 1, has3d: !!window.__roast };
  });
  const ok = res.bad.length === 0 && res.has3d;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} roast words ${w}x${h}: ${res.steps - res.bad.length}/${res.steps} positions whole and in step` +
    (res.has3d ? '' : ' (the 3D never loaded)') + (res.bad.length ? `; ${res.bad.slice(0, 4).join('; ')}` : ''));
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
