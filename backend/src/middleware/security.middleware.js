const crypto = require("node:crypto");
const { env } = require("../config/env");

function requireAdminApiKey(req, res, next) {
  if (!env.adminApiKey && !env.isProduction) return next();

  const providedKey = req.get("x-api-key") || "";
  const expected = Buffer.from(env.adminApiKey);
  const provided = Buffer.from(providedKey);

  if (
    expected.length === provided.length &&
    expected.length > 0 &&
    crypto.timingSafeEqual(expected, provided)
  ) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: "A valid x-api-key header is required"
  });
}

function verifyMetaSignature(req, res, next) {
  if (!env.metaAppSecret && !env.isProduction) return next();

  const signature = req.get("x-hub-signature-256") || "";
  const expected = `sha256=${crypto
    .createHmac("sha256", env.metaAppSecret)
    .update(req.rawBody || Buffer.alloc(0))
    .digest("hex")}`;

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: "Invalid Meta webhook signature"
  });
}

module.exports = { requireAdminApiKey, verifyMetaSignature };
