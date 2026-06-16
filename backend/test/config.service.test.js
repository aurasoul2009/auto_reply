const test = require("node:test");
const assert = require("node:assert/strict");
const {
  findMatchingButton,
  interpolateMessage,
  normalizeComparable,
  updateConfig,
  DEFAULT_CONFIG
} = require("../src/services/config.service");

const config = {
  businessName: "Rhythm Skin Care",
  staffWhatsAppNumber: "+919999999999",
  buttons: [
    {
      label: "Talk to Staff",
      payload: "talk_to_staff",
      replyMessage: "Call {{staffWhatsAppNumber}}"
    }
  ]
};

test("matches buttons by payload or human-readable label", () => {
  assert.equal(findMatchingButton(config, "talk_to_staff").label, "Talk to Staff");
  assert.equal(findMatchingButton(config, " TALK TO STAFF ").payload, "talk_to_staff");
});

test("interpolates supported configuration variables", () => {
  assert.equal(
    interpolateMessage("Welcome to {{businessName}}: {{staffWhatsAppNumber}}", config),
    "Welcome to Rhythm Skin Care: +919999999999"
  );
});

test("normalizes comparable user input", () => {
  assert.equal(normalizeComparable("  Talk   To Staff "), "talk to staff");
});

test("uses Rhythm Skin Care defaults with four menu options", () => {
  assert.equal(DEFAULT_CONFIG.businessName, "Rhythm Skin Care");
  assert.equal(DEFAULT_CONFIG.buttons.length, 4);
  assert.equal(DEFAULT_CONFIG.buttons[0].payload, "view_products");
  assert.equal(DEFAULT_CONFIG.buttons[1].payload, "offers_discounts");
  assert.equal(DEFAULT_CONFIG.buttons[2].payload, "book_consultation");
});

test("matches menu options by number", () => {
  assert.equal(findMatchingButton(DEFAULT_CONFIG, "1").payload, "view_products");
  assert.equal(
    findMatchingButton(DEFAULT_CONFIG, "2").payload,
    "offers_discounts"
  );
  assert.equal(
    findMatchingButton(DEFAULT_CONFIG, "3").payload,
    "book_consultation"
  );
});

test("rejects string booleans in configuration updates", async () => {
  await assert.rejects(
    () => updateConfig({ isActive: "false" }),
    /isActive must be a boolean/
  );
});
