// Screenshot each comp (qa/comps/*.html) at 390x844 and 1440x900: first screen and the shop.
// Usage: node tools/shoot-comps.mjs [a b c]   -> qa/out/comps/<comp>-<w>-{hero,shop}.png
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const comps = process.argv.slice(2).length ? process.argv.slice(2) : ['a', 'b', 'c'];
mkdirSync('qa/out/comps', { recursive: true });
const browser = await webkit.launch();
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const c of comps) {
    await page.goto(pathToFileURL(resolve(`qa/comps/${c}.html`)).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `qa/out/comps/${c}-${w}-hero.png` });
    await page.evaluate(() => document.querySelector('.shop').scrollIntoView());
    await page.waitForTimeout(200);
    await page.screenshot({ path: `qa/out/comps/${c}-${w}-shop.png` });
    console.log('shot', c, w);
  }
  await ctx.close();
}
await browser.close();
