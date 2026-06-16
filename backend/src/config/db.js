const mongoose = require("mongoose");
const { env } = require("./env");
const logger = require("../utils/logger");
const AppConfig = require("../models/AppConfig");
const Contact = require("../models/Contact");
const MessageLog = require("../models/MessageLog");
const Campaign = require("../models/Campaign");
const Consultation = require("../models/Consultation");
const Product = require("../models/Product");
const ProductEnquiry = require("../models/ProductEnquiry");

async function connectDatabase() {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.mongoUri, {
    autoIndex: !env.isProduction,
    serverSelectionTimeoutMS: 10000
  });

  logger.info("MongoDB connected", {
    host: mongoose.connection.host,
    database: mongoose.connection.name
  });
}

async function ensureDatabaseIndexes() {
  await Promise.all([
    AppConfig.createIndexes(),
    Contact.createIndexes(),
    MessageLog.createIndexes(),
    Campaign.createIndexes(),
    Consultation.createIndexes(),
    Product.createIndexes(),
    ProductEnquiry.createIndexes()
  ]);
  logger.info("MongoDB indexes verified");
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  }
}

module.exports = {
  connectDatabase,
  ensureDatabaseIndexes,
  disconnectDatabase
};
