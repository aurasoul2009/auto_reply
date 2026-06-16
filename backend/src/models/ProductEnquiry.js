const mongoose = require("mongoose");

const productEnquirySchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["whatsapp", "instagram"],
      required: true,
      index: true
    },
    senderId: {
      type: String,
      required: true,
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    incomingText: String,
    productsShown: {
      type: [String],
      default: []
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

productEnquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model("ProductEnquiry", productEnquirySchema);
