const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateAdminCredentials
} = require("../src/middleware/admin.middleware");
const {
  normalizeTemplateVariables
} = require("../src/services/campaign.service");

test("admin credential checks fail safely when credentials do not match", () => {
  assert.equal(validateAdminCredentials("wrong", "wrong"), false);
});

test("normalizes up to three non-empty template variables", () => {
  assert.deepEqual(
    normalizeTemplateVariables([" first ", "", "second", "third", "fourth"]),
    ["first", "second", "third"]
  );
});

test("rejects non-array template variables", () => {
  assert.throws(
    () => normalizeTemplateVariables("not-an-array"),
    /variables must be an array/
  );
});
