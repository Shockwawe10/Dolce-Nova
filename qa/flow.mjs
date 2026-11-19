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
    // the order (2026-11-19): on a phone a folded bar above the form that names the count and total and opens;
    // on desktop the full summary in the right column, no bar
    await page.waitForFunction(() => !document.querySelector('[data-pay-btn]').disabled);
    const bar = page.locator('[data-sum-toggle]');
    if (w < 1024) {
      assert.equal(await bar.isVisible(), true, 'the order bar shows on a phone');
      assert.match(await bar.innerText(), /2 items[\s\S]*€\d/);
      const [barY, formY] = await page.evaluate(() => ['[data-sum-toggle]', '[data-pay]'].map((s) => document.querySelector(s).getBoundingClientRect().top));
      assert.ok(barY < formY, 'the order bar sits above the form');
      assert.equal(await page.locator('[data-summary]').isVisible(), false, 'the lines start folded');
      await bar.click();
      assert.equal(await page.locator('[data-summary]').isVisible(), true, 'the bar opens the lines');
      assert.equal(await bar.getAttribute('aria-expanded'), 'true');
    } else {
      assert.equal(await bar.isVisible(), false, 'no bar on desktop');
      assert.equal(await page.locator('[data-summary]').isVisible(), true, 'the summary shows on desktop');
    }
    // an empty form: every required field says what it needs, focus goes to the first (the email)
    await page.click('[data-pay-btn]');
    for (const id of ['email', 'firstName', 'lastName', 'address1', 'postcode', 'city', 'country', 'number']) {
      assert.notEqual((await page.locator(`#${id}-err`).innerText()).trim(), '', `${id} has a message`);
    }
    assert.equal(await page.evaluate(() => document.activeElement.id), 'email', 'focus on the first missing field');
    // contact and address; standard shipping is free over 40 euro, express is 9.90
    await page.fill('#email', 'ada@example.com');
    await page.fill('#firstName', 'Ada');
    await page.fill('#lastName', 'Lovelace');
    await page.fill('#address1', 'Keizersgracht 1');
    await page.fill('#postcode', '1015 CJ');
    await page.fill('#city', 'Amsterdam');
    await page.selectOption('#country', 'NL');
    assert.match(await page.locator('[data-sum-shipping]').innerText(), /Free/);
    assert.match(await page.locator('[data-sum-total]').innerText(), /112\.00/);
    await page.locator('label.ship:has(input[value="express"])').click();
    assert.match(await page.locator('[data-sum-shipping]').innerText(), /9\.90/);
    assert.match(await page.locator('[data-sum-total]').innerText(), /121\.90/);
    assert.match(await page.locator('[data-sum-eta]').innerText(), /^Arrives \w{3} \d{1,2} \w{3} – \w{3} \d{1,2} \w{3}$/);
    // a bad card is caught, the test card goes through
    await page.fill('#name', 'Ada Lovelace');
    await page.fill('#number', '4242 4242 4242 4241');
    await page.fill('#expiry', '12/34');
    await page.fill('#cvc', '123');
    await page.click('[data-pay-btn]');
    assert.match(await page.locator('#number-err').innerText(), /valid card/);
    assert.equal(await page.getAttribute('#number', 'aria-invalid'), 'true');
    assert.equal((await page.locator('#email-err').innerText()).trim(), '', 'the fixed email has no message');
    await page.click('[data-test-card]');
    await page.click('[data-pay-btn]');
    await page.waitForURL(/success\.html\?order=DN-/);
    assert.match(await page.locator('[data-total-line]').innerText(), /121\.90/);
    // the confirmation (2026-11-19): the bag bought, under a label addressed to the buyer; three dated steps;
    // the brew card for the grind chosen (espresso); the email folded away until asked for
    await page.waitForFunction(() => { const i = document.querySelector('[data-bags] img'); return i && i.complete && i.naturalWidth > 0; });
    const label = await page.locator('[data-label]').innerText();
    for (const want of [/Ada Lovelace/, /Amsterdam, Netherlands/, /Nyeri Gatomboya/, /DN-/]) assert.match(label, want);
    assert.equal(await page.locator('[data-steps] li').count(), 3, 'three steps');
    assert.match(await page.locator('[data-steps]').innerText(), /arrives\s+\w{3} \d{1,2} \w{3} – /i);
    await page.waitForSelector('[data-brew]:not([hidden])');
    assert.match(await page.locator('[data-brew]').innerText(), /espresso/i);
    assert.equal(await page.locator('[data-email] .email').isVisible(), false, 'the email starts folded');
    await page.click('[data-email] summary');
    // the confirmation and the email preview carry the order, the shipping and the address
    const mail = await page.locator('[data-email]').innerText();
    for (const want of [/ada@example\.com/, /Your Dolce Nova order DN-/, /Hi Ada/, /Express/, /9\.90/, /121\.90/, /Arriving \w{3} \d{1,2} \w{3} – /, /Keizersgracht 1/, /1015 CJ Amsterdam/, /Netherlands/, /Nyeri Gatomboya/]) {
      assert.match(mail, want);
    }
    // the confirmation says plainly that nothing was charged or sent (the one line kept, 2026-11-17)
    assert.match(await page.locator('[data-lede]').innerText(), /Nothing was charged and no email was sent/);
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
