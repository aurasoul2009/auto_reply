const express = require("express");
const webhookController = require("../controllers/webhook.controller");
const { webhookLimiter } = require("../middleware/rateLimit.middleware");
const { verifyMetaSignature } = require("../middleware/security.middleware");

const router = express.Router();

router.get("/", webhookLimiter, webhookController.verifyWebhook);
router.post(
  "/",
  webhookLimiter,
  verifyMetaSignature,
  webhookController.receiveWebhook
);

module.exports = router;
