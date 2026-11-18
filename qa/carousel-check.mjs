// The coffee carousel on a desktop with a mouse (the owner, 2026-11-18): the wheel scrolls the page, not the row;
// the row moves by dragging it with the mouse or by dragging the line under it (a scrollbar); a drag never opens a
// coffee, a plain click does; the arrows are plain (no border), sit under the line and land on a slide's start.
// Usage: node tools/serve.mjs & node qa/carousel-check.mjs
import { chromium, webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
let failed = 0;
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { const s = document.querySelector('#coffees'); scrollTo(0, s.offsetTop + 60); });
  await page.waitForTimeout(300);
  const bad = [];
  const st = () => page.evaluate(() => { const t = document.querySelector('#coffees .carousel__track'); return { x: t.scrollLeft, max: t.scrollWidth - t.clientWidth, y: scrollY, url: location.href }; });
  const card = await page.locator('#coffees .slide').nth(1).boundingBox();
  // the wheel scrolls the page
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
  const s0 = await st();
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(250);
  const s1 = await st();
  if (Math.abs(s1.x - s0.x) > 1) bad.push(`the wheel moved the row (${s0.x} to ${s1.x})`);
  if (!(s1.y > s0.y + 100)) bad.push('the wheel did not scroll the page');
  // drag the row with the mouse; it must not open the coffee under the pointer
  await page.evaluate(() => { const s = document.querySelector('#coffees'); scrollTo(0, s.offsetTop + 60); });
  await page.waitForTimeout(200);
  const c2 = await page.locator('#coffees .slide').nth(1).boundingBox();
  const before = await st();
  await page.mouse.move(c2.x + c2.width / 2, c2.y + c2.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(c2.x + c2.width / 2 - k * 30, c2.y + c2.height / 2);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await st();
  if (!(after.x > before.x + 250)) bad.push(`dragging moved the row ${Math.round(after.x - before.x)}px (want about 300)`);
  if (after.url !== before.url) bad.push('a drag opened a coffee page');
  // drag the scrollbar's thumb to the right
  const rail = await page.locator('#coffees .carousel__progress').boundingBox();
  await page.evaluate(() => { document.querySelector('#coffees .carousel__track').scrollLeft = 0; });
  await page.waitForTimeout(150);
  await page.mouse.move(rail.x + 40, rail.y + rail.height / 2);
  await page.mouse.down();
  await page.mouse.move(rail.x + rail.width * 0.8, rail.y + rail.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const viaBar = await st();
  if (!(viaBar.x > viaBar.max * 0.5)) bad.push(`the scrollbar did not move the row (${Math.round(viaBar.x)} of ${viaBar.max})`);
  // arrows: plain, under the line, landing on slide starts
  const look = await page.evaluate(() => {
    const b = document.querySelector('#coffees [data-next]'), cs = getComputedStyle(b);
    const line = document.querySelector('#coffees .carousel__progress').getBoundingClientRect();
    return { border: parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth), below: b.getBoundingClientRect().top >= line.bottom - 0.5 };
  });
  if (look.border > 0) bad.push('the arrows have a border');
  if (!look.below) bad.push('the arrows are not under the line');
  await page.evaluate(() => { document.querySelector('#coffees .carousel__track').scrollLeft = 137; });
  await page.waitForTimeout(150);
  await page.click('#coffees [data-next]');
  await page.waitForTimeout(900);
  const landed = await page.evaluate(() => {
    const t = document.querySelector('#coffees .carousel__track'), s = [...t.querySelectorAll('.slide')];
    const starts = s.map((el) => el.offsetLeft - s[0].offsetLeft);
    return starts.some((p) => Math.abs(p - t.scrollLeft) < 2) || t.scrollLeft >= t.scrollWidth - t.clientWidth - 1;
  });
  if (!landed) bad.push('an arrow press did not land on a slide start');
  // a plain click still opens the coffee
  await page.evaluate(() => { document.querySelector('#coffees .carousel__track').scrollLeft = 0; });
  await page.waitForTimeout(150);
  await page.locator('#coffees .slide__link').first().click();
  await page.waitForURL(/coffee-/, { timeout: 5000 }).catch(() => bad.push('a plain click did not open the coffee'));
  const ok = !bad.length;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} carousel ${engine.name()} 1440x900: ${ok ? 'the wheel scrolls the page; drag the row or its scrollbar; a drag opens nothing, a click does; plain arrows land on slides' : bad.join('; ')}`);
  await browser.close();
}
process.exit(failed ? 1 : 0);
