const MessageLog = require("../models/MessageLog");
const { env } = require("../config/env");
const { handleIncomingMessage } = require("../services/messageHandler.service");
const logger = require("../utils/logger");

function verifyWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.metaVerifyToken) {
    logger.info("Meta webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}

function normalizeWhatsAppMessages(payload) {
  const messages = [];
  if (payload.object !== "whatsapp_business_account") return messages;

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const message of value.messages || []) {
        const interactiveReply =
          message.interactive?.button_reply || message.interactive?.list_reply;
        const legacyButton = message.button;

        messages.push({
          platform: "whatsapp",
          senderId: message.from,
          recipientId:
            value.metadata?.display_phone_number ||
            value.metadata?.phone_number_id ||
            env.whatsappPhoneNumberId,
          messageId: message.id,
          messageType: message.type || "unknown",
          text:
            message.text?.body ||
            interactiveReply?.title ||
            legacyButton?.text ||
            "",
          payload:
            interactiveReply?.id ||
            legacyButton?.payload ||
            "",
          rawPayload: message
        });
      }
    }
  }

  return messages;
}

function normalizeInstagramMessages(payload) {
  const messages = [];
  if (payload.object !== "instagram") return messages;

  for (const entry of payload.entry || []) {
    for (const event of entry.messaging || []) {
      const senderId = event.sender?.id;
      const recipientId =
        event.recipient?.id ||
        entry.id ||
        env.instagramBusinessAccountId;
      const accountIds = [
        event.recipient?.id,
        entry.id,
        env.instagramBusinessAccountId
      ].filter(Boolean);
      const eventType = event.message?.quick_reply
        ? "quick_reply"
        : event.message?.text
          ? "text"
          : event.message_edit
            ? "message_edit"
            : event.read
              ? "read"
              : event.delivery
                ? "delivery"
                : event.message
                  ? "unsupported_message"
                  : "unsupported_event";

      const ignore = (reason) => {
        logger.info("Instagram webhook event ignored", {
          senderId,
          recipientId,
          eventType,
          reason
        });
      };

      if (!senderId) {
        ignore("missing_sender_id");
        continue;
      }
      if (accountIds.includes(senderId)) {
        ignore("self_sender");
        continue;
      }
      if (!event.message) {
        ignore(eventType);
        continue;
      }
      if (event.message.is_echo) {
        ignore("echo_message");
        continue;
      }
      if (event.read || event.delivery) {
        ignore(eventType);
        continue;
      }
      if (!event.message.text && !event.message.quick_reply?.payload) {
        ignore("unsupported_message_without_text");
        continue;
      }

      logger.info("Instagram webhook message accepted", {
        senderId,
        recipientId,
        eventType,
        incomingText: event.message.text || "",
        quickReplyPayload: event.message.quick_reply?.payload || ""
      });

      messages.push({
        platform: "instagram",
        senderId,
        recipientId,
        messageId: event.message.mid,
        messageType: eventType,
        text: event.message.text || "",
        payload: event.message.quick_reply?.payload || "",
        rawPayload: event
      });
    }
  }

  return messages.filter((message) => message.senderId);
}

function logInstagramWebhookDebug(req) {
  const payload = req.body || {};
  if (payload.object !== "instagram") return;

  console.log("=== INSTAGRAM WEBHOOK RECEIVED ===");
  console.log(JSON.stringify(req.body, null, 2));
  console.log(
    "x-hub-signature-256:",
    req.headers["x-hub-signature-256"]
  );
  console.log("payload.object:", payload.object);
  console.log("payload.entry:", JSON.stringify(payload.entry, null, 2));
}

async function processNormalizedMessage(message) {
  try {
    await MessageLog.create({
      platform: message.platform,
      direction: "incoming",
      messageId: message.messageId,
      senderId: message.senderId,
      recipientId: message.recipientId,
      messageType: message.messageType,
      incomingText: message.text,
      buttonPayload: message.payload,
      status: "received",
      rawPayload: message.rawPayload
    });
  } catch (error) {
    if (error.code === 11000) {
      logger.info("Duplicate webhook message ignored", {
        platform: message.platform,
        messageId: message.messageId
      });
      return;
    }
    throw error;
  }

  await handleIncomingMessage(message);
}

async function processWebhookPayload(payload) {
  const messages = [
    ...normalizeWhatsAppMessages(payload),
    ...normalizeInstagramMessages(payload)
  ];

  for (const message of messages) {
    try {
      await processNormalizedMessage(message);
    } catch (error) {
      logger.error("Webhook message processing failed", {
        platform: message.platform,
        messageId: message.messageId,
        message: error.message,
        stack: error.stack
      });
    }
  }
}

function receiveWebhook(req, res) {
  logInstagramWebhookDebug(req);
  res.sendStatus(200);
  setImmediate(() => {
    processWebhookPayload(req.body).catch((error) => {
      logger.error("Webhook payload processing failed", {
        message: error.message,
        stack: error.stack
      });
    });
  });
}

module.exports = {
  verifyWebhook,
  receiveWebhook,
  processWebhookPayload,
  normalizeWhatsAppMessages,
  normalizeInstagramMessages
};
