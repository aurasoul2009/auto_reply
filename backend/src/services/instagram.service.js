const axios = require("axios");
const { env } = require("../config/env");
const { ApiError } = require("../utils/apiResponse");
const logger = require("../utils/logger");

function getInstagramApiBaseUrl(config = env) {
  return `https://graph.instagram.com/${config.instagramApiVersion}/${config.instagramBusinessAccountId}`;
}

function buildSendPayload(recipientId, message) {
  return {
    recipient: { id: String(recipientId) },
    message
  };
}

function getMissingInstagramConfig(config = env) {
  const missing = [];
  if (!config.instagramAccessToken) {
    missing.push("INSTAGRAM_ACCESS_TOKEN or META_ACCESS_TOKEN");
  }
  if (!config.instagramBusinessAccountId) {
    missing.push("INSTAGRAM_BUSINESS_ACCOUNT_ID or IG_PAGE_ID");
  }
  if (!config.instagramApiVersion) {
    missing.push("INSTAGRAM_API_VERSION or META_API_VERSION");
  }
  return missing;
}

function getClient() {
  const missingConfig = getMissingInstagramConfig();
  if (missingConfig.length) {
    logger.error("Instagram Login API configuration missing", {
      missing: missingConfig
    });
    throw new ApiError(
      503,
      `Instagram Login API credentials are not configured on this server. Missing: ${missingConfig.join(", ")}`
    );
  }

  return axios.create({
    baseURL: getInstagramApiBaseUrl(),
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${env.instagramAccessToken}`,
      "Content-Type": "application/json"
    }
  });
}

async function send(recipientId, message) {
  if (!recipientId) {
    throw new ApiError(400, "An Instagram recipient ID is required");
  }

  const requestPayload = buildSendPayload(recipientId, message);
  const requestUrl = `${getInstagramApiBaseUrl()}/messages`;
  logger.info("Instagram Send API request", {
    url: requestUrl,
    recipientId: String(recipientId),
    messageType: message.quick_replies ? "quick_replies" : "text",
    quickReplyCount: message.quick_replies?.length || 0
  });

  try {
    const response = await getClient().post("/messages", requestPayload);
    logger.info("Instagram Send API response", {
      recipientId: String(recipientId),
      statusCode: response.status,
      messageId: response.data?.message_id || response.data?.messages?.[0]?.id
    });
    return response.data;
  } catch (error) {
    const metaError = error.response?.data?.error || {};
    const metaMessage =
      metaError.message ||
      error.response?.data?.message ||
      error.message;
    logger.error("Instagram Send API error", {
      recipientId: String(recipientId),
      statusCode: error.response?.status || 502,
      errorMessage: metaMessage,
      errorType: metaError.type,
      errorCode: metaError.code,
      fbtrace_id: metaError.fbtrace_id
    });
    throw new ApiError(
      error.response?.status || 502,
      `Instagram API error: ${metaMessage}`,
      error.response?.data
    );
  }
}

async function sendTextMessage(recipientId, text) {
  return send(recipientId, {
    text: String(text).slice(0, 1000)
  });
}

async function sendQuickReplies(recipientId, text, replies) {
  if (!Array.isArray(replies) || replies.length === 0 || replies.length > 13) {
    throw new ApiError(
      400,
      "Instagram requires between one and thirteen quick replies"
    );
  }

  return send(recipientId, {
    text: String(text).slice(0, 1000),
    quick_replies: replies.map((reply) => ({
      content_type: "text",
      title: String(reply.label).slice(0, 20),
      payload: String(reply.payload).slice(0, 1000)
    }))
  });
}

module.exports = {
  buildSendPayload,
  getMissingInstagramConfig,
  getInstagramApiBaseUrl,
  sendTextMessage,
  sendQuickReplies
};
