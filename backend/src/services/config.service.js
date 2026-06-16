const AppConfig = require("../models/AppConfig");
const { ApiError } = require("../utils/apiResponse");
const { BRAND } = require("../config/brand");

const DEFAULT_CONFIG = Object.freeze({
  businessName: BRAND.name,
  staffWhatsAppNumber: BRAND.supportWhatsApp,
  welcomeMessage: BRAND.automation.welcomeMessage,
  triggerWords: BRAND.automation.triggerWords,
  buttons: BRAND.automation.menuOptions,
  fallbackMessage: BRAND.automation.fallbackMessage,
  stopReplyMessage: BRAND.automation.stopReplyMessage,
  isActive: true
});

function normalizeComparable(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeConfigInput(input) {
  const output = {};
  const stringFields = [
    "businessName",
    "staffWhatsAppNumber",
    "welcomeMessage",
    "fallbackMessage",
    "stopReplyMessage"
  ];

  for (const field of stringFields) {
    if (input[field] !== undefined) output[field] = String(input[field]).trim();
  }

  if (input.isActive !== undefined) {
    if (typeof input.isActive !== "boolean") {
      throw new ApiError(400, "isActive must be a boolean");
    }
    output.isActive = input.isActive;
  }

  if (input.triggerWords !== undefined) {
    if (!Array.isArray(input.triggerWords)) {
      throw new ApiError(400, "triggerWords must be an array");
    }
    output.triggerWords = [
      ...new Set(
        input.triggerWords
          .map(normalizeComparable)
          .filter(Boolean)
      )
    ];
  }

  if (input.buttons !== undefined) {
    if (
      !Array.isArray(input.buttons) ||
      input.buttons.length < 3 ||
      input.buttons.length > 4
    ) {
      throw new ApiError(400, "buttons must contain three or four items");
    }

    output.buttons = input.buttons.map((button, index) => {
      if (!button.label || !button.payload || !button.replyMessage) {
        throw new ApiError(
          400,
          `Button ${index + 1} requires label, payload, and replyMessage`
        );
      }

      return {
        label: String(button.label).trim(),
        payload: normalizeComparable(button.payload).replace(/\s+/g, "_"),
        replyMessage: String(button.replyMessage).trim()
      };
    });

    const payloads = output.buttons.map((button) => button.payload);
    if (new Set(payloads).size !== payloads.length) {
      throw new ApiError(400, "Button payloads must be unique");
    }
  }

  return output;
}

async function ensureDefaultConfig() {
  const existing = await AppConfig.findOne();
  if (existing) {
    const legacyPattern = new RegExp("dev" + "nfix", "i");
    const oldRhythmPattern =
      /your skin care journey|please choose an option|view products|offers & discounts|book skin consultation/i;
    const hasOldRhythmButtons = existing.buttons.some((button, index) => {
      const label = normalizeComparable(button.label);
      return (
        label === "view products" ||
        label === "offers & discounts" ||
        label === "book skin consultation" ||
        (index === 1 && button.payload === "book_consultation") ||
        (index === 2 && button.payload === "offers_discounts")
      );
    });
    const shouldApplyBusinessDefaults =
      legacyPattern.test(existing.businessName || "") ||
      legacyPattern.test(existing.welcomeMessage || "") ||
      oldRhythmPattern.test(existing.welcomeMessage || "") ||
      hasOldRhythmButtons ||
      existing.buttons.length < 4;

    if (shouldApplyBusinessDefaults) {
      existing.set({
        ...DEFAULT_CONFIG,
        staffWhatsAppNumber:
          existing.staffWhatsAppNumber || DEFAULT_CONFIG.staffWhatsAppNumber
      });
      return existing.save();
    }

    return existing;
  }
  return AppConfig.create(DEFAULT_CONFIG);
}

async function getConfig() {
  return (await AppConfig.findOne()) || ensureDefaultConfig();
}

async function updateConfig(input) {
  const updates = normalizeConfigInput(input);
  const config = await getConfig();
  Object.assign(config, updates);
  return config.save();
}

function interpolateMessage(message, config) {
  const variables = {
    businessName: config.businessName || "",
    staffWhatsAppNumber: config.staffWhatsAppNumber || BRAND.supportWhatsApp,
    supportWhatsApp: config.staffWhatsAppNumber || BRAND.supportWhatsApp,
    supportEmail: BRAND.supportEmail,
    tagline: BRAND.tagline
  };

  return String(message || "").replace(
    /\{\{\s*(businessName|staffWhatsAppNumber|supportWhatsApp|supportEmail|tagline)\s*\}\}/g,
    (_match, key) => variables[key]
  );
}

function findMatchingButton(config, value) {
  const normalized = normalizeComparable(value);
  if (!normalized) return null;

  return (
    config.buttons.find((button, index) => {
      const optionNumber = String(index + 1);
      return (
        normalized === optionNumber ||
        normalizeComparable(button.payload) === normalized ||
        normalizeComparable(button.label) === normalized
      );
    }) || null
  );
}

function formatMenuText(config) {
  return interpolateMessage(config.welcomeMessage, config);
}

module.exports = {
  DEFAULT_CONFIG,
  ensureDefaultConfig,
  getConfig,
  updateConfig,
  interpolateMessage,
  findMatchingButton,
  formatMenuText,
  normalizeComparable
};
