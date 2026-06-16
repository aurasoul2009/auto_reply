const mongoose = require("mongoose");
const { env } = require("../config/env");
const {
  getConfig,
  interpolateMessage,
  formatMenuText
} = require("../services/config.service");
const whatsappService = require("../services/whatsapp.service");
const instagramService = require("../services/instagram.service");
const { ApiError, sendSuccess } = require("../utils/apiResponse");
const { toWhatsAppRecipient } = require("../utils/phone");

function requireFields(body, fields) {
  const missing = fields.filter((field) => !body[field]);
  if (missing.length) {
    throw new ApiError(400, `Missing required fields: ${missing.join(", ")}`);
  }
}

async function configStatus(_req, res) {
  return sendSuccess(res, {
    mongoConnected: mongoose.connection.readyState === 1,
    whatsappTokenPresent: Boolean(env.whatsappAccessToken),
    instagramTokenPresent: Boolean(env.instagramAccessToken),
    instagramBusinessAccountIdPresent: Boolean(env.instagramBusinessAccountId),
    whatsappPhoneNumberIdPresent: Boolean(env.whatsappPhoneNumberId)
  });
}

async function sendWhatsAppText(req, res) {
  requireFields(req.body, ["to", "text"]);
  const result = await whatsappService.sendTextMessage(req.body.to, req.body.text);
  return sendSuccess(res, result, "WhatsApp text sent");
}

function validateWhatsAppTemplateRequest(body) {
  requireFields(body, ["to", "templateName", "languageCode"]);

  if (!toWhatsAppRecipient(body.to)) {
    throw new ApiError(400, "A valid WhatsApp recipient phone is required");
  }
  if (
    typeof body.templateName !== "string" ||
    !/^[a-z0-9_]+$/.test(body.templateName)
  ) {
    throw new ApiError(
      400,
      "templateName may contain only lowercase letters, numbers, and underscores"
    );
  }
  if (
    typeof body.languageCode !== "string" ||
    !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(body.languageCode)
  ) {
    throw new ApiError(400, "A valid languageCode is required");
  }

  return {
    to: body.to,
    templateName: body.templateName,
    languageCode: body.languageCode
  };
}

async function sendWhatsAppTemplate(req, res) {
  const input = validateWhatsAppTemplateRequest(req.body);
  const result = await whatsappService.sendTemplateMessage(
    input.to,
    input.templateName,
    input.languageCode
  );
  return sendSuccess(res, result, "WhatsApp template sent");
}

async function sendWhatsAppButtons(req, res) {
  requireFields(req.body, ["to"]);
  const config = await getConfig();
  const bodyText =
    req.body.bodyText || interpolateMessage(config.welcomeMessage, config);
  const buttons = req.body.buttons || config.buttons;
  if (buttons.length > 3) {
    const result = await whatsappService.sendTextMessage(
      req.body.to,
      req.body.bodyText || formatMenuText(config)
    );
    return sendSuccess(
      res,
      result,
      "WhatsApp text menu sent because Cloud API reply buttons support only three options"
    );
  }
  const result = await whatsappService.sendButtonMessage(
    req.body.to,
    bodyText,
    buttons
  );
  return sendSuccess(res, result, "WhatsApp buttons sent");
}

async function sendInstagramText(req, res) {
  requireFields(req.body, ["recipientId", "text"]);
  const result = await instagramService.sendTextMessage(
    req.body.recipientId,
    req.body.text
  );
  return sendSuccess(res, result, "Instagram text sent");
}

async function sendInstagramQuickReplies(req, res) {
  requireFields(req.body, ["recipientId"]);
  const config = await getConfig();
  const text = req.body.text || interpolateMessage(config.welcomeMessage, config);
  const replies = req.body.replies || config.buttons;
  const result = await instagramService.sendQuickReplies(
    req.body.recipientId,
    text,
    replies
  );
  return sendSuccess(res, result, "Instagram quick replies sent");
}

module.exports = {
  configStatus,
  sendWhatsAppText,
  sendWhatsAppTemplate,
  sendWhatsAppButtons,
  sendInstagramText,
  sendInstagramQuickReplies,
  validateWhatsAppTemplateRequest
};
