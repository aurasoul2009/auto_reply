const mongoose = require("mongoose");

const campaignErrorSchema = new mongoose.Schema(
  {
    recipient: String,
    message: String
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    templateName: {
      type: String,
      required: true,
      trim: true
    },
    languageCode: {
      type: String,
      required: true,
      trim: true,
      default: "en_US"
    },
    templateVariables: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "completed_with_errors", "failed"],
      default: "pending",
      index: true
    },
    totalRecipients: {
      type: Number,
      default: 0
    },
    sentCount: {
      type: Number,
      default: 0
    },
    failedCount: {
      type: Number,
      default: 0
    },
    skippedCount: {
      type: Number,
      default: 0
    },
    startedAt: Date,
    completedAt: Date,
    errors: {
      type: [campaignErrorSchema],
      default: []
    }
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true
  }
);

module.exports = mongoose.model("Campaign", campaignSchema);
