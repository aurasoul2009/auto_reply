const mongoose = require("mongoose");

const messageLogSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["whatsapp", "instagram"],
      required: true,
      index: true
    },
    direction: {
      type: String,
      enum: ["incoming", "outgoing"],
      required: true,
      index: true
    },
    messageId: {
      type: String,
      trim: true
    },
    senderId: String,
    recipientId: String,
    messageType: {
      type: String,
      default: "text"
    },
    incomingText: String,
    outgoingText: String,
    buttonPayload: String,
    status: {
      type: String,
      enum: ["received", "sent", "failed", "skipped"],
      required: true
    },
    rawPayload: mongoose.Schema.Types.Mixed,
    errorMessage: String
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageLogSchema.index(
  { platform: 1, direction: 1, messageId: 1 },
  {
    unique: true,
    partialFilterExpression: { messageId: { $type: "string" } }
  }
);
messageLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("MessageLog", messageLogSchema);
