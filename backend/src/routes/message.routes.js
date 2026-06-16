const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const messageController = require("../controllers/message.controller");

const router = express.Router();

router.get("/", asyncHandler(messageController.listMessages));

module.exports = router;
