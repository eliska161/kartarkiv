const assert = require('assert');
const { generateKid, mod10CheckDigit, mod11CheckDigit } = require('../invoices/invoice.kid');

// Deterministic cases
const cases = [
  '1', '12', '123', '1234', '12345', '9876543', '0000123', '7654321'
];

for (const base of cases) {
  const kid = generateKid(base);
  assert(/^[0-9]+$/.test(kid), 'KID should be numeric');
  assert(kid.startsWith(base.replace(/\D/g, '')), 'KID should start with base');
  const check = kid.slice(-1);
  // Try validating with mod11 first, fallback to mod10
  const m11 = mod11CheckDigit(kid.slice(0, -1));
  if (m11 !== 10 && m11 != null) {
    assert.strictEqual(String(m11), check, 'Mod11 check mismatch');
  } else {
    const m10 = mod10CheckDigit(kid.slice(0, -1));
    assert.strictEqual(String(m10), check, 'Mod10 check mismatch');
  }
}

console.log('KID tests passed (', cases.length, 'cases )');

