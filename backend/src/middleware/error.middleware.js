const multer = require("multer");
const { ApiError } = require("../utils/apiResponse");
const logger = require("../utils/logger");

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let details = error.details;

  if (error instanceof multer.MulterError) {
    statusCode = 400;
    message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file exceeds the 5 MB limit"
        : error.message;
  } else if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(error.errors).map((item) => item.message);
  } else if (error.code === 11000) {
    statusCode = 409;
    message = "A record with the same unique value already exists";
    details = error.keyValue;
  }

  logger.error(message, {
    statusCode,
    method: req.method,
    path: req.originalUrl,
    stack: error.stack
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {})
  });
}

module.exports = { notFoundHandler, errorHandler };
