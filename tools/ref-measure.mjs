// Measure a reference site from computed styles (never guessed): type scale, line heights, spacing rhythm,
// section heights, colours, radii, shadows, transition/animation durations and easing.
// Usage: node tools/ref-measure.mjs <url> <label>   -> qa/out/refs/<label>-{1440,390}.json + .png
// Principles only: nothing measured here (code, assets, text) is copied into the site.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [url, label] = process.argv.slice(2);
const OUT = 'qa/out/refs';
mkdirSync(OUT, { recursive: true });

function collect() {
  const count = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  const top = (m, n = 12) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const sizes = new Map(), families = new Map(), colors = new Map(), bgs = new Map(), radii = new Map(),
    shadows = new Map(), durations = new Map(), easings = new Map(), props = new Map(), gaps = new Map(),
    heads = [];
  const vh = innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      count(sizes, cs.fontSize);
      count(families, cs.fontFamily.split(',')[0].trim());
      count(colors, cs.color);
    }
    if (/^H[1-3]$/.test(el.tagName) && heads.length < 12)
      heads.push({ tag: el.tagName, size: cs.fontSize, lh: cs.lineHeight, ls: cs.letterSpacing, weight: cs.fontWeight,
        family: cs.fontFamily.split(',')[0], wrap: cs.textWrap || cs.textWrapStyle || '' });
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') count(bgs, cs.backgroundColor);
    if (cs.borderRadius !== '0px') count(radii, cs.borderRadius);
    if (cs.boxShadow !== 'none') count(shadows, cs.boxShadow);
    for (const k of ['paddingTop', 'paddingBottom', 'marginBottom', 'rowGap', 'columnGap'])
      if (cs[k] && cs[k] !== '0px' && cs[k] !== 'normal' && cs[k] !== 'auto') count(gaps, cs[k]);
    if (cs.transitionDuration && cs.transitionDuration !== '0s') {
      count(durations, cs.transitionDuration);
      count(easings, cs.transitionTimingFunction);
      count(props, cs.transitionProperty);
    }
  }
  const sections = [...document.querySelectorAll('main > *, body > section, main section, footer, header')]
    .filter((e) => e.getBoundingClientRect().height > 80).slice(0, 20)
    .map((e) => ({ tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 40),
      h: Math.round(e.getBoundingClientRect().height), vh: +(e.getBoundingClientRect().height / vh).toFixed(2) }));
  const anims = document.getAnimations().map((a) => {
    const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
    return { name: a.animationName || a.transitionProperty || a.constructor.name, duration: t.duration, easing: t.easing, delay: t.delay };
  }).slice(0, 30);
  return {
    viewport: [innerWidth, innerHeight], docHeight: document.documentElement.scrollHeight,
    fontSizes: top(sizes, 16), families: top(families, 6), headings: heads, textColors: top(colors, 10),
    backgrounds: top(bgs, 10), radii: top(radii, 8), shadows: top(shadows, 5), spacing: top(gaps, 20),
    transitionDurations: top(durations, 10), transitionEasings: top(easings, 10), transitionProps: top(props, 10),
    sections, animations: anims,
  };
}

const browser = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1,
    userAgent: w < 600 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  const onLoad = await page.evaluate(() => document.getAnimations().map((a) => {
    const t = a.effect.getTiming(); return { name: a.animationName || a.transitionProperty || '', duration: t.duration, easing: t.easing, delay: t.delay };
  }));
  // scroll through once so lazy content and scroll reveals register, then measure
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
  await page.waitForTimeout(800);
  const data = await page.evaluate(collect);
  data.onLoadAnimations = onLoad;
  data.url = url;
  writeFileSync(`${OUT}/${label}-${w}.json`, JSON.stringify(data, null, 1));
  await page.screenshot({ path: `${OUT}/${label}-${w}.png` });
  console.log(label, w, 'fonts', data.families.map((f) => f[0]).join(' | '), 'docH', data.docHeight);
  await ctx.close();
}
await browser.close();
