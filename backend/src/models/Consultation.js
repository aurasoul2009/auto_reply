const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema(
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
    name: {
      type: String,
      trim: true,
      maxlength: 200
    },
    age: {
      type: Number,
      min: 1,
      max: 120
    },
    skinType: {
      type: String,
      trim: true,
      maxlength: 100
    },
    skinConcern: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["collecting", "completed", "cancelled"],
      default: "collecting",
      index: true
    },
    currentStep: {
      type: String,
      enum: ["name", "age", "skinType", "skinConcern", "phoneNumber", "completed"],
      default: "name"
    },
    rawMessages: {
      type: [
        {
          step: String,
          value: String,
          receivedAt: Date
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

consultationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Consultation", consultationSchema);
