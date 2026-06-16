const Campaign = require("../models/Campaign");
const Contact = require("../models/Contact");
const MessageLog = require("../models/MessageLog");
const whatsappService = require("./whatsapp.service");
const { env } = require("../config/env");
const { ApiError } = require("../utils/apiResponse");
const logger = require("../utils/logger");

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function validateTemplateInput({ templateName, languageCode }) {
  if (!templateName || !/^[a-z0-9_]+$/.test(templateName)) {
    throw new ApiError(
      400,
      "A valid approved WhatsApp templateName is required"
    );
  }
  if (!languageCode || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(languageCode)) {
    throw new ApiError(400, "A valid languageCode is required");
  }
}

function normalizeTemplateVariables(variables = []) {
  if (!Array.isArray(variables)) {
    throw new ApiError(400, "variables must be an array");
  }

  return variables
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

async function logCampaignMessage(contact, templateName, status, response, error) {
  return MessageLog.create({
    platform: "whatsapp",
    direction: "outgoing",
    messageId: response?.messages?.[0]?.id,
    senderId: env.whatsappPhoneNumberId,
    recipientId: contact.phone,
    messageType: "template",
    outgoingText: templateName,
    status,
    rawPayload: response,
    errorMessage: error?.message
  });
}

async function tryLogCampaignMessage(
  contact,
  templateName,
  status,
  response,
  error
) {
  try {
    await logCampaignMessage(
      contact,
      templateName,
      status,
      response,
      error
    );
  } catch (logError) {
    logger.error("Campaign message audit log failed", {
      recipient: contact.phone,
      status,
      message: logError.message
    });
  }
}

async function sendCampaign({
  title,
  templateName,
  languageCode = "en_US",
  variables = [],
  components
}) {
  if (!title || !String(title).trim()) {
    throw new ApiError(400, "Campaign title is required");
  }
  validateTemplateInput({ templateName, languageCode });
  const templateVariables =
    components !== undefined
      ? components
      : normalizeTemplateVariables(variables);
  if (!Array.isArray(templateVariables)) {
    throw new ApiError(400, "components must be an array");
  }

  const eligibilityFilter = {
    subscribed: true,
    optIn: true,
    phone: { $exists: true, $ne: "" }
  };
  const totalEligibleContacts = await Contact.countDocuments(eligibilityFilter);
  const contacts = await Contact.find(eligibilityFilter)
    .sort({ createdAt: 1 })
    .limit(env.campaignMaxRecipients)
    .lean();

  const campaign = await Campaign.create({
    title: String(title).trim(),
    templateName,
    languageCode,
    templateVariables:
      components === undefined ? templateVariables : [],
    status: "processing",
    totalRecipients: contacts.length,
    skippedCount: Math.max(0, totalEligibleContacts - contacts.length),
    startedAt: new Date(),
    errors:
      totalEligibleContacts > contacts.length
        ? [
            {
              recipient: "campaign",
              message: `Recipient cap of ${env.campaignMaxRecipients} applied`
            }
          ]
        : []
  });

  try {
    let lastSendOccurred = false;

    for (const contact of contacts) {
      if (lastSendOccurred) await delay(env.campaignDelayMs);

      try {
        const response = await whatsappService.sendTemplateMessage(
          contact.phone,
          templateName,
          languageCode,
          templateVariables
        );
        campaign.sentCount += 1;
        lastSendOccurred = true;
        await tryLogCampaignMessage(
          contact,
          templateName,
          "sent",
          response
        );
      } catch (error) {
        campaign.failedCount += 1;
        lastSendOccurred = true;
        if (campaign.errors.length < 100) {
          campaign.errors.push({
            recipient: contact.phone,
            message: error.message
          });
        }
        await tryLogCampaignMessage(
          contact,
          templateName,
          "failed",
          null,
          error
        );
      }
    }

    campaign.status =
      campaign.failedCount > 0 ? "completed_with_errors" : "completed";
    campaign.completedAt = new Date();
    await campaign.save();
    return campaign;
  } catch (error) {
    campaign.status = "failed";
    campaign.completedAt = new Date();
    campaign.errors.push({
      recipient: "campaign",
      message: error.message
    });
    await campaign.save();
    throw error;
  }
}

async function sendTestTemplate({
  to,
  templateName,
  languageCode = "en_US",
  components = []
}) {
  validateTemplateInput({ templateName, languageCode });
  if (!Array.isArray(components)) {
    throw new ApiError(400, "components must be an array");
  }
  const response = await whatsappService.sendTemplateMessage(
    to,
    templateName,
    languageCode,
    components
  );

  try {
    await MessageLog.create({
      platform: "whatsapp",
      direction: "outgoing",
      messageId: response?.messages?.[0]?.id,
      senderId: env.whatsappPhoneNumberId,
      recipientId: to,
      messageType: "template_test",
      outgoingText: templateName,
      status: "sent",
      rawPayload: response
    });
  } catch (error) {
    logger.error("Test template audit log failed", {
      recipient: to,
      message: error.message
    });
  }

  return response;
}

module.exports = {
  sendCampaign,
  sendTestTemplate,
  normalizeTemplateVariables
};
