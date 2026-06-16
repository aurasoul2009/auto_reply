const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toBoundedInteger(value, fallback, minimum, maximum) {
  const parsed = toPositiveInteger(value, fallback);
  return Math.min(maximum, Math.max(minimum, parsed));
}

function normalizeApiVersion(value, fallback) {
  const version = (value || fallback).trim();
  return version.startsWith("v") ? version : `v${version}`;
}

const nodeEnv = process.env.NODE_ENV || "development";

const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: toPositiveInteger(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI || "",
  metaVerifyToken: process.env.META_VERIFY_TOKEN || "",
  metaAppSecret: process.env.META_APP_SECRET || "",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
  whatsappApiVersion: normalizeApiVersion(
    process.env.WHATSAPP_API_VERSION,
    "v25.0"
  ),
  instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN || "",
  instagramBusinessAccountId:
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "",
  instagramApiVersion: normalizeApiVersion(
    process.env.INSTAGRAM_API_VERSION,
    "v25.0"
  ),
  appBaseUrl: process.env.APP_BASE_URL || "",
  adminApiKey: process.env.ADMIN_API_KEY || "",
  adminUsername: process.env.ADMIN_USERNAME || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  sessionSecret: process.env.SESSION_SECRET || "",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  campaignDelayMs: toBoundedInteger(
    process.env.CAMPAIGN_DELAY_MS,
    750,
    500,
    1000
  ),
  campaignMaxRecipients: toPositiveInteger(
    process.env.CAMPAIGN_MAX_RECIPIENTS,
    500
  ),
  logLevel: process.env.LOG_LEVEL || "info"
});

function assertRequiredEnvironment() {
  const missing = [];

  if (!env.mongoUri) missing.push("MONGO_URI");
  if (!env.metaVerifyToken) missing.push("META_VERIFY_TOKEN");
  if (env.isProduction && !env.adminApiKey) missing.push("ADMIN_API_KEY");
  if (env.isProduction && !env.metaAppSecret) missing.push("META_APP_SECRET");
  if (env.isProduction && !env.adminUsername) missing.push("ADMIN_USERNAME");
  if (env.isProduction && !env.adminPassword) missing.push("ADMIN_PASSWORD");
  if (env.isProduction && !env.sessionSecret) missing.push("SESSION_SECRET");
  if (
    env.whatsappPhoneNumberId &&
    !/^\d+$/.test(env.whatsappPhoneNumberId)
  ) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID must be the actual numeric phone number ID from Meta"
    );
  }

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (
    env.isProduction &&
    (env.adminPassword === "change-this-password" ||
      env.sessionSecret === "change-this-long-random-secret")
  ) {
    throw new Error(
      "Replace the default ADMIN_PASSWORD and SESSION_SECRET before production"
    );
  }
}

module.exports = { env, assertRequiredEnvironment };
