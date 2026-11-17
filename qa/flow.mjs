// End-to-end purchase flow in WebKit at 390x844 (touch) and 1440x900.
// Usage: node tools/serve.mjs & node qa/flow.mjs   -> exits 1 on any failed step
import { webkit } from 'playwright';
import assert from 'node:assert/strict';

const URL = process.env.BASE || 'http://localhost:4600/Dolce-Nova/';
const browser = await webkit.launch();
let failed = 0;
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1024 });
  // the catalog arrives late, as on a slow network: every choice must work before it has loaded
  // (found live 2026-11-17: a size picked early left the old price on the button)
  await ctx.route('**/data/catalog.json', async (r) => { await new Promise((s) => setTimeout(s, 1500)); await r.continue(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(URL, { waitUntil: 'networkidle' });
    // the carousel: the next button moves the row (desktop), a swipe moves it (phone); a bag opens its page
    const track = page.locator('#coffees .carousel__track');
    if (w >= 1024) {
      await page.click('#coffees [data-next]');
      await page.waitForFunction(() => document.querySelector('#coffees .carousel__track').scrollLeft > 0);
    } else await track.evaluate((t) => t.scrollBy({ left: t.clientWidth, behavior: 'instant' }));
    await page.locator('#coffees .slide__link[href="coffee-nyeri.html"]').click();
    await page.waitForURL(/coffee-nyeri/);
    // choose espresso and 1 kg, add twice
    const form = page.locator('form[data-add]');
    await form.locator('label:has-text("Espresso")').click();
    await form.locator('label:has-text("1")').filter({ hasText: 'kg' }).click();
    assert.match(await form.locator('[data-add-price]').innerText(), /56\.00/);
    await form.locator('button[type=submit]').click();
    await form.locator('button[type=submit]').click();
    // both presses count, even the ones made while the catalog was still on its way
    await page.waitForFunction(() => document.querySelector('[data-cart-count]').textContent === '2', null, { timeout: 5000 });
    // drawer: dialog semantics, inert page, Esc closes and returns focus
    await page.click('[data-cart-open]');
    await page.waitForSelector('#cart.is-open');
    assert.equal(await page.evaluate(() => document.querySelector('main').inert), true, 'main is inert while the drawer is open');
    assert.match(await page.locator('[data-cart-total]').innerText(), /112\.00/);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('cart').hidden);
    assert.equal(await page.evaluate(() => document.activeElement.matches('[data-cart-open]')), true, 'focus returns to the cart button');
    // checkout
    await page.click('[data-cart-open]');
    await page.click('[data-checkout]');
    await page.waitForURL(/checkout/);
    await page.fill('#name', 'Ada');
    await page.fill('#number', '4242 4242 4242 4241');
    await page.fill('#expiry', '12/34');
    await page.fill('#cvc', '123');
    await page.click('[data-pay-btn]');
    assert.match(await page.locator('#number-err').innerText(), /valid card/);
    assert.equal(await page.getAttribute('#number', 'aria-invalid'), 'true');
    await page.click('[data-test-card]');
    await page.click('[data-pay-btn]');
    await page.waitForURL(/success\.html\?order=DN-/);
    assert.match(await page.locator('[data-total]').innerText(), /112\.00/);
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    assert.ok(!/4242/.test(stored), 'no card digits anywhere in storage');
    assert.equal(await page.evaluate(() => localStorage.getItem('dn-cart')), '[]', 'cart cleared after the order');
    assert.deepEqual(errors, [], 'no page errors');
    console.log(`PASS flow ${w}x${h}`);
  } catch (e) {
    failed++;
    console.log(`FAIL flow ${w}x${h}: ${e.message}`);
    await page.screenshot({ path: `qa/out/flow-fail-${w}.png` }).catch(() => {});
  }
  await ctx.close();
}
// before (or without) the checkout script, Enter in a card field must not submit the form natively:
// a GET would put the card number in the URL. The pay button ships disabled, which blocks implicit submission.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/assets/js/checkout.js', (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(URL + 'checkout.html', { waitUntil: 'networkidle' });
  await page.fill('#number', '4242 4242 4242 4242');
  await page.press('#number', 'Enter');
  await page.waitForTimeout(800);
  const leaked = /4242/.test(page.url());
  console.log(`${leaked ? 'FAIL' : 'PASS'} no native submit before the checkout script: ${leaked ? 'card digits in the URL: ' + page.url() : 'URL unchanged'}`);
  if (leaked) failed++;
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
