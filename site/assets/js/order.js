// Checkout rules that are not the cart: shipping methods and prices, delivery windows in working days, and the
// contact and address checks. Pure functions, tested by tests/order.test.mjs. Amounts are integer cents.
// Prices and times are the owner's choice of 2026-11-17 (BRIEF.md): Standard 3-5 working days, EUR 4.90,
// free from EUR 40; Express 1-2 working days, EUR 9.90. EU addresses only.

export const SHIPPING = {
  standard: { label: 'Standard', cents: 490, freeFromCents: 4000, days: [3, 5] },
  express: { label: 'Express', cents: 990, freeFromCents: null, days: [1, 2] },
};

/** What a method costs for a given subtotal. */
export function shippingCents(method, subtotalCents) {
  const m = SHIPPING[method];
  if (!m) throw new Error(`unknown shipping method ${method}`);
  return m.freeFromCents !== null && subtotalCents >= m.freeFromCents ? 0 : m.cents;
}

/** n working days after `date` (Saturday and Sunday skipped); public holidays are not modelled. */
export function addWorkingDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  return d;
}

/** The first and last day the parcel can arrive for an order placed at `now`. */
export function deliveryWindow(method, now = new Date()) {
  const [a, b] = SHIPPING[method].days;
  return { from: addWorkingDays(now, a), to: addWorkingDays(now, b) };
}

const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const formatDay = (d) => dayFmt.format(d);
export const formatWindow = ({ from, to }) => `${formatDay(from)} – ${formatDay(to)}`;

/** EU countries we ship to, as [ISO code, name]. */
export const COUNTRIES = [
  ['AT', 'Austria'], ['BE', 'Belgium'], ['BG', 'Bulgaria'], ['HR', 'Croatia'], ['CY', 'Cyprus'], ['CZ', 'Czechia'],
  ['DK', 'Denmark'], ['EE', 'Estonia'], ['FI', 'Finland'], ['FR', 'France'], ['DE', 'Germany'], ['GR', 'Greece'],
  ['HU', 'Hungary'], ['IE', 'Ireland'], ['IT', 'Italy'], ['LV', 'Latvia'], ['LT', 'Lithuania'], ['LU', 'Luxembourg'],
  ['MT', 'Malta'], ['NL', 'Netherlands'], ['PL', 'Poland'], ['PT', 'Portugal'], ['RO', 'Romania'], ['SK', 'Slovakia'],
  ['SI', 'Slovenia'], ['ES', 'Spain'], ['SE', 'Sweden'],
];

// One "@", something before it, a dot in the part after it, no spaces. Deliberately loose: a stricter pattern
// rejects real addresses; the only proof an address works is a message that arrives.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns { field: message } for every missing or malformed contact or address field; {} when complete. */
export function checkContact(f) {
  const errors = {};
  const v = (k) => String(f[k] || '').trim();
  if (!v('email')) errors.email = 'Enter your email address.';
  else if (!EMAIL.test(v('email'))) errors.email = 'Enter an email address like name@example.com.';
  if (!v('firstName')) errors.firstName = 'Enter your first name.';
  if (!v('lastName')) errors.lastName = 'Enter your last name.';
  if (!v('address1')) errors.address1 = 'Enter your street and house number.';
  if (!v('postcode')) errors.postcode = 'Enter your postcode.';
  if (!v('city')) errors.city = 'Enter your town or city.';
  if (!COUNTRIES.some(([code]) => code === v('country'))) errors.country = 'Choose a country we ship to.';
  if (!SHIPPING[v('shipping')]) errors.shipping = 'Choose a shipping method.';
  return errors;
}
