const axios = require("axios");
const { env } = require("../config/env");
const { ApiError } = require("../utils/apiResponse");
const { toWhatsAppRecipient } = require("../utils/phone");
const logger = require("../utils/logger");

function getClient() {
  if (!env.whatsappAccessToken) {
    throw new ApiError(
      503,
      "WHATSAPP_ACCESS_TOKEN is not configured on this server"
    );
  }
  if (!env.whatsappPhoneNumberId) {
    throw new ApiError(
      503,
      "WHATSAPP_PHONE_NUMBER_ID is not configured on this server"
    );
  }
  if (!/^\d+$/.test(env.whatsappPhoneNumberId)) {
    throw new ApiError(
      503,
      "WHATSAPP_PHONE_NUMBER_ID must be the actual numeric phone number ID from Meta"
    );
  }

  return axios.create({
    baseURL: `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}`,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${env.whatsappAccessToken}`,
      "Content-Type": "application/json"
    }
  });
}

function recipientFor(value) {
  const recipient = toWhatsAppRecipient(value);
  if (!recipient) throw new ApiError(400, "A valid recipient phone is required");
  return recipient;
}

function buildTemplatePayload(
  to,
  templateName,
  languageCode,
  variables = []
) {
  const payload = {
    messaging_product: "whatsapp",
    to: recipientFor(to),
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      }
    }
  };

  if (Array.isArray(variables) && variables.length) {
    const hasStructuredComponents = variables.every(
      (item) => item && typeof item === "object" && !Array.isArray(item)
    );

    payload.template.components = hasStructuredComponents
      ? variables
      : [
          {
            type: "body",
            parameters: variables.map((value) => ({
              type: "text",
              text: String(value)
            }))
          }
        ];
  }

  return payload;
}

function getMetaError(error) {
  const metaError = error.response?.data?.error || {};
  const statusCode = error.response?.status || 502;
  const errorMessage =
    metaError.message || error.response?.data?.message || error.message;

  return {
    statusCode,
    errorMessage,
    errorType: metaError.type || error.name || "UnknownError",
    errorCode: metaError.code,
    errorSubcode: metaError.error_subcode,
    fbtrace_id: metaError.fbtrace_id
  };
}

function isExpiredAccessTokenError(metaError) {
  if (metaError.errorCode !== 190) return false;

  return (
    metaError.errorSubcode === 463 ||
    metaError.errorSubcode === 467 ||
    /expired|session has been invalidated/i.test(metaError.errorMessage || "")
  );
}

function createWhatsAppApiError(metaError) {
  const details = {
    statusCode: metaError.statusCode,
    errorType: metaError.errorType,
    errorCode: metaError.errorCode,
    errorSubcode: metaError.errorSubcode,
    fbtrace_id: metaError.fbtrace_id
  };

  if (isExpiredAccessTokenError(metaError)) {
    return new ApiError(
      401,
      "WhatsApp access token expired. Generate a new temporary token or use permanent system user token.",
      details
    );
  }

  return new ApiError(
    metaError.statusCode,
    `WhatsApp API error: ${metaError.errorMessage}`,
    details
  );
}

async function send(payload) {
  try {
    const response = await getClient().post("/messages", payload);
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && !error.response) {
      throw error;
    }

    const metaError = getMetaError(error);

    logger.error("WhatsApp Cloud API request failed", {
      statusCode: metaError.statusCode,
      errorMessage: metaError.errorMessage,
      errorType: metaError.errorType,
      fbtrace_id: metaError.fbtrace_id
    });

    throw createWhatsAppApiError(metaError);
  }
}

async function sendTextMessage(to, text) {
  return send({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientFor(to),
    type: "text",
    text: {
      preview_url: false,
      body: String(text).slice(0, 4096)
    }
  });
}

async function sendButtonMessage(to, bodyText, buttons) {
  if (!Array.isArray(buttons) || buttons.length === 0 || buttons.length > 3) {
    throw new ApiError(400, "WhatsApp requires between one and three buttons");
  }

  return send({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientFor(to),
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: String(bodyText).slice(0, 1024)
      },
      action: {
        buttons: buttons.map((button) => ({
          type: "reply",
          reply: {
            id: String(button.payload).slice(0, 256),
            title: String(button.label).slice(0, 20)
          }
        }))
      }
    }
  });
}

async function sendTemplateMessage(
  to,
  templateName,
  languageCode = "en_US",
  variables = []
) {
  if (!/^[a-z0-9_]+$/.test(templateName)) {
    throw new ApiError(
      400,
      "templateName may contain only lowercase letters, numbers, and underscores"
    );
  }
  if (!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(languageCode)) {
    throw new ApiError(400, "A valid languageCode is required");
  }
  if (!Array.isArray(variables)) {
    throw new ApiError(400, "variables must be an array");
  }

  return send(
    buildTemplatePayload(to, templateName, languageCode, variables)
  );
}

module.exports = {
  sendTextMessage,
  sendButtonMessage,
  sendTemplateMessage,
  buildTemplatePayload,
  getMetaError,
  isExpiredAccessTokenError,
  createWhatsAppApiError
};
