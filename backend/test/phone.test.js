const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePhone, toWhatsAppRecipient } = require("../src/utils/phone");

test("normalizes Indian 10-digit mobile numbers", () => {
  assert.equal(normalizePhone("98765 43210"), "+919876543210");
});

test("normalizes Indian numbers with a domestic zero prefix", () => {
  assert.equal(normalizePhone("09876543210"), "+919876543210");
});

test("preserves valid international E.164-style numbers", () => {
  assert.equal(normalizePhone("+1 (415) 555-2671"), "+14155552671");
});

test("rejects invalid numbers", () => {
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone(""), null);
});

test("returns the WhatsApp recipient without a plus sign", () => {
  assert.equal(toWhatsAppRecipient("+91 98765 43210"), "919876543210");
});
