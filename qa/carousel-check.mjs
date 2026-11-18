// The coffee carousel on a desktop with a mouse (the owner, 2026-11-18: "scroll this scroll bar manually by
// dragging it ... not while scrolling the page"):
//  - the wheel scrolls the page, never the row; dragging over the bags does not move the row (they are links);
//  - the scrollbar under the row: grabbing the thumb and dragging moves it by exactly the drag, without a jump;
//    pressing the empty line jumps there; the row follows;
//  - a click on a bag opens its page; the arrows are plain, under the line, landing on a slide's start.
// Usage: node tools/serve.mjs & node qa/carousel-check.mjs
import { chromium, webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
let failed = 0;
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const home = async () => { await page.evaluate(() => { const s = document.querySelector('#coffees'); scrollTo(0, s.offsetTop + 60); document.querySelector('#coffees .carousel__track').scrollLeft = 0; }); await page.waitForTimeout(250); };
  await home();
  const bad = [];
  const st = () => page.evaluate(() => {
    const t = document.querySelector('#coffees .carousel__track'), th = document.querySelector('#coffees .carousel__progress span').getBoundingClientRect();
    return { x: t.scrollLeft, max: t.scrollWidth - t.clientWidth, y: scrollY, url: location.href, thumbLeft: th.left, thumbW: th.width };
  });
  // the wheel scrolls the page, not the row
  const card = await page.locator('#coffees .slide').nth(1).boundingBox();
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
  const s0 = await st();
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(250);
  const s1 = await st();
  if (Math.abs(s1.x - s0.x) > 1) bad.push(`the wheel moved the row (${s0.x} to ${s1.x})`);
  if (!(s1.y > s0.y + 100)) bad.push('the wheel did not scroll the page');
  // grab the thumb near its left edge and drag 200px: the thumb follows exactly, the row moves
  await home();
  const rail = await page.locator('#coffees .carousel__progress').boundingBox();
  const t0 = await st();
  const grabX = t0.thumbLeft + 6, y = rail.y + rail.height / 2;
  await page.mouse.move(grabX, y);
  await page.mouse.down();
  await page.mouse.move(grabX + 200, y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const t1 = await st();
  if (Math.abs(t1.thumbLeft - t0.thumbLeft - 200) > 3) bad.push(`the thumb moved ${Math.round(t1.thumbLeft - t0.thumbLeft)}px for a 200px drag (a jump)`);
  if (!(t1.x > 100)) bad.push(`dragging the thumb did not move the row (${Math.round(t1.x)})`);
  // press the empty line near its right end: jump there
  await home();
  await page.mouse.click(rail.x + rail.width - 10, y);
  await page.waitForTimeout(250);
  const t2 = await st();
  if (!(t2.x >= t2.max - 2)) bad.push(`pressing the line's end did not jump there (${Math.round(t2.x)} of ${t2.max})`);
  // arrows: plain, under the line, landing on slide starts
  const look = await page.evaluate(() => {
    const b = document.querySelector('#coffees [data-next]'), cs = getComputedStyle(b);
    const line = document.querySelector('#coffees .carousel__progress').getBoundingClientRect();
    return { border: parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth), below: b.getBoundingClientRect().top >= line.bottom - 0.5 };
  });
  if (look.border > 0) bad.push('the arrows have a border');
  if (!look.below) bad.push('the arrows are not under the line');
  await home();
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
  // dragging across the bags does not move the row (on a fresh page: WebKit's native link drag would hold the
  // mouse for the steps after it)
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await home();
  const c2 = await page.locator('#coffees .slide').nth(1).boundingBox();
  await page.mouse.move(c2.x + c2.width / 2, c2.y + c2.height / 2);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(c2.x + c2.width / 2 - k * 30, c2.y + c2.height / 2);
  await page.mouse.up();
  await page.waitForTimeout(250);
  if (page.url().includes('coffee-')) { await page.goBack(); }
  const s2 = await st();
  if (Math.abs(s2.x) > 1) bad.push(`dragging over the bags moved the row by ${Math.round(s2.x)}px`);
  // a click on a bag opens its page
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await home();
  await page.locator('#coffees .slide__link').first().click();
  await page.waitForURL(/coffee-/, { timeout: 5000 }).catch(() => bad.push('a click on a bag did not open its page'));
  const ok = !bad.length;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} carousel ${engine.name()} 1440x900: ${ok ? 'the wheel scrolls the page; the bags do not drag; the scrollbar thumb drags without a jump and the line jumps; a click opens the coffee' : bad.join('; ')}`);
  await browser.close();
}
process.exit(failed ? 1 : 0);
