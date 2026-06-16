function normalizePhone(value) {
  if (value === null || value === undefined) return null;

  const input = String(value).trim();
  if (!input) return null;

  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    digits = `91${digits}`;
  } else if (
    digits.length === 11 &&
    digits.startsWith("0") &&
    /^[6-9]/.test(digits.slice(1))
  ) {
    digits = `91${digits.slice(1)}`;
  }

  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) {
    return null;
  }

  return `+${digits}`;
}

function toWhatsAppRecipient(value) {
  const normalized = normalizePhone(value);
  return normalized ? normalized.slice(1) : null;
}

module.exports = { normalizePhone, toWhatsAppRecipient };
