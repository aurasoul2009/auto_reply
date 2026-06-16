const mongoose = require("mongoose");

const buttonSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    payload: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100
    },
    replyMessage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    }
  },
  { _id: false }
);

const appConfigSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    staffWhatsAppNumber: {
      type: String,
      default: "",
      trim: true
    },
    welcomeMessage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1024
    },
    triggerWords: {
      type: [String],
      default: ["hi", "hello", "start"],
      validate: {
        validator: (words) => words.length > 0,
        message: "At least one trigger word is required"
      }
    },
    buttons: {
      type: [buttonSchema],
      validate: {
        validator: (buttons) => buttons.length >= 3 && buttons.length <= 4,
        message: "Three or four menu options are required"
      }
    },
    fallbackMessage: {
      type: String,
      default:
        "Sorry, I did not understand that. Send hi to see the available options.",
      trim: true,
      maxlength: 2000
    },
    stopReplyMessage: {
      type: String,
      default:
        "You have been unsubscribed and will no longer receive campaign messages.",
      trim: true,
      maxlength: 2000
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppConfig", appConfigSchema);
