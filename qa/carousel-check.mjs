// The coffee carousel on a desktop with a mouse (the owner, 2026-11-18): hovering and scrolling the wheel moves
// the row sideways and not the page; at the row's end the wheel scrolls the page again; the arrows are plain (no
// border), sit under the progress line, and land each press on a slide's start, even after free wheel scrolling.
// Usage: node tools/serve.mjs & node qa/carousel-check.mjs
import { chromium, webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
let failed = 0;
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('#coffees').scrollIntoView());
  await page.waitForTimeout(300);
  const bad = [];
  const st = () => page.evaluate(() => { const t = document.querySelector('#coffees .carousel__track'); return { x: t.scrollLeft, max: t.scrollWidth - t.clientWidth, y: scrollY }; });
  const box = await page.locator('#coffees .slide').first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const s0 = await st();
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(200);
  const s1 = await st();
  if (!(s1.x > s0.x + 100)) bad.push(`the wheel did not move the row (${s0.x} to ${s1.x})`);
  if (Math.abs(s1.y - s0.y) > 1) bad.push(`the page moved while the row could scroll (${s0.y} to ${s1.y})`);
  for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(30); }
  await page.waitForTimeout(200);
  const s2 = await st();
  if (s2.x < s2.max - 1) bad.push(`the row did not reach its end (${s2.x} of ${s2.max})`);
  if (!(s2.y > s0.y)) bad.push('the page did not scroll on once the row was at its end');
  // arrows: plain, under the line, landing on slide starts
  const look = await page.evaluate(() => {
    const b = document.querySelector('#coffees [data-next]'), cs = getComputedStyle(b);
    const line = document.querySelector('#coffees .carousel__progress').getBoundingClientRect();
    return { border: parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth), below: b.getBoundingClientRect().top >= line.bottom - 0.5 };
  });
  if (look.border > 0) bad.push('the arrows have a border');
  if (!look.below) bad.push('the arrows are not under the line');
  await page.evaluate(() => { const t = document.querySelector('#coffees .carousel__track'); t.scrollTo({ left: 137, behavior: 'instant' }); });
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('#coffees').scrollIntoView());
  await page.click('#coffees [data-next]');
  await page.waitForTimeout(900);
  const landed = await page.evaluate(() => {
    const t = document.querySelector('#coffees .carousel__track'), s = [...t.querySelectorAll('.slide')];
    const starts = s.map((el) => el.offsetLeft - s[0].offsetLeft);
    return starts.some((p) => Math.abs(p - t.scrollLeft) < 2) || t.scrollLeft >= t.scrollWidth - t.clientWidth - 1;
  });
  if (!landed) bad.push('an arrow press did not land on a slide start');
  const ok = !bad.length;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} carousel ${engine.name()} 1440x900: ${ok ? 'the wheel moves the row, hands back to the page at the end; plain arrows under the line land on slides' : bad.join('; ')}`);
  await browser.close();
}
process.exit(failed ? 1 : 0);
