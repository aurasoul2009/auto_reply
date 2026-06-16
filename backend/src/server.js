const http = require("node:http");
const app = require("./app");
const { env, assertRequiredEnvironment } = require("./config/env");
const {
  connectDatabase,
  ensureDatabaseIndexes,
  disconnectDatabase
} = require("./config/db");
const { ensureDefaultConfig } = require("./services/config.service");
const { ensureDefaultProducts } = require("./services/product.service");
const logger = require("./utils/logger");

let server;
let shuttingDown = false;

async function start() {
  assertRequiredEnvironment();
  await connectDatabase();
  await ensureDatabaseIndexes();
  await ensureDefaultConfig();
  await ensureDefaultProducts();

  server = http.createServer(app);
  server.listen(env.port, () => {
    logger.info("Server started", {
      port: env.port,
      environment: env.nodeEnv
    });
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Graceful shutdown started", { signal });

  const forceExit = setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection", {
    message: error.message,
    stack: error.stack
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});

start().catch((error) => {
  logger.error("Server failed to start", {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});
