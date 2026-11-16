// Motion acceptance: (1) static scan of CSS/JS, (2) reduced motion leaves no running animations,
// (3) frame times during a scripted scroll + drawer open/close (Chromium, 4x CPU throttle: a PROXY for an iPhone).
// Usage: node tools/serve.mjs & node qa/motion.mjs
import { chromium, webkit } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';

const BASE = 'http://localhost:4600/Dolce-Nova/';
let fail = 0;
const report = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fail++; };

// ---- 1. static scan ----
const ALLOWED = new Set(['transform', 'opacity']);
const cssFiles = readdirSync('site/assets/css').filter((f) => f.endsWith('.css')).map((f) => `site/assets/css/${f}`);
const problems = [];
for (const file of cssFiles) {
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  if (/transition(-property)?\s*:\s*all\b/.test(css)) problems.push(`${file}: transition: all`);
  for (const m of css.matchAll(/transition\s*:\s*([^;}]+)/g)) {
    for (const part of m[1].split(',')) {
      const prop = part.trim().split(/\s+/)[0];
      if (!ALLOWED.has(prop)) problems.push(`${file}: transitions "${prop}"`);
    }
  }
  for (const m of css.matchAll(/transition-property\s*:\s*([^;}]+)/g)) m[1].split(',').map((s) => s.trim()).forEach((p) => !ALLOWED.has(p) && problems.push(`${file}: transition-property ${p}`));
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
    for (const d of m[2].matchAll(/([a-z-]+)\s*:/g)) if (!ALLOWED.has(d[1])) problems.push(`${file}: @keyframes ${m[1]} animates ${d[1]}`);
  }
}
for (const f of readdirSync('site/assets/js')) {
  const js = readFileSync(`site/assets/js/${f}`, 'utf8');
  if (/\.animate\s*\(/.test(js)) problems.push(`site/assets/js/${f}: element.animate()`);
  if (/style\.(left|top|right|bottom|width|height|margin\w*|padding\w*)\s*=.*\$\{/.test(js) && !/document\.body\.style\.top/.test(js)) problems.push(`site/assets/js/${f}: layout property written per frame`);
}
report(problems.length === 0, `static scan of ${cssFiles.length} CSS + JS files: no transition: all, only transform/opacity animated${problems.length ? '\n  ' + problems.join('\n  ') : ''}`);

// ---- 2. reduced motion ----
const wk = await webkit.launch();
for (const [path, setup] of [['', null], ['', 'drawer'], ['checkout.html', null], ['success.html', null], ['credits.html', null]]) {
  const ctx = await wk.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  if (setup === 'drawer') { await page.click('[data-cart-open]'); }
  await page.waitForTimeout(300);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => a.animationName || a.transitionProperty || 'anim'));
  const hiddenReveal = await page.evaluate(() => [...document.querySelectorAll('[data-reveal], [data-enter]')].filter((e) => getComputedStyle(e).opacity !== '1').length);
  report(running.length === 0 && hiddenReveal === 0, `reduced motion, WebKit, /${path || 'index'}${setup ? ' + drawer open' : ''}: ${running.length} running animations, ${hiddenReveal} hidden reveal targets${running.length ? ' [' + running.join(', ') + ']' : ''}`);
  await ctx.close();
}
await wk.close();

// ---- 3. frame timing ----
async function frames(browserType, label, { w, h, throttle, dpr, warm, gpu }) {
  // default headless Chromium renders WebGL in software (SwiftShader); gpu: true uses this machine's GPU via ANGLE
  const browser = await browserType.launch(gpu ? { args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] } : {});
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1024, isMobile: browserType === chromium && w < 1024, deviceScaleFactor: dpr ?? (w < 1024 ? 3 : 2) });
  const page = await ctx.newPage();
  if (throttle) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
  await page.goto(BASE, { waitUntil: 'networkidle' });
  if (warm) {
    // steady state: let the 3D roast path finish its one-time setup first, then measure from the top
    await page.evaluate(() => { const s = document.querySelector('[data-roastpath]'); if (s) scrollTo(0, s.offsetTop - innerHeight); });
    await page.waitForFunction(() => window.__roast || document.querySelector('.roastpath--fallback'), null, { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => scrollTo(0, 0));
  }
  await page.waitForTimeout(1500);
  const result = await page.evaluate(async () => {
    const deltas = [];
    let last = performance.now(), running = true;
    const loop = (t) => { deltas.push(t - last); last = t; if (running) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    // scripted scroll: 1400 px/s down the whole page, frame by frame (like a long fling)
    const max = document.documentElement.scrollHeight - innerHeight;
    await new Promise((done) => {
      let y = 0, prev = performance.now();
      const step = (t) => { y = Math.min(max, y + (t - prev) * 1.4); prev = t; scrollTo(0, y); if (y < max) requestAnimationFrame(step); else done(); };
      requestAnimationFrame(step);
    });
    scrollTo(0, 0); await wait(300);
    // drawer open / close, three times
    for (let i = 0; i < 3; i++) {
      document.querySelector('[data-cart-open]').click(); await wait(600);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      document.getElementById('cart').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(600);
    }
    running = false;
    const d = deltas.slice(2);
    return { n: d.length, under20: d.filter((x) => x < 20).length, p95: d.sort((a, b) => a - b)[Math.floor(d.length * 0.95)], max: Math.max(...d) };
  });
  await browser.close();
  const pct = (100 * result.under20) / result.n;
  report(pct >= 95, `frames ${label}: ${pct.toFixed(1)}% of ${result.n} frames < 20 ms (p95 ${result.p95.toFixed(1)} ms, worst ${result.max.toFixed(1)} ms)`);
}
await frames(chromium, 'Chromium 390x844 @3x, 4x CPU throttle (iPhone PROXY), first visit', { w: 390, h: 844, throttle: 4 });
await frames(chromium, 'Chromium 390x844 @3x, 4x CPU throttle (iPhone PROXY), 3D already set up', { w: 390, h: 844, throttle: 4, warm: true });
await frames(chromium, 'Chromium 1440x900 @2x, 4x CPU throttle, first visit', { w: 1440, h: 900, throttle: 4 });
await frames(chromium, 'Chromium 1440x900 @2x, 4x CPU throttle, 3D already set up', { w: 1440, h: 900, throttle: 4, warm: true });
await frames(chromium, 'Chromium 390x844 @3x, 4x CPU throttle, hardware GPU, first visit', { w: 390, h: 844, throttle: 4, gpu: true });
await frames(chromium, 'Chromium 1440x900 @2x, 4x CPU throttle, hardware GPU, first visit', { w: 1440, h: 900, throttle: 4, gpu: true });
await frames(webkit, 'WebKit 390x844 @1x, no throttle (WebKit cannot throttle)', { w: 390, h: 844, dpr: 1 });
await frames(webkit, 'WebKit 390x844 @3x, no throttle (software-rendered on Windows; see qa/webkit-baseline.mjs)', { w: 390, h: 844 });
process.exit(fail ? 1 : 0);
