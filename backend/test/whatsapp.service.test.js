const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildTemplatePayload,
  getMetaError,
  isExpiredAccessTokenError,
  createWhatsAppApiError
} = require("../src/services/whatsapp.service");
const {
  validateWhatsAppTemplateRequest
} = require("../src/controllers/test.controller");

test("builds the exact first-outbound WhatsApp template payload", () => {
  assert.deepEqual(
    buildTemplatePayload("918111031897", "hello_world", "en_US"),
    {
      messaging_product: "whatsapp",
      to: "918111031897",
      type: "template",
      template: {
        name: "hello_world",
        language: {
          code: "en_US"
        }
      }
    }
  );
});

test("builds WhatsApp body components from template variables", () => {
  assert.deepEqual(
    buildTemplatePayload(
      "918111031897",
      "festival_offer",
      "en_US",
      ["Prasanna", "20%"]
    ),
    {
      messaging_product: "whatsapp",
      to: "918111031897",
      type: "template",
      template: {
        name: "festival_offer",
        language: {
          code: "en_US"
        },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "Prasanna" },
              { type: "text", text: "20%" }
            ]
          }
        ]
      }
    }
  );
});
test("validates the WhatsApp template test request", () => {
  assert.deepEqual(
    validateWhatsAppTemplateRequest({
      to: "918111031897",
      templateName: "hello_world",
      languageCode: "en_US"
    }),
    {
      to: "918111031897",
      templateName: "hello_world",
      languageCode: "en_US"
    }
  );
});

test("rejects incomplete WhatsApp template test requests", () => {
  assert.throws(
    () =>
      validateWhatsAppTemplateRequest({
        to: "918111031897",
        templateName: "hello_world"
      }),
    /Missing required fields: languageCode/
  );
});

test("identifies an expired Meta access token without retaining credentials", () => {
  const metaError = getMetaError({
    response: {
      status: 400,
      data: {
        error: {
          message: "Error validating access token: Session has expired.",
          type: "OAuthException",
          code: 190,
          error_subcode: 463,
          fbtrace_id: "trace-id"
        }
      }
    }
  });

  assert.equal(isExpiredAccessTokenError(metaError), true);
  assert.deepEqual(metaError, {
    statusCode: 400,
    errorMessage: "Error validating access token: Session has expired.",
    errorType: "OAuthException",
    errorCode: 190,
    errorSubcode: 463,
    fbtrace_id: "trace-id"
  });

  const apiError = createWhatsAppApiError(metaError);
  assert.equal(apiError.statusCode, 401);
  assert.equal(
    apiError.message,
    "WhatsApp access token expired. Generate a new temporary token or use permanent system user token."
  );
});
