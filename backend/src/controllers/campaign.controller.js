const Campaign = require("../models/Campaign");
const campaignService = require("../services/campaign.service");
const { sendSuccess } = require("../utils/apiResponse");

async function listCampaigns(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 25)
  );
  const skip = (page - 1) * limit;

  const [campaigns, total] = await Promise.all([
    Campaign.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Campaign.countDocuments()
  ]);

  return sendSuccess(res, {
    campaigns,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

async function sendCampaign(req, res) {
  const campaign = await campaignService.sendCampaign(req.body);
  return sendSuccess(res, campaign, "Campaign completed", 201);
}

async function sendTestCampaign(req, res) {
  const result = await campaignService.sendTestTemplate(req.body);
  return sendSuccess(res, result, "Test template sent");
}

module.exports = { listCampaigns, sendCampaign, sendTestCampaign };
