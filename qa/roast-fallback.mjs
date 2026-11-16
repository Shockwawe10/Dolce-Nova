// With WebGL disabled, the roast path must show the four real roast photographs instead of an empty stage.
// Usage: node tools/serve.mjs & node qa/roast-fallback.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4600/Dolce-Nova/', { waitUntil: 'networkidle' });
await page.evaluate(() => { const s = document.querySelector('[data-roastpath]'); scrollTo(0, s.offsetTop + 400); });
await page.waitForFunction(() => document.querySelector('.roastpath--fallback'), null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(800);
const r = await page.evaluate(() => {
  const s = document.querySelector('[data-roastpath]');
  const imgs = [...s.querySelectorAll('.roastpath__frames img')].filter((i) => i.getBoundingClientRect().width > 0 && i.complete && i.naturalWidth > 0);
  return { fallback: s.classList.contains('roastpath--fallback'), visiblePhotos: imgs.length };
});
await page.screenshot({ path: 'qa/out/roast/fallback-1440.png' });
console.log(`${r.fallback && r.visiblePhotos === 4 ? 'PASS' : 'FAIL'} no-WebGL fallback: class ${r.fallback}, ${r.visiblePhotos}/4 photos shown`);
await browser.close();
process.exit(r.fallback && r.visiblePhotos === 4 ? 0 : 1);
