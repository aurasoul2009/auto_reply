const Contact = require("../models/Contact");
const MessageLog = require("../models/MessageLog");
const whatsappService = require("./whatsapp.service");
const instagramService = require("./instagram.service");
const {
  getConfig,
  interpolateMessage,
  findMatchingButton,
  formatMenuText,
  getInstagramReplyConfig,
  normalizeComparable
} = require("./config.service");
const {
  getActiveProducts,
  formatProductList
} = require("./product.service");
const {
  getActiveConsultation,
  startConsultation,
  handleConsultationAnswer,
  cancelActiveConsultation,
  recordProductEnquiry
} = require("./consultation.service");
const { normalizePhone } = require("../utils/phone");
const logger = require("../utils/logger");

const STOP_WORDS = new Set(["stop", "unsubscribe", "cancel", "opt out", "optout"]);

async function updateContact(message, isStop) {
  const now = new Date();
  if (message.platform === "whatsapp") {
    const phone = normalizePhone(message.senderId);
    if (!phone) return null;

    const setOnInsert = {
      phone,
      ...(!isStop ? { subscribed: true, optIn: false } : {})
    };
    const update = {
      $set: {
        source: "whatsapp",
        lastMessage: message.text || message.payload || "",
        lastInteractionAt: now,
        ...(isStop ? { subscribed: false, optIn: false } : {})
      },
      $setOnInsert: setOnInsert
    };

    return Contact.findOneAndUpdate({ phone }, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    });
  }

  const update = {
    $set: {
      source: "instagram",
      lastMessage: message.text || message.payload || "",
      lastInteractionAt: now,
      ...(isStop ? { subscribed: false, optIn: false } : {})
    },
    $setOnInsert: {
      instagramId: message.senderId,
      ...(!isStop ? { subscribed: true, optIn: false } : {})
    }
  };

  return Contact.findOneAndUpdate(
    { instagramId: message.senderId },
    update,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
}

async function logOutgoing({
  message,
  type,
  text,
  payload,
  status,
  response,
  error
}) {
  const responseMessageId =
    response?.messages?.[0]?.id || response?.message_id;

  return MessageLog.create({
    platform: message.platform,
    direction: "outgoing",
    messageId: responseMessageId,
    senderId: message.recipientId,
    recipientId: message.senderId,
    messageType: type,
    outgoingText: text,
    buttonPayload: payload,
    status,
    rawPayload: response,
    errorMessage: error?.message
  });
}

async function tryLogOutgoing(data) {
  try {
    await logOutgoing(data);
  } catch (error) {
    logger.error("Outgoing message audit log failed", {
      platform: data.message.platform,
      recipientId: data.message.senderId,
      status: data.status,
      message: error.message
    });
  }
}

async function sendAndLog(message, type, text, payload, sender) {
  let response;
  try {
    response = await sender();
  } catch (error) {
    await tryLogOutgoing({
      message,
      type,
      text,
      payload,
      status: "failed",
      error
    });
    throw error;
  }

  await tryLogOutgoing({
    message,
    type,
    text,
    payload,
    status: "sent",
    response
  });
  return response;
}

async function sendTextReply(message, text, payload) {
  if (message.platform === "whatsapp") {
    return sendAndLog(message, "text", text, payload, () =>
      whatsappService.sendTextMessage(message.senderId, text)
    );
  }

  return sendAndLog(message, "text", text, payload, () =>
    instagramService.sendTextMessage(message.senderId, text)
  );
}

async function sendWelcome(message, config) {
  if (message.platform === "whatsapp") {
    const text = formatMenuText(config);
    if (config.buttons.length > 3) {
      return sendAndLog(message, "menu_text", text, null, () =>
        whatsappService.sendTextMessage(message.senderId, text)
      );
    }

    return sendAndLog(message, "interactive_buttons", text, null, () =>
      whatsappService.sendButtonMessage(message.senderId, text, config.buttons)
    );
  }

  const instagramConfig = getInstagramReplyConfig(config);
  const text = formatMenuText(instagramConfig);
  return sendAndLog(message, "quick_replies", text, null, () =>
    instagramService.sendQuickReplies(
      message.senderId,
      text,
      instagramConfig.buttons
    )
  );
}

async function handleMenuOption(message, config, matchedButton, candidate) {
  if (matchedButton.payload === "view_products") {
    const products = await getActiveProducts();
    await recordProductEnquiry(message, products);
    await sendTextReply(message, formatProductList(products), matchedButton.payload);
    return true;
  }

  if (matchedButton.payload === "book_consultation") {
    const { reply } = await startConsultation(message);
    await sendTextReply(message, reply, matchedButton.payload);
    return true;
  }

  await sendTextReply(
    message,
    interpolateMessage(matchedButton.replyMessage, config),
    matchedButton.payload || candidate
  );
  return true;
}

async function handleIncomingMessage(message) {
  const config = await getConfig();
  const candidate = message.payload || message.text || "";
  const normalized = normalizeComparable(candidate);
  const isStop = STOP_WORDS.has(normalized);
  await updateContact(message, isStop);

  if (isStop) {
    await cancelActiveConsultation(message);
    await sendTextReply(
      message,
      interpolateMessage(config.stopReplyMessage, config),
      candidate
    );
    return;
  }

  if (!config.isActive) {
    logger.info("Automation is inactive; incoming message was logged only", {
      platform: message.platform,
      senderId: message.senderId
    });
    return;
  }

  const activeConsultation = await getActiveConsultation(message);
  if (activeConsultation) {
    const reply = await handleConsultationAnswer(message, activeConsultation);
    await sendTextReply(message, reply, "consultation_flow");
    return;
  }

  const triggerWords = [
    ...new Set([
      ...config.triggerWords,
      "hi",
      "hello",
      "hey",
      "hii"
    ])
  ].map(normalizeComparable);
  if (triggerWords.includes(normalized)) {
    await sendWelcome(message, config);
    return;
  }

  const matchedButton = findMatchingButton(config, candidate);
  if (matchedButton) {
    await handleMenuOption(message, config, matchedButton, candidate);
    return;
  }

  if (config.fallbackMessage) {
    await sendTextReply(
      message,
      interpolateMessage(config.fallbackMessage, config)
    );
  }
}

module.exports = { handleIncomingMessage, STOP_WORDS };
