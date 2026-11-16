// End-to-end purchase flow in WebKit at 390x844 (touch) and 1440x900.
// Usage: node tools/serve.mjs & node qa/flow.mjs   -> exits 1 on any failed step
import { webkit } from 'playwright';
import assert from 'node:assert/strict';

const URL = 'http://localhost:4600/Dolce-Nova/';
const browser = await webkit.launch();
let failed = 0;
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1024 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(URL, { waitUntil: 'networkidle' });
    // open the second coffee, choose espresso and 1 kg, add twice
    await page.click('#t-nyeri');
    await page.locator('#p-nyeri label:has-text("Espresso")').click();
    await page.locator('#p-nyeri label:has-text("1")').filter({ hasText: 'kg' }).click();
    assert.match(await page.locator('#p-nyeri [data-price]').innerText(), /56\.00/);
    await page.locator('#p-nyeri button[type=submit]').click();
    await page.locator('#p-nyeri button[type=submit]').click();
    assert.equal(await page.locator('[data-cart-count]').innerText(), '2');
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
await browser.close();
process.exit(failed ? 1 : 0);
