// Brew at home (2026-11-17): the three recipe tabs work by click and by keyboard (arrows, Home, End), the
// photograph follows the tab, exactly one recipe shows, and switching never changes the section's height.
// Usage: node tools/serve.mjs & node qa/brew-tabs.mjs
import { webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
const browser = await webkit.launch();
let failed = 0;
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const state = () => page.evaluate(() => ({
    selected: [...document.querySelectorAll('.brew [role="tab"]')].findIndex((t) => t.getAttribute('aria-selected') === 'true'),
    shown: [...document.querySelectorAll('.recipe')].map((p, i) => (getComputedStyle(p).visibility === 'visible' ? i : -1)).filter((i) => i >= 0),
    photo: [...document.querySelectorAll('[data-brew-photo]')].findIndex((p) => p.classList.contains('is-on')),
    height: document.querySelector('#brew').offsetHeight,
    focus: document.activeElement.id,
  }));
  const steps = [];
  const expect = (s, k, why) => {
    const ok = s.selected === k && s.shown.length === 1 && s.shown[0] === k && s.photo === k;
    steps.push(`${ok ? 'ok' : 'BAD'} ${why}`);
    return ok;
  };
  let ok = true;
  const first = await state();
  ok = expect(first, 0, 'starts on pour-over') && ok;
  await page.click('#tab-moka');
  ok = expect(await state(), 1, 'click moka') && ok;
  await page.keyboard.press('ArrowRight');
  const s2 = await state();
  ok = expect(s2, 2, 'ArrowRight to espresso') && s2.focus === 'tab-espresso' && ok;
  await page.keyboard.press('ArrowRight');
  ok = expect(await state(), 0, 'ArrowRight wraps to pour-over') && ok;
  await page.keyboard.press('End');
  ok = expect(await state(), 2, 'End') && ok;
  await page.keyboard.press('Home');
  const last = await state();
  ok = expect(last, 0, 'Home') && ok;
  const heights = new Set([first.height, s2.height, last.height]);
  if (heights.size !== 1) { ok = false; steps.push(`BAD height changed: ${[...heights].join(', ')}`); }
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} brew tabs ${w}x${h}: ${steps.join('; ')}; height ${first.height}px throughout`);
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
