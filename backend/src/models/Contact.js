const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200
    },
    phone: {
      type: String,
      trim: true
    },
    instagramId: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      enum: ["manual", "excel", "whatsapp", "instagram", "api"],
      default: "manual"
    },
    subscribed: {
      type: Boolean,
      default: true
    },
    optIn: {
      type: Boolean,
      default: false
    },
    tags: {
      type: [String],
      default: []
    },
    lastMessage: {
      type: String,
      default: "",
      maxlength: 2000
    },
    lastInteractionAt: Date
  },
  { timestamps: true }
);

contactSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } }
);
contactSchema.index(
  { instagramId: 1 },
  {
    unique: true,
    partialFilterExpression: { instagramId: { $type: "string" } }
  }
);
contactSchema.index({ subscribed: 1, optIn: 1 });

module.exports = mongoose.model("Contact", contactSchema);
