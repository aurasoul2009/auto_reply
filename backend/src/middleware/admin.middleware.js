const crypto = require("node:crypto");
const { env } = require("../config/env");
const { BRAND } = require("../config/brand");

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest();
}

function safeEqual(left, right) {
  return crypto.timingSafeEqual(hashValue(left), hashValue(right));
}

function credentialsConfigured() {
  return Boolean(env.adminUsername && env.adminPassword);
}

function validateAdminCredentials(username, password) {
  if (!credentialsConfigured()) return false;
  return (
    safeEqual(username, env.adminUsername) &&
    safeEqual(password, env.adminPassword)
  );
}

function ensureCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  return req.session.csrfToken;
}

function exposeAdminLocals(req, res, next) {
  res.locals.currentPath = req.path;
  res.locals.brand = BRAND;
  res.locals.adminUser = req.session.adminUser || null;
  res.locals.csrfToken = ensureCsrfToken(req);
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.formatDate = (value) =>
    value
      ? new Intl.DateTimeFormat("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Kolkata"
        }).format(new Date(value))
      : "Not available";
  res.locals.truncate = (value, length = 80) => {
    const text = String(value || "");
    return text.length > length ? `${text.slice(0, length)}...` : text;
  };
  next();
}

function requireAdminAuth(req, res, next) {
  if (req.session.adminUser) return next();
  return res.redirect("/admin/login");
}

function requireCsrfToken(req, res, next) {
  const provided = req.body?._csrf || req.get("x-csrf-token") || "";
  const expected = req.session.csrfToken || "";

  if (provided && expected && safeEqual(provided, expected)) {
    return next();
  }

  const errorMessage =
    "Your session form token is invalid or expired. Refresh the page and try again.";

  if (!req.session.adminUser) {
    return res.status(403).render("admin/login", {
      pageTitle: "Admin Login",
      credentialsConfigured: credentialsConfigured(),
      loginError: errorMessage
    });
  }

  return res.status(403).render("admin/error", {
    pageTitle: "Request Rejected",
    statusCode: 403,
    errorMessage
  });
}

module.exports = {
  credentialsConfigured,
  validateAdminCredentials,
  exposeAdminLocals,
  requireAdminAuth,
  requireCsrfToken
};
