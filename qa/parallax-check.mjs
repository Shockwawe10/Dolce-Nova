// Parallax on the background photographs (the owner, 2026-11-17), desktop with a mouse: each photo moves slower
// than the page, never shows an edge of its frame, and stays sharp (served file >= 1.5x its drawn width at DPR 2).
// Under reduced motion nothing moves. Usage: node tools/serve.mjs & node qa/parallax-check.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
const browser = await chromium.launch();
let failed = 0;
for (const [path, w, h] of [['', 1440, 900], ['', 1920, 1080], ['', 1280, 800], ['coffee-huila.html', 1440, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  const frames = await page.evaluate(() => [...document.querySelectorAll('[data-parallax]')].map((f, i) => i));
  const bad = [];
  let moved = 0;
  for (const i of frames) {
    const res = [];
    for (const at of [0.85, 0.5, 0.15]) {   // the frame's centre at 85%, 50% and 15% of the window
      await page.evaluate(([k, a]) => { const f = document.querySelectorAll('[data-parallax]')[k]; const r = f.getBoundingClientRect(); scrollBy(0, r.top + r.height / 2 - innerHeight * a); }, [i, at]);
      await page.waitForTimeout(250);
      res.push(await page.evaluate((k) => {
        const f = document.querySelectorAll('[data-parallax]')[k], fr = f.getBoundingClientRect();
        const pic = f.querySelector(':scope > picture.is-on, :scope > picture'), pr = pic.getBoundingClientRect(), img = pic.querySelector('img');
        const file = Number((img.currentSrc.match(/-(\d+)\.\w+$/) || [])[1]) || img.naturalWidth;
        const ratio = img.naturalWidth / img.naturalHeight, drawn = Math.max(pr.width, pr.height * ratio);
        return { cls: f.className, offset: pr.top - fr.top, covers: pr.top <= fr.top + 0.5 && pr.bottom >= fr.bottom - 0.5, density: file / drawn, mask: f.classList.contains('hero__bag') };
      }, i));
    }
    const offsets = res.map((r) => r.offset);
    if (Math.max(...offsets) - Math.min(...offsets) > 4) moved++;
    res.forEach((r) => {
      if (!r.covers && !r.mask) bad.push(`${r.cls}: an edge shows`);
      if (r.density < 1.5 && !r.mask) bad.push(`${r.cls}: density ${r.density.toFixed(2)}`);
    });
  }
  const ok = !bad.length && moved === frames.length;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} parallax ${path || 'home'} ${w}x${h}: ${moved}/${frames.length} photos drift, ${bad.length ? [...new Set(bad)].join('; ') : 'no edge shows, every photo 1.5x or sharper'}`);
  await page.close();
}
// reduced motion: nothing moves
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => scrollTo(0, document.querySelector('#brew').offsetTop - 300));
await page.waitForTimeout(300);
const still = await page.evaluate(() => [...document.querySelectorAll('[data-parallax] > picture')].every((p) => !p.style.transform));
if (!still) failed++;
console.log(`${still ? 'PASS' : 'FAIL'} parallax under reduced motion: ${still ? 'no photo moves' : 'a photo moved'}`);
await browser.close();
process.exit(failed ? 1 : 0);
