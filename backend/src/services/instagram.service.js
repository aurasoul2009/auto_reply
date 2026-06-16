const axios = require("axios");
const { env } = require("../config/env");
const { ApiError } = require("../utils/apiResponse");

function getInstagramApiBaseUrl(config = env) {
  return `https://graph.instagram.com/${config.instagramApiVersion}/${config.instagramBusinessAccountId}`;
}

function buildSendPayload(recipientId, message) {
  return {
    recipient: { id: String(recipientId) },
    message
  };
}

function getClient() {
  if (!env.instagramAccessToken || !env.instagramBusinessAccountId) {
    throw new ApiError(
      503,
      "Instagram Login API credentials are not configured on this server"
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

  try {
    const response = await getClient().post(
      "/messages",
      buildSendPayload(recipientId, message)
    );
    return response.data;
  } catch (error) {
    const metaMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message;
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
  getInstagramApiBaseUrl,
  sendTextMessage,
  sendQuickReplies
};
