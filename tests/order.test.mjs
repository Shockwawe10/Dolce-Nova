// Shipping prices, delivery windows and the contact and address checks (site/assets/js/order.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shippingCents, addWorkingDays, deliveryWindow, checkContact, COUNTRIES } from '../site/assets/js/order.js';

test('standard costs 4.90 below 40 euro and nothing from 40; express is always 9.90', () => {
  assert.equal(shippingCents('standard', 3999), 490);
  assert.equal(shippingCents('standard', 4000), 0);
  assert.equal(shippingCents('standard', 11200), 0);
  assert.equal(shippingCents('express', 1550), 990);
  assert.equal(shippingCents('express', 11200), 990);
  assert.throws(() => shippingCents('pigeon', 100));
});

test('working days skip the weekend', () => {
  const fri = new Date(2026, 10, 20);   // Friday 20 November 2026
  assert.equal(addWorkingDays(fri, 1).getDate(), 23);   // Monday
  assert.equal(addWorkingDays(fri, 3).getDate(), 25);   // Wednesday
  const sat = new Date(2026, 10, 21);
  assert.equal(addWorkingDays(sat, 1).getDate(), 23);   // an order on Saturday: Monday is the first working day
  for (let d = 0; d < 14; d++) {
    const day = addWorkingDays(new Date(2026, 10, 16 + d), 2).getDay();
    assert.ok(day !== 0 && day !== 6, 'never arrives on a weekend');
  }
});

test('delivery windows: standard 3 to 5 working days, express 1 to 2, from the order date', () => {
  const tue = new Date(2026, 10, 17, 15, 30);   // Tuesday 17 November, afternoon
  const s = deliveryWindow('standard', tue), e = deliveryWindow('express', tue);
  assert.deepEqual([s.from.getDate(), s.to.getDate()], [20, 24]);   // Fri 20 to Tue 24
  assert.deepEqual([e.from.getDate(), e.to.getDate()], [18, 19]);   // Wed 18 to Thu 19
  assert.ok(e.to < s.from || e.to <= s.to);
});

test('every contact and address field is required, the email must look like one, the country must be ours', () => {
  const ok = { email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace', address1: 'Keizersgracht 1', postcode: '1015 CJ', city: 'Amsterdam', country: 'NL', shipping: 'standard' };
  assert.deepEqual(checkContact(ok), {});
  assert.deepEqual(Object.keys(checkContact({})).sort(), ['address1', 'city', 'country', 'email', 'firstName', 'lastName', 'postcode', 'shipping']);
  for (const bad of ['ada', 'ada@', '@example.com', 'ada@example', 'ada lovelace@example.com']) assert.ok(checkContact({ ...ok, email: bad }).email, bad);
  assert.ok(checkContact({ ...ok, country: 'US' }).country);
  assert.ok(checkContact({ ...ok, firstName: '   ' }).firstName, 'spaces are not a name');
  assert.equal(COUNTRIES.length, 27);
});
