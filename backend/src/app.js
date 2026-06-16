const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("node:path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { env } = require("./config/env");
const { BRAND } = require("./config/brand");
const logger = require("./utils/logger");
const { apiLimiter } = require("./middleware/rateLimit.middleware");
const {
  notFoundHandler,
  errorHandler
} = require("./middleware/error.middleware");
const { requireAdminApiKey } = require("./middleware/security.middleware");
const {
  exposeAdminLocals
} = require("./middleware/admin.middleware");
const {
  adminErrorHandler
} = require("./middleware/adminError.middleware");

const webhookRoutes = require("./routes/webhook.routes");
const configRoutes = require("./routes/config.routes");
const contactRoutes = require("./routes/contact.routes");
const campaignRoutes = require("./routes/campaign.routes");
const messageRoutes = require("./routes/message.routes");
const testRoutes = require("./routes/test.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        env.allowedOrigins.length === 0 ||
        env.allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    }
  })
);
app.use(
  express.json({
    limit: "1mb",
    verify(req, _res, buffer) {
      req.rawBody = buffer;
    }
  })
);
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(morgan(env.isProduction ? "combined" : "dev", { stream: logger.stream }));
app.use(
  "/admin/assets",
  express.static(path.join(__dirname, "public"), {
    maxAge: env.isProduction ? "1d" : 0,
    etag: true
  })
);

app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Rhythm Skin Care Automation API is live"
  });
});

app.head("/", (_req, res) => {
  res.sendStatus(200);
});

app.get("/health", (_req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  res.status(mongoConnected ? 200 : 503).json({
    status: mongoConnected ? "ok" : "degraded",
    service: BRAND.serviceName,
    mongoConnected,
    timestamp: new Date().toISOString()
  });
});

app.use("/webhook/meta", webhookRoutes);
const adminSessionOptions = {
  name: "rhythm.admin",
  secret: env.sessionSecret || "rhythm-development-session-secret",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: env.isProduction,
    maxAge: 8 * 60 * 60 * 1000,
    path: "/admin"
  }
};
if (env.isProduction && env.mongoUri) {
  adminSessionOptions.store = MongoStore.create({
    mongoUrl: env.mongoUri,
    collectionName: "admin_sessions",
    ttl: 8 * 60 * 60,
    autoRemove: "native"
  });
}
app.use(
  "/admin",
  session(adminSessionOptions),
  exposeAdminLocals,
  adminRoutes,
  adminErrorHandler
);
app.use("/api", apiLimiter, requireAdminApiKey);
app.use("/api/config", configRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/test", testRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
