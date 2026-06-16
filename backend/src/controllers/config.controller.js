const configService = require("../services/config.service");
const { sendSuccess } = require("../utils/apiResponse");

async function getConfig(_req, res) {
  const config = await configService.getConfig();
  return sendSuccess(res, config);
}

async function updateConfig(req, res) {
  const config = await configService.updateConfig(req.body);
  return sendSuccess(res, config, "Configuration updated");
}

module.exports = { getConfig, updateConfig };
