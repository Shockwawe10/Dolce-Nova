// Screenshot a reference site screen by screen (for studying composition and feeling; nothing is copied).
// Usage: node tools/ref-frames.mjs <url> <label> [WxH ...]  -> qa/out/refs/frames/<label>-<w>-NN.png + a contact sheet
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [url, label, ...rest] = process.argv.slice(2);
const sizes = rest.filter((a) => /^\d+x\d+$/.test(a)).map((s) => s.split('x').map(Number));
const OUT = 'qa/out/refs/frames';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const [w, h] of sizes.length ? sizes : [[1440, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  const decline = page.getByText(/^\s*(decline all|reject all|decline|deny|only necessary|necessary only)\s*$/i).first();
  if (await decline.isVisible().catch(() => false)) { await decline.click().catch(() => {}); await page.waitForTimeout(800); }
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const files = [];
  for (let i = 0, y = 0; y < total && i < 14; i++, y += Math.round(h * 0.9)) {
    await page.evaluate((yy) => scrollTo(0, yy), y);
    await page.waitForTimeout(900);
    const f = `${OUT}/${label}-${w}-${String(i).padStart(2, '0')}.png`;
    await page.screenshot({ path: f });
    files.push(f);
  }
  // contact sheet: rows of 4 (desktop) or 7 (phone)
  const per = w > 800 ? 4 : 7, tw = w > 800 ? 600 : 300;
  const inputs = files.flatMap((f) => ['-i', f]);
  const n = files.length, rows = Math.ceil(n / per);
  let fc = files.map((_, k) => `[${k}]scale=${tw}:-1[s${k}]`).join(';') + ';';
  for (let r = 0; r < rows; r++) {
    const ids = Array.from({ length: per }, (_, c) => r * per + c);
    const parts = ids.map((k) => (k < n ? `[s${k}]` : null)).filter(Boolean);
    fc += parts.length > 1 ? `${parts.join('')}hstack=${parts.length}[r${r}];` : `${parts[0]}copy[r${r}];`;
  }
  fc += rows > 1 ? Array.from({ length: rows }, (_, r) => `[r${r}]`).join('') + `xstack=inputs=${rows}:layout=${Array.from({ length: rows }, (_, r) => `0_${r === 0 ? 0 : Array.from({ length: r }, (_, q) => `h${q}`).join('+')}`).join('|')}:fill=white[out]` : '[r0]copy[out]';
  try { execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', '[out]', `${OUT}/${label}-${w}-sheet.png`]); } catch (e) { console.log('sheet failed', e.message.slice(0, 200)); }
  console.log(label, w, 'screens', files.length, 'docH', total);
  await page.close();
}
await browser.close();
