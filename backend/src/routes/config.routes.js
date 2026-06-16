const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const configController = require("../controllers/config.controller");

const router = express.Router();

router.get("/", asyncHandler(configController.getConfig));
router.put("/", asyncHandler(configController.updateConfig));

module.exports = router;
