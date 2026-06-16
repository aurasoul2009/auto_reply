const Campaign = require("../models/Campaign");
const Contact = require("../models/Contact");
const MessageLog = require("../models/MessageLog");
const Consultation = require("../models/Consultation");
const Product = require("../models/Product");
const ProductEnquiry = require("../models/ProductEnquiry");
const { env } = require("../config/env");
const { BRAND } = require("../config/brand");
const campaignService = require("../services/campaign.service");
const configService = require("../services/config.service");
const { ensureDefaultProducts } = require("../services/product.service");
const {
  importContactsFromBuffer
} = require("../services/contactImport.service");
const {
  credentialsConfigured,
  validateAdminCredentials
} = require("../middleware/admin.middleware");
const { ApiError } = require("../utils/apiResponse");

function setFlash(req, type, message, details) {
  req.session.flash = { type, message, details };
}

function renderPage(res, view, data = {}) {
  return res.render(view, {
    pageTitle: data.pageTitle || "Admin",
    ...data
  });
}

function getLogin(req, res) {
  if (req.session.adminUser) return res.redirect("/admin");
  return renderPage(res, "admin/login", {
    pageTitle: "Admin Login",
    credentialsConfigured: credentialsConfigured()
  });
}

async function postLogin(req, res) {
  const { username = "", password = "" } = req.body;

  if (!credentialsConfigured()) {
    return renderPage(res.status(503), "admin/login", {
      pageTitle: "Admin Login",
      credentialsConfigured: false,
      loginError:
        "Admin login is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD."
    });
  }

  if (!validateAdminCredentials(username, password)) {
    return renderPage(res.status(401), "admin/login", {
      pageTitle: "Admin Login",
      credentialsConfigured: true,
      loginError: "Invalid username or password."
    });
  }

  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
  req.session.adminUser = env.adminUsername;
  return res.redirect("/admin");
}

async function logout(req, res) {
  await new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
  res.clearCookie("rhythm.admin", { path: "/admin" });
  return res.redirect("/admin/login");
}

async function dashboard(_req, res) {
  const [
    totalCustomers,
    totalCampaigns,
    messagesSent,
    consultationRequests,
    productEnquiries,
    offerCampaigns
  ] = await Promise.all([
    Contact.countDocuments(),
    Campaign.countDocuments(),
    MessageLog.countDocuments({ direction: "outgoing", status: "sent" }),
    Consultation.countDocuments(),
    ProductEnquiry.countDocuments(),
    Campaign.countDocuments({
      $or: [
        { title: /offer|discount|festival/i },
        { templateName: /offer|discount|festival/i }
      ]
    })
  ]);

  return renderPage(res, "admin/dashboard", {
    pageTitle: "Dashboard",
    stats: {
      totalCustomers,
      totalCampaigns,
      messagesSent,
      consultationRequests,
      productEnquiries,
      offerCampaigns
    }
  });
}

async function contacts(_req, res) {
  const recentContacts = await Contact.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return renderPage(res, "admin/contacts", {
    pageTitle: "Customers",
    contacts: recentContacts
  });
}

async function uploadContacts(req, res) {
  try {
    if (!req.file) throw new ApiError(400, "Choose an Excel file to upload");
    const result = await importContactsFromBuffer(req.file.buffer);
    setFlash(req, "success", "Customer upload completed.", result);
  } catch (error) {
    setFlash(req, "error", error.message);
  }
  return res.redirect("/admin/customers");
}

async function campaigns(_req, res) {
  const recentCampaigns = await Campaign.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return renderPage(res, "admin/campaigns", {
    pageTitle: "Campaigns",
    campaigns: recentCampaigns
  });
}

async function renderCampaignForm(res, pageTitle) {
  const eligibleCount = await Contact.countDocuments({
    subscribed: true,
    optIn: true,
    phone: { $exists: true, $ne: "" }
  });

  return renderPage(res, "admin/new-campaign", {
    pageTitle,
    eligibleCount,
    recipientLimit: env.campaignMaxRecipients,
    delayMs: env.campaignDelayMs,
    templates: BRAND.bulkTemplates
  });
}

async function bulkMessages(req, res) {
  return renderCampaignForm(res, "Bulk Messages");
}

async function newCampaign(_req, res) {
  return renderCampaignForm(res, "New Campaign");
}

async function sendCampaign(req, res) {
  try {
    const variables = [
      req.body.variable1,
      req.body.variable2,
      req.body.variable3
    ];
    const campaign = await campaignService.sendCampaign({
      title: req.body.title,
      templateName: req.body.templateName,
      languageCode: req.body.languageCode,
      variables
    });
    setFlash(req, "success", "Campaign processing completed.");
    return res.redirect(`/admin/campaigns/${campaign._id}`);
  } catch (error) {
    setFlash(req, "error", error.message);
    return res.redirect("/admin/campaigns/new");
  }
}

async function campaignDetail(req, res) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    throw new ApiError(404, "Campaign not found");
  }
  const campaign = await Campaign.findById(req.params.id).lean();
  if (!campaign) throw new ApiError(404, "Campaign not found");

  return renderPage(res, "admin/campaign-detail", {
    pageTitle: campaign.title,
    campaign
  });
}

async function messages(_req, res) {
  const recentMessages = await MessageLog.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return renderPage(res, "admin/messages", {
    pageTitle: "Message Logs",
    messages: recentMessages
  });
}

async function consultations(_req, res) {
  const recentConsultations = await Consultation.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return renderPage(res, "admin/consultations", {
    pageTitle: "Consultations",
    consultations: recentConsultations
  });
}

async function products(_req, res) {
  await ensureDefaultProducts();
  const products = await Product.find().sort({ isActive: -1, name: 1 }).lean();

  return renderPage(res, "admin/products", {
    pageTitle: "Products",
    products
  });
}

async function templates(_req, res) {
  return renderPage(res, "admin/templates", {
    pageTitle: "Templates",
    templates: BRAND.bulkTemplates
  });
}

async function analytics(_req, res) {
  const [
    totalCustomers,
    subscribedCustomers,
    optedInCustomers,
    consultationsCompleted,
    productEnquiries,
    sentMessages,
    failedMessages
  ] = await Promise.all([
    Contact.countDocuments(),
    Contact.countDocuments({ subscribed: true }),
    Contact.countDocuments({ optIn: true }),
    Consultation.countDocuments({ status: "completed" }),
    ProductEnquiry.countDocuments(),
    MessageLog.countDocuments({ direction: "outgoing", status: "sent" }),
    MessageLog.countDocuments({ direction: "outgoing", status: "failed" })
  ]);

  return renderPage(res, "admin/analytics", {
    pageTitle: "Analytics",
    analytics: {
      totalCustomers,
      subscribedCustomers,
      optedInCustomers,
      consultationsCompleted,
      productEnquiries,
      sentMessages,
      failedMessages
    }
  });
}

async function settings(_req, res) {
  const config = await configService.getConfig();
  return renderPage(res, "admin/settings", {
    pageTitle: "Settings",
    config
  });
}

async function updateSettings(req, res) {
  try {
    const current = await configService.getConfig();
    await configService.updateConfig({
      businessName: req.body.businessName,
      staffWhatsAppNumber: req.body.staffWhatsAppNumber,
      welcomeMessage: req.body.welcomeMessage,
      fallbackMessage: req.body.fallbackMessage,
      stopReplyMessage: req.body.stopReplyMessage,
      buttons: current.buttons.map((button, index) => ({
        label: req.body[`button${index + 1}Label`],
        payload: button.payload,
        replyMessage: req.body[`button${index + 1}Reply`]
      }))
    });
    setFlash(req, "success", "Automation settings updated.");
  } catch (error) {
    setFlash(req, "error", error.message);
  }
  return res.redirect("/admin/settings");
}

module.exports = {
  getLogin,
  postLogin,
  logout,
  dashboard,
  contacts,
  uploadContacts,
  campaigns,
  newCampaign,
  bulkMessages,
  sendCampaign,
  campaignDetail,
  messages,
  consultations,
  products,
  templates,
  analytics,
  settings,
  updateSettings
};
