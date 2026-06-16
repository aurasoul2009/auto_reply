const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const contactController = require("../controllers/contact.controller");
const { contactUpload } = require("../middleware/upload.middleware");

const router = express.Router();

router.get("/", asyncHandler(contactController.listContacts));
router.post("/add", asyncHandler(contactController.addContact));
router.post(
  "/upload",
  contactUpload.single("file"),
  asyncHandler(contactController.uploadContacts)
);
router.patch(
  "/:id/unsubscribe",
  asyncHandler(contactController.unsubscribeContact)
);

module.exports = router;
