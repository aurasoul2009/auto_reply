const logger = require("../utils/logger");

function adminErrorHandler(error, req, res, _next) {
  logger.error("Admin request failed", {
    statusCode: error.statusCode || 500,
    method: req.method,
    path: req.originalUrl,
    message: error.message,
    stack: error.stack
  });

  if (req.method !== "GET" && req.session) {
    req.session.flash = {
      type: "error",
      message: error.message || "The admin action failed."
    };
    return res.redirect(req.get("referer") || "/admin");
  }

  return res.status(error.statusCode || 500).render("admin/error", {
    pageTitle: "Admin Error",
    statusCode: error.statusCode || 500,
    errorMessage: error.message || "The admin page could not be loaded."
  });
}

module.exports = { adminErrorHandler };
