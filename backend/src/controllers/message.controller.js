const MessageLog = require("../models/MessageLog");
const { sendSuccess } = require("../utils/apiResponse");

async function listMessages(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 25)
  );
  const skip = (page - 1) * limit;
  const filter = {};

  if (req.query.platform) filter.platform = req.query.platform;
  if (req.query.direction) filter.direction = req.query.direction;
  if (req.query.status) filter.status = req.query.status;

  const [messages, total] = await Promise.all([
    MessageLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    MessageLog.countDocuments(filter)
  ]);

  return sendSuccess(res, {
    messages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

module.exports = { listMessages };
