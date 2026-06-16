const Consultation = require("../models/Consultation");
const ProductEnquiry = require("../models/ProductEnquiry");
const { BRAND } = require("../config/brand");
const { normalizePhone } = require("../utils/phone");

const CONSULTATION_STEPS = Object.freeze([
  {
    key: "name",
    prompt: "Lovely. Please share your full name."
  },
  {
    key: "age",
    prompt: "Please share your age."
  },
  {
    key: "skinType",
    prompt: "What is your skin type? Example: oily, dry, combination, sensitive, or normal."
  },
  {
    key: "skinConcern",
    prompt: "What is your main skin concern? Example: acne, pigmentation, dullness, dryness, or anti-ageing."
  },
  {
    key: "phoneNumber",
    prompt: "Please share your phone number so our skincare advisor can contact you."
  }
]);

function getStepIndex(stepKey) {
  return Math.max(
    0,
    CONSULTATION_STEPS.findIndex((step) => step.key === stepKey)
  );
}

function phoneFromMessage(message) {
  return message.platform === "whatsapp" ? normalizePhone(message.senderId) : "";
}

async function getActiveConsultation(message) {
  return Consultation.findOne({
    platform: message.platform,
    senderId: message.senderId,
    status: "collecting"
  }).sort({ updatedAt: -1 });
}

async function startConsultation(message) {
  const consultation = await Consultation.findOneAndUpdate(
    {
      platform: message.platform,
      senderId: message.senderId,
      status: "collecting"
    },
    {
      $set: {
        phone: phoneFromMessage(message),
        currentStep: "name"
      },
      $setOnInsert: {
        platform: message.platform,
        senderId: message.senderId,
        status: "collecting"
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    consultation,
    reply: [
      `\u{1F497} Let's begin your ${BRAND.name} skin care guidance request.`,
      "",
      CONSULTATION_STEPS[0].prompt
    ].join("\n")
  };
}

async function handleConsultationAnswer(message, consultation) {
  const text = String(message.text || message.payload || "").trim();
  const stepIndex = getStepIndex(consultation.currentStep);
  const step = CONSULTATION_STEPS[stepIndex];
  const update = {
    $push: {
      rawMessages: {
        step: step.key,
        value: text,
        receivedAt: new Date()
      }
    }
  };

  update.$set = { [step.key]: text };
  if (step.key === "age") {
    const parsedAge = Number.parseInt(text, 10);
    if (!Number.isFinite(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
      await Consultation.updateOne(
        { _id: consultation._id },
        {
          $push: update.$push,
          $set: { currentStep: "age" }
        }
      );
      return "Please share your age as a number, for example 28.";
    }
    update.$set.age = parsedAge;
  }
  if (step.key === "phoneNumber") {
    update.$set.phoneNumber = normalizePhone(text) || text;
  }

  const nextStep = CONSULTATION_STEPS[stepIndex + 1];
  if (nextStep) {
    update.$set.currentStep = nextStep.key;
    await Consultation.updateOne({ _id: consultation._id }, update);
    return nextStep.prompt;
  }

  update.$set.currentStep = "completed";
  update.$set.status = "completed";
  await Consultation.updateOne({ _id: consultation._id }, update);

  return [
    "Thank you \u{1F497} Your skin care guidance request is saved.",
    `Our ${BRAND.shortName} advisor will review your details and contact you shortly.`
  ].join("\n");
}

async function cancelActiveConsultation(message) {
  await Consultation.updateMany(
    {
      platform: message.platform,
      senderId: message.senderId,
      status: "collecting"
    },
    { $set: { status: "cancelled", currentStep: "completed" } }
  );
}

async function recordProductEnquiry(message, products) {
  await ProductEnquiry.create({
    platform: message.platform,
    senderId: message.senderId,
    phone: phoneFromMessage(message),
    incomingText: message.text || message.payload || "",
    productsShown: products.map((product) => product.name)
  });
}

module.exports = {
  CONSULTATION_STEPS,
  getActiveConsultation,
  startConsultation,
  handleConsultationAnswer,
  cancelActiveConsultation,
  recordProductEnquiry
};
