const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const campaignController = require("../controllers/campaign.controller");
const { sensitiveLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.get("/", asyncHandler(campaignController.listCampaigns));
router.post(
  "/send",
  sensitiveLimiter,
  asyncHandler(campaignController.sendCampaign)
);
router.post(
  "/send-test",
  sensitiveLimiter,
  asyncHandler(campaignController.sendTestCampaign)
);

module.exports = router;
