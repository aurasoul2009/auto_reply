const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeWhatsAppMessages,
  normalizeInstagramMessages
} = require("../src/controllers/webhook.controller");

test("normalizes WhatsApp interactive button replies", () => {
  const result = normalizeWhatsAppMessages({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "phone-id" },
              messages: [
                {
                  from: "919876543210",
                  id: "wamid.1",
                  type: "interactive",
                  interactive: {
                    button_reply: {
                      id: "pricing",
                      title: "Pricing"
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].platform, "whatsapp");
  assert.equal(result[0].payload, "pricing");
  assert.equal(result[0].text, "Pricing");
});

test("normalizes Instagram quick replies and ignores echoes", () => {
  const result = normalizeInstagramMessages({
    object: "instagram",
    entry: [
      {
        id: "ig-business-id",
        messaging: [
          {
            sender: { id: "igsid-1" },
            recipient: { id: "ig-business-id" },
            message: {
              mid: "mid.1",
              text: "Services",
              quick_reply: { payload: "services" }
            }
          },
          {
            sender: { id: "ig-business-id" },
            recipient: { id: "igsid-1" },
            message: { mid: "mid.2", text: "echo", is_echo: true }
          }
        ]
      }
    ]
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].platform, "instagram");
  assert.equal(result[0].payload, "services");
  assert.equal(result[0].recipientId, "ig-business-id");
});

test("normalizes Instagram Login API account events from entry id", () => {
  const result = normalizeInstagramMessages({
    object: "instagram",
    entry: [
      {
        id: "17841400000000000",
        messaging: [
          {
            sender: { id: "igsid-2" },
            message: {
              mid: "mid.3",
              text: "hi"
            }
          }
        ]
      }
    ]
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].senderId, "igsid-2");
  assert.equal(result[0].recipientId, "17841400000000000");
  assert.equal(result[0].text, "hi");
});
