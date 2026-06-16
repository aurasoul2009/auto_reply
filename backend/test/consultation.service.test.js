const test = require("node:test");
const assert = require("node:assert/strict");
const { CONSULTATION_STEPS } = require("../src/services/consultation.service");

test("consultation flow collects the required skincare fields in order", () => {
  assert.deepEqual(
    CONSULTATION_STEPS.map((step) => step.key),
    ["name", "age", "skinType", "skinConcern", "phoneNumber"]
  );
});
