// The roast slider (the owner, 2026-11-17: four batches, one temperature slider). Checks, at 1440x900, 390x844
// and 360x640:
//  - the four beans and the slider fit on one screen together (you can watch them while you drag);
//  - keyboard: End, Home and arrows move it; the readout, aria-valuetext, phase note and each batch's status follow;
//  - a mark (196 C) sets it; the light batch is done, the medium and dark batches still roasting;
//  - the 3D follows the slider (window.__roast.u settles on the slider's value).
// Usage: node tools/serve.mjs & node qa/roast-slider.mjs
import { webkit } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
const browser = await webkit.launch();
let failed = 0;
for (const [w, h] of [[1440, 900], [390, 844], [360, 640]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE + '?qa', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('#roast').scrollIntoView());
  await page.waitForFunction(() => window.__roast, null, { timeout: 60000 }).catch(() => {});
  const bad = [];
  const fit = await page.evaluate(() => {
    const top = document.querySelector('[data-bean-slot]').getBoundingClientRect().top;
    const bottom = document.querySelector('.roast__track').getBoundingClientRect().bottom;
    const header = document.querySelector('.header').getBoundingClientRect().height;
    return { span: Math.round(bottom - top), room: innerHeight - header };
  });
  if (fit.span > fit.room) bad.push(`beans to slider ${fit.span}px > ${fit.room}px of screen`);
  const read = () => page.evaluate(() => ({
    temp: document.querySelector('[data-roast-temp]').textContent,
    text: document.querySelector('#roast-temp').getAttribute('aria-valuetext'),
    note: document.querySelector('[data-roast-note]').textContent,
    status: [...document.querySelectorAll('[data-bean-status]')].slice(1).map((s) => s.textContent).join(','),
  }));
  await page.focus('#roast-temp');
  await page.keyboard.press('End');
  let s = await read();
  if (s.temp !== '230 °C' || s.status !== 'Done,Done,Done' || !/second crack/.test(s.text) || !/^Second crack\./.test(s.note)) bad.push(`End: ${JSON.stringify(s)}`);
  await page.keyboard.press('Home');
  s = await read();
  if (s.temp !== '20 °C' || s.status !== 'Waiting,Waiting,Waiting' || !/^Raw\./.test(s.note)) bad.push(`Home: ${JSON.stringify(s)}`);
  await page.keyboard.press('ArrowRight');
  s = await read();
  if (s.temp === '20 °C' || s.status !== 'Roasting,Roasting,Roasting') bad.push(`ArrowRight: ${JSON.stringify(s)}`);
  await page.click('[data-roast-tick="60"]');
  s = await read();
  if (s.temp !== '196 °C' || s.status !== 'Done,Roasting,Roasting' || !/first crack/.test(s.text)) bad.push(`mark 196: ${JSON.stringify(s)}`);
  const follows = await page.evaluate(async () => {
    if (!window.__roast) return 'no 3D';
    await window.__roast.settled();
    return Math.abs(window.__roast.u - Number(document.querySelector('#roast-temp').value)) < 1e-6 ? 'ok' : `3D at ${window.__roast.u}`;
  });
  if (follows !== 'ok') bad.push(`3D: ${follows}`);
  const ok = bad.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} roast slider ${w}x${h}: beans and slider span ${fit.span}px of ${fit.room}px; keys, marks and the 3D ${ok ? 'in step' : bad.join('; ')}`);
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
