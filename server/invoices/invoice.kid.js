/**
 * Norwegian KID generator using Mod11 with weights 2..7 cycling.
 * Falls back to Mod10 if Mod11 yields 10 as check digit.
 *
 * generateKid takes a numeric base (string of digits) and returns base+check.
 */

function mod11CheckDigit(base) {
  const digits = String(base).replace(/\D/g, '').split('').map(n => parseInt(n, 10));
  if (digits.length === 0) return null;
  let weight = 2;
  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += digits[i] * weight;
    weight = weight === 7 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const check = 11 - remainder;
  if (check === 11) return 0;
  if (check === 10) return 10; // invalid, caller may fallback
  return check;
}

function mod10CheckDigit(base) {
  const digits = String(base).replace(/\D/g, '').split('').map(n => parseInt(n, 10));
  let sum = 0;
  let doubleIt = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let val = digits[i];
    if (doubleIt) {
      val *= 2;
      if (val > 9) val -= 9;
    }
    sum += val;
    doubleIt = !doubleIt;
  }
  const check = (10 - (sum % 10)) % 10;
  return check;
}

function generateKid(numericBase) {
  const base = String(numericBase).replace(/\D/g, '');
  if (!base) throw new Error('generateKid: base must contain digits');
  const m11 = mod11CheckDigit(base);
  if (m11 !== 10 && m11 != null) return `${base}${m11}`;
  const m10 = mod10CheckDigit(base);
  return `${base}${m10}`;
}

module.exports = { generateKid, mod11CheckDigit, mod10CheckDigit };

