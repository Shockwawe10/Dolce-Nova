// Screenshot every section of the live local site in WebKit (Safari's engine).
// Usage: node tools/shoot.mjs [WxH ...] [--reduced] [--out qa/out/shots]
// Default sizes: the brief's 390x844, 820x1180, 1440x900, 1920x1080. Server: node tools/serve.mjs
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const reduced = args.includes('--reduced');
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'qa/out/shots';
const sizes = args.filter((a) => /^\d+x\d+$/.test(a)).map((s) => s.split('x').map(Number));
const SIZES = sizes.length ? sizes : [[390, 844], [820, 1180], [1440, 900], [1920, 1080]];
const URL = 'http://localhost:4600/Dolce-Nova/';
mkdirSync(out, { recursive: true });

const browser = await webkit.launch();
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: w < 1024, isMobile: false });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200); // hero sequence
  const tag = `${w}x${h}${reduced ? '-reduced' : ''}`;
  const shot = async (name) => { await page.waitForTimeout(500); await page.screenshot({ path: `${out}/${tag}-${name}.png` }); };
  await shot('01-hero');
  const to = async (sel, offset = 0) => page.evaluate(([s, o]) => { const el = document.querySelector(s); scrollTo({ top: el.getBoundingClientRect().top + scrollY - o, behavior: 'instant' }); }, [sel, offset]);
  const header = 64;
  await to('#coffees', 0); await shot('02-coffees');
  await to('.manifesto', 0); await shot('03-manifesto');
  await to('#origin', 0); await shot('04-origin');
  // the peak: walk the roast section at 0, 1/3, 2/3, 1
  const roast = await page.evaluate(() => { const s = document.querySelector('[data-roastpath]'); const st = s.querySelector('.roastpath__stage'); return { top: s.getBoundingClientRect().top + scrollY, travel: s.offsetHeight - st.offsetHeight }; });
  for (const [i, f] of [[0, 0.25], [1, 0.5], [2, 0.75], [3, 1]]) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), roast.top + roast.travel * f);
    await page.evaluate(() => window.__roast && window.__roast.settled());
    await shot(`05-roast-${i}`);
  }
  await to('#brew-title', header + 200); await shot('06-brew');
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await shot('07-footer');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const screens = await page.evaluate(() => document.documentElement.scrollHeight / innerHeight);
  // a product page: its first screen, its overflow, then the drawer with one bag in it
  await page.goto(URL + 'coffee-nyeri.html', { waitUntil: 'networkidle' });
  await shot('08-product');
  const pdpOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await page.click('form[data-add] button[type=submit]');
  await page.click('[data-cart-open]'); await shot('09-drawer');
  console.log(tag, 'horizontal overflow px:', overflow, 'product page:', pdpOverflow, 'page height (screens):', screens.toFixed(1));
  await ctx.close();
}
await browser.close();
