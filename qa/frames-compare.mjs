// Guide rule 7: a smoothness claim is "this tree against HEAD, same machine, interleaved", never one run.
// Serves nothing itself: start the tree on 4600 (node tools/serve.mjs) and HEAD on 4602
// (git archive HEAD site tools | tar -x -C <dir>; cd <dir>; node tools/serve.mjs 4602), then:
// node qa/frames-compare.mjs [rounds]   -> per-round and median % of frames < 20 ms, Chromium + GPU, 4x CPU
import { chromium } from 'playwright';

const ROUNDS = Number(process.argv[2] || 3);
const TARGETS = { tree: 'http://localhost:4600/Dolce-Nova/', HEAD: 'http://localhost:4602/Dolce-Nova/' };
const SIZES = [[390, 844, 3], [1440, 900, 2]];

async function run(url, w, h, dpr) {
  const browser = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: w < 1024, isMobile: w < 1024 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const deltas = []; let last = performance.now(), on = true;
    const loop = (t) => { deltas.push(t - last); last = t; if (on) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const max = document.documentElement.scrollHeight - innerHeight;
    await new Promise((done) => { let y = 0, prev = performance.now(); const step = (t) => { y = Math.min(max, y + (t - prev) * 1.4); prev = t; scrollTo(0, y); if (y < max) requestAnimationFrame(step); else done(); }; requestAnimationFrame(step); });
    scrollTo(0, 0); await wait(300);
    for (let i = 0; i < 3; i++) { document.querySelector('[data-cart-open]').click(); await wait(600); document.getElementById('cart').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(600); }
    on = false;
    const d = deltas.slice(2);
    return (100 * d.filter((x) => x < 20).length) / d.length;
  });
  await browser.close();
  return r;
}

const results = {};
for (let i = 0; i < ROUNDS; i++) {
  for (const [name, url] of i % 2 ? Object.entries(TARGETS).reverse() : Object.entries(TARGETS)) {   // interleave the order
    for (const [w, h, dpr] of SIZES) {
      const pct = await run(url, w, h, dpr);
      ((results[`${name} ${w}`] ||= [])).push(pct);
      console.log(`round ${i + 1} ${name.padEnd(4)} ${w}x${h}@${dpr}x: ${pct.toFixed(1)}% < 20 ms`);
    }
  }
}
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log('\nmedian of ' + ROUNDS + ':');
for (const [k, v] of Object.entries(results)) console.log(`  ${k.padEnd(10)} ${median(v).toFixed(1)}%  (runs: ${v.map((x) => x.toFixed(1)).join(', ')})`);
