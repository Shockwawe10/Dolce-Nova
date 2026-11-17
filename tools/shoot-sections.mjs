// One viewport screenshot at the top of every section of the home page, plus a contact sheet.
// Usage: node tools/serve.mjs & node tools/shoot-sections.mjs [WxH ...]  -> qa/out/sections/<w>-NN-<name>.png, <w>-sheet.png
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const sizes = process.argv.slice(2).filter((a) => /^\d+x\d+$/.test(a)).map((s) => s.split('x').map(Number));
const OUT = 'qa/out/sections';
mkdirSync(OUT, { recursive: true });
const browser = await webkit.launch();
for (const [w, h] of sizes.length ? sizes : [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto((process.env.BASE || 'http://localhost:4600/Dolce-Nova/') + '?qa', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const tops = await page.evaluate(() => [...document.querySelectorAll('main > section, footer')].map((s, i) => ({
    i, name: (s.id || s.className.split(' ')[0] || s.tagName).toLowerCase(), top: s.getBoundingClientRect().top + scrollY,
    roast: s.matches('[data-roastpath]') ? s.offsetHeight - s.querySelector('.roastpath__stage').clientHeight : 0,
  })));
  const files = [];
  for (const t of tops) {
    const stops = t.roast ? [0, 0.5, 1].map((f) => t.top + t.roast * f) : [t.top];
    for (const [k, y] of stops.entries()) {
      await page.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), Math.round(y));
      await page.evaluate(() => (window.__roast ? window.__roast.settled() : null));
      await page.waitForTimeout(600);
      const f = `${OUT}/${w}-${String(t.i).padStart(2, '0')}${t.roast ? '-' + k : ''}-${t.name}.png`;
      await page.screenshot({ path: f });
      files.push(f);
    }
  }
  const per = w > 800 ? 3 : 6, tw = w > 800 ? 720 : 260;
  const rows = [];
  for (let i = 0; i < files.length; i += per) rows.push(files.slice(i, i + per));
  const inputs = files.flatMap((f) => ['-i', f]);
  let fc = files.map((_, k) => `[${k}]scale=${tw}:-1[s${k}]`).join(';') + ';';
  rows.forEach((r, ri) => {
    const ids = r.map((_, c) => `[s${ri * per + c}]`).join('');
    const pad = r.length < per ? `,pad=${tw * per}:ih:0:0:white` : '';
    fc += (r.length > 1 ? `${ids}hstack=${r.length}${pad}` : `${ids}pad=${tw * per}:ih:0:0:white`) + `[r${ri}];`;
  });
  fc += rows.length > 1 ? rows.map((_, ri) => `[r${ri}]`).join('') + `vstack=${rows.length}[out]` : '[r0]copy[out]';
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', '[out]', `${OUT}/${w}-sheet.png`]);
  console.log(`${w}x${h}: ${files.length} shots, sheet ${OUT}/${w}-sheet.png`);
  await page.close();
}
await browser.close();
