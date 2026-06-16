// Central editable business content for branding, theme, and default replies.
const BRAND = Object.freeze({
  name: "Rhythm Skin Care",
  shortName: "Rhythm",
  serviceName: "Rhythm Skin Care Automation",
  appTitle: "Rhythm Skin Care Admin",
  tagline: "Glow Naturally. Care Deeply.",
  description:
    "Premium skincare products, offers, support, and skin care guidance automation.",
  supportWhatsApp: "+91XXXXXXXXXX",
  supportEmail: "support@rhythmskincare.example",
  logoText: "R",
  adminEyebrow: "Glow Naturally. Care Deeply.",
  theme: {
    primary: "#F8DCCF",
    secondary: "#FFF8F4",
    accent: "#D9A299",
    text: "#4A3F35"
  },
  automation: {
    welcomeMessage:
      "Hi \u{1F497} Welcome to Rhythm Skin Care!\n\nThank you for reaching out.\n\nHow can we help you today?\n\n1. Products\n2. Offers\n3. Skin Care Guidance\n4. Talk to Support",
    triggerWords: ["hi", "hello", "start"],
    fallbackMessage:
      "Please reply with 1 for Products, 2 for Offers, 3 for Skin Care Guidance, or 4 to Talk to Support.",
    stopReplyMessage:
      "You have been unsubscribed from Rhythm Skin Care campaign messages.",
    menuOptions: [
      {
        label: "Products",
        payload: "view_products",
        replyMessage:
          "Explore Rhythm Skin Care essentials: Face Wash, Moisturizer, Sunscreen, Face Serum, Night Cream, and Lip Balm."
      },
      {
        label: "Offers",
        payload: "offers_discounts",
        replyMessage:
          "Our offers change often. Ask us about current skincare bundles, festival offers, and limited-time discounts."
      },
      {
        label: "Skin Care Guidance",
        payload: "book_consultation",
        replyMessage:
          "Let's understand your skin better. Please share your full name to begin."
      },
      {
        label: "Talk to Support",
        payload: "talk_to_support",
        replyMessage:
          "Our support team will help you shortly.\nWhatsApp: {{staffWhatsAppNumber}}\nEmail: {{supportEmail}}"
      }
    ]
  },
  products: [
    {
      name: "Face Wash",
      description: "Gentle daily cleanser for fresh, balanced skin."
    },
    {
      name: "Moisturizer",
      description: "Soft, nourishing hydration for everyday glow."
    },
    {
      name: "Sunscreen",
      description: "Lightweight broad-spectrum daily protection."
    },
    {
      name: "Face Serum",
      description: "Targeted care for radiance, texture, and skin concerns."
    },
    {
      name: "Night Cream",
      description: "Overnight care to support skin repair and comfort."
    },
    {
      name: "Lip Balm",
      description: "Softening balm for smooth, hydrated lips."
    }
  ],
  bulkTemplates: [
    {
      label: "Product Launch",
      templateName: "product_launch",
      description: "Announce a new skincare product or collection."
    },
    {
      label: "Festival Offer",
      templateName: "festival_offer",
      description: "Promote seasonal skincare offers."
    },
    {
      label: "Skin Consultation Reminder",
      templateName: "skin_consultation_reminder",
      description: "Remind customers about skin care guidance availability."
    },
    {
      label: "Follow-up Message",
      templateName: "follow_up_message",
      description: "Follow up after a purchase, enquiry, or consultation."
    },
    {
      label: "Discount Campaign",
      templateName: "discount_campaign",
      description: "Send approved discount campaigns to opted-in customers."
    }
  ]
});

module.exports = { BRAND };
