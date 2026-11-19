// Design audit: walks every rendered element (and ::before/::after) of every page state and checks the
// computed styles against DESIGN.md. Also: images (distortion, resolution), tap targets, input font size,
// clipped text, horizontal overflow. Prints violations; exits 1 if any.
// Usage: node tools/serve.mjs & node qa/audit.mjs [--engine webkit|chromium] [--dpr 2] [--json qa/out/audit.json]
import { webkit, chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const engine = arg('--engine', 'webkit') === 'chromium' ? chromium : webkit;
const DPR = Number(arg('--dpr', '2'));
const BASE = 'http://localhost:4600/Dolce-Nova/';
const SCALE = [13, 16, 20, 25, 31, 39, 49, 61, 76];
const FAMILIES = ['Instrument Serif', 'Instrument Sans'];
const SIZES = [[390, 844], [820, 1180], [1440, 900], [1920, 1080]];

// Each state: a page plus the setup that makes hidden UI visible (open row, drawer, form errors).
const STATES = [
  ['home', '', async () => {}],
  ['product+grind+drawer', 'coffee-yirgacheffe.html', async (p) => {
    await p.locator('form[data-add] label:has-text("Filter")').click();
    await p.locator('form[data-add] button[type=submit]').click();
    await p.click('[data-cart-open]'); await p.waitForSelector('#cart.is-open'); await p.waitForTimeout(500);
  }],
  ['checkout+errors', 'checkout.html', async (p) => { await p.click('[data-pay-btn]').catch(() => {}); }],
  ['success', 'success.html', async () => {}],
  ['credits', 'credits.html', async () => {}],
];

function walk({ scale, families }) {
  const out = { colors: {}, families: {}, sizes: {}, radii: {}, shadows: {}, spacing: [], images: [], taps: [], inputs: [], clipped: [] };
  const add = (bag, k, where) => { (bag[k] ||= []).length < 3 && bag[k].push(where); };
  const isTransparent = (c) => c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);
  const label = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
  const visible = (el) => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const px = (v) => v.split(' ').map(parseFloat).filter((n) => !Number.isNaN(n));
  for (const el of document.querySelectorAll('body, body *')) {
    if (el.closest('svg, noscript, script, style') && el.tagName !== 'svg') continue;
    if (!visible(el) || el.classList.contains('visually-hidden') || el.closest('.visually-hidden')) continue;
    const where = label(el);
    for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (pseudo && (cs.content === 'none' || cs.content === 'normal' || cs.display === 'none')) continue;
      const w = where + (pseudo || '');
      const hasText = !pseudo && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (hasText) {
        add(out.colors, cs.color, w);
        add(out.families, cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), w);
        const fs = parseFloat(cs.fontSize);
        // the one documented exception (DESIGN.md): the footer wordmark is sized to the container width, not the scale
        if (!scale.includes(Math.round(fs * 100) / 100) && !el.closest('.footer__mark')) add(out.sizes, cs.fontSize, w);
      }
      if (!isTransparent(cs.backgroundColor)) add(out.colors, cs.backgroundColor, w + ' (bg)');
      for (const side of ['Top', 'Right', 'Bottom', 'Left'])
        if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none' && !isTransparent(cs[`border${side}Color`])) add(out.colors, cs[`border${side}Color`], w + ' (border)');
      if (cs.borderTopLeftRadius !== '0px') add(out.radii, cs.borderTopLeftRadius, w);
      if (cs.boxShadow !== 'none') add(out.shadows, cs.boxShadow, w);
      for (const k of ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'rowGap', 'columnGap']) {
        const v = cs[k];
        if (!v || v === 'normal' || v === 'auto') continue;
        for (const n of px(v)) if (Math.abs(n) > 0.5 && Math.abs(Math.round(n) % 8) !== 0 && !(Math.abs(n - Math.round(n / 8) * 8) < 0.5))
          out.spacing.length < 40 && out.spacing.push(`${w} ${k}=${v}`);
      }
    }
    if (el.tagName === 'IMG' && el.complete && el.naturalWidth) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const ratio = el.naturalWidth / el.naturalHeight;
      // naturalWidth is density-corrected for srcset images, so read the file's real width from its name
      const fileW = Number((el.currentSrc.match(/-(\d+)\.(avif|webp|jpe?g|png)$/) || [])[1]) || el.naturalWidth;
      const fit = cs.objectFit;
      // rendered content box of the image itself (cover crops, contain letterboxes, fill/none can distort)
      const contentW = fit === 'cover' ? Math.max(r.width, r.height * ratio) : fit === 'contain' ? Math.min(r.width, r.height * ratio) : r.width;
      const contentH = fit === 'cover' || fit === 'contain' ? contentW / ratio : r.height;
      const distortion = Math.abs((contentW / contentH) / ratio - 1);
      out.images.push({ img: el.currentSrc.split('/').pop(), box: `${Math.round(r.width)}x${Math.round(r.height)}`, rendered: Math.round(contentW), natural: fileW,
        density: +(fileW / contentW).toFixed(2), distortion: +(distortion * 100).toFixed(2) });
    }
    const interactive = el.matches('a[href], button, input:not([type=radio]), select, textarea, label.chip');
    if (interactive && !el.matches('.skip-link')) {
      const r = el.getBoundingClientRect();
      const inline = el.matches('a') && getComputedStyle(el).display === 'inline';
      if ((r.height < 44 || r.width < 44) && !inline) out.taps.push(`${where} ${Math.round(r.width)}x${Math.round(r.height)}`);
      if (inline) out.taps.push(`EXEMPT inline link in text: ${where}`);
    }
    if (el.matches('input, select, textarea') && el.type !== 'radio' && parseFloat(getComputedStyle(el).fontSize) < 16) out.inputs.push(where);
    if (hasOverflow(el)) out.clipped.push(where);
  }
  function hasOverflow(el) {
    const cs = getComputedStyle(el);
    // only an overflow that actually cuts content off counts (text-overflow: clip is the default and cuts nothing by itself)
    if (!/(hidden|clip)/.test(cs.overflowX + ' ' + cs.overflowY)) return false;
    if (el.matches('.notice, .hero__bag, .slide__media, .pdp__media, .roast__frames, .btn, .chip span, .drawer')) return false; // visual masks, not text
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    return hasText && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
  }
  out.hOverflow = document.documentElement.scrollWidth - innerWidth;
  // the notice uses overflow:hidden for its single line, so check its text separately
  const n = document.querySelector('.notice');
  if (n) for (const s of n.querySelectorAll('span')) if (s.offsetParent && s.getBoundingClientRect().width > n.clientWidth) out.clipped.push('notice text wider than the bar');
  return out;
}

const browser = await engine.launch();
const report = { engine: arg('--engine', 'webkit'), dpr: DPR, runs: [] };
const all = { colors: new Map(), families: new Map(), radii: new Map(), shadows: new Map() };
const violations = [];
for (const [w, h] of SIZES) {
  for (const [name, path, setup] of STATES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DPR, hasTouch: w < 1024, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    if (path === 'success.html') {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.evaluate(() => sessionStorage.setItem('dn-last-order', JSON.stringify({ ref: 'DN-AUDIT', placed: '2026-11-17T10:00:00.000Z', contact: { email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace', phone: '' }, address: { line1: 'Keizersgracht 1', line2: '', postcode: '1015 CJ', city: 'Amsterdam', country: 'Netherlands' }, shipping: { method: 'Standard', cents: 490, from: '2026-11-20T00:00:00.000Z', to: '2026-11-24T00:00:00.000Z' }, subtotalCents: 3400, totalCents: 3890, lines: [{ name: 'Huila La Plata', size: '340 g', grind: 'Filter', qty: 2, lineCents: 3400 }] })));
      await page.goto(BASE + 'success.html?order=DN-AUDIT', { waitUntil: 'networkidle' });
    } else {
      if (path === 'checkout.html') { await page.goto(BASE, { waitUntil: 'networkidle' }); await page.evaluate(() => localStorage.setItem('dn-cart', JSON.stringify([{ id: 'huila', size: '340g', grind: 'filter', qty: 2 }]))); }
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
    }
    await setup(page);
    // scroll through so lazy images load and are measured at their rendered size
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
    await page.waitForLoadState('networkidle');
    const r = await page.evaluate(walk, { scale: SCALE, families: FAMILIES });
    const tag = `${name} @${w}x${h}`;
    for (const [k, bag] of Object.entries({ colors: r.colors, families: r.families, radii: r.radii, shadows: r.shadows }))
      for (const [v, where] of Object.entries(bag)) if (!all[k].has(v)) all[k].set(v, `${tag}: ${where[0]}`);
    for (const [v, where] of Object.entries(r.sizes)) violations.push(`font-size ${v} not on the scale (${tag}: ${where.join(', ')})`);
    r.spacing.forEach((s) => violations.push(`spacing off the 8-px grid (${tag}): ${s}`));
    r.images.forEach((i) => {
      if (i.distortion > 1) violations.push(`image distorted ${i.distortion}% (${tag}): ${i.img}`);
      if (i.density < 1.5) violations.push(`image under 1.5x (${tag}): ${i.img} natural ${i.natural} for ${i.rendered}px rendered (${i.density}x)`);
    });
    r.taps.filter((t) => !t.startsWith('EXEMPT')).forEach((t) => violations.push(`tap target under 44px (${tag}): ${t}`));
    r.inputs.forEach((t) => violations.push(`input under 16px (${tag}): ${t}`));
    r.clipped.forEach((t) => violations.push(`clipped text (${tag}): ${t}`));
    if (r.hOverflow > 0) violations.push(`horizontal overflow ${r.hOverflow}px (${tag})`);
    report.runs.push({ tag, images: r.images, exempt: r.taps.filter((t) => t.startsWith('EXEMPT')) });
    await ctx.close();
  }
}
await browser.close();
// the six palette colours, plus one named state colour that only field errors use (--c-error, 2026-11-19); any
// other seventh colour still fails
const STATE_COLORS = ['rgb(155, 58, 36)'];
const colors = [...all.colors.keys()].filter((c) => !STATE_COLORS.includes(c)), families = [...all.families.keys()], radii = [...all.radii.keys()], shadows = [...all.shadows.keys()];
if (colors.length > 6) violations.push(`${colors.length} distinct colours (max 6): ${colors.join(' | ')}`);
if (families.length !== 2 || !FAMILIES.every((f) => families.includes(f))) violations.push(`font families: ${families.join(', ')} (expected exactly ${FAMILIES.join(' + ')})`);
if (radii.length > 3) violations.push(`${radii.length} radii (max 3): ${radii.join(', ')}`);
if (shadows.length > 1) violations.push(`${shadows.length} shadow styles (max 1): ${shadows.join(' | ')}`);
Object.assign(report, { colors: Object.fromEntries(all.colors), families: Object.fromEntries(all.families), radii: Object.fromEntries(all.radii), shadows: Object.fromEntries(all.shadows), violations });
mkdirSync('qa/out', { recursive: true });
writeFileSync(arg('--json', 'qa/out/audit.json'), JSON.stringify(report, null, 1));
const dens = report.runs.flatMap((r) => r.images.map((i) => i.density));
console.log(`engine ${report.engine}, DPR ${DPR}, ${SIZES.length} sizes x ${STATES.length} states`);
console.log(`colours ${colors.length}: ${colors.join(' | ')}`);
console.log(`families ${families.length}: ${families.join(', ')}`);
console.log(`radii ${radii.length}: ${radii.join(', ')}; shadows ${shadows.length}`);
console.log(`images measured ${dens.length}, min density ${Math.min(...dens)}x, max distortion ${Math.max(...report.runs.flatMap((r) => r.images.map((i) => i.distortion)))}%`);
console.log(violations.length ? `VIOLATIONS ${violations.length}:\n- ` + [...new Set(violations)].slice(0, 60).join('\n- ') : 'VIOLATIONS 0');
process.exit(violations.length ? 1 : 0);
