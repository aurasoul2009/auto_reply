const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const testController = require("../controllers/test.controller");
const { sensitiveLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.use(sensitiveLimiter);
router.get("/config", asyncHandler(testController.configStatus));
router.post(
  "/whatsapp-text",
  asyncHandler(testController.sendWhatsAppText)
);
router.post(
  "/whatsapp-template",
  asyncHandler(testController.sendWhatsAppTemplate)
);
router.post(
  "/whatsapp-buttons",
  asyncHandler(testController.sendWhatsAppButtons)
);
router.post(
  "/instagram-text",
  asyncHandler(testController.sendInstagramText)
);
router.post(
  "/instagram-quick-replies",
  asyncHandler(testController.sendInstagramQuickReplies)
);

module.exports = router;
