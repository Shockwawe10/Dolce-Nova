// Demo card checks. Nothing here sends, stores or logs card data: it only answers "is this well formed?".
export function luhn(digits) {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Returns { field: message } for every invalid field; {} when the card is well formed. */
export function checkCard({ name, number, expiry, cvc }, now = new Date()) {
  const errors = {};
  if (!String(name || '').trim()) errors.name = 'Enter the name on the card.';
  if (!luhn(String(number || '').replace(/\s+/g, ''))) errors.number = 'Enter a valid card number.';
  const m = String(expiry || '').match(/^\s*(\d{2})\s*\/\s*(\d{2})\s*$/);
  const month = m && Number(m[1]);
  const year = m && 2000 + Number(m[2]);
  const thisMonth = now.getFullYear() * 12 + now.getMonth();
  if (!m || month < 1 || month > 12) errors.expiry = 'Use MM/YY.';
  else if (year * 12 + (month - 1) < thisMonth) errors.expiry = 'This card has expired.';
  if (!/^\d{3,4}$/.test(String(cvc || '').trim())) errors.cvc = 'Enter the 3 or 4 digit code.';
  return errors;
}
