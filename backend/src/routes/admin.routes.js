const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const adminController = require("../controllers/admin.controller");
const {
  requireAdminAuth,
  requireCsrfToken
} = require("../middleware/admin.middleware");
const { contactUpload } = require("../middleware/upload.middleware");
const { adminLoginLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.get("/login", adminController.getLogin);
router.post(
  "/login",
  adminLoginLimiter,
  requireCsrfToken,
  asyncHandler(adminController.postLogin)
);
router.post(
  "/logout",
  requireAdminAuth,
  requireCsrfToken,
  asyncHandler(adminController.logout)
);

router.use(requireAdminAuth);
router.get("/", asyncHandler(adminController.dashboard));
router.get("/contacts", asyncHandler(adminController.contacts));
router.get("/customers", asyncHandler(adminController.contacts));
router.post(
  "/contacts/upload",
  contactUpload.single("file"),
  requireCsrfToken,
  asyncHandler(adminController.uploadContacts)
);
router.get("/campaigns", asyncHandler(adminController.campaigns));
router.get("/campaigns/new", asyncHandler(adminController.newCampaign));
router.get("/bulk-messages", asyncHandler(adminController.bulkMessages));
router.post(
  "/campaigns/send",
  requireCsrfToken,
  asyncHandler(adminController.sendCampaign)
);
router.get(
  "/campaigns/:id",
  asyncHandler(adminController.campaignDetail)
);
router.get("/messages", asyncHandler(adminController.messages));
router.get("/consultations", asyncHandler(adminController.consultations));
router.get("/products", asyncHandler(adminController.products));
router.get("/templates", asyncHandler(adminController.templates));
router.get("/analytics", asyncHandler(adminController.analytics));
router.get("/settings", asyncHandler(adminController.settings));
router.post(
  "/settings/update",
  requireCsrfToken,
  asyncHandler(adminController.updateSettings)
);

module.exports = router;
