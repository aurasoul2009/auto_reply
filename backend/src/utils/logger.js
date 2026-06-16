const { env } = require("../config/env");

const priorities = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

function write(level, message, metadata = {}) {
  const configuredPriority = priorities[env.logLevel] ?? priorities.info;
  if (priorities[level] > configuredPriority) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata
  };

  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

module.exports = {
  error: (message, metadata) => write("error", message, metadata),
  warn: (message, metadata) => write("warn", message, metadata),
  info: (message, metadata) => write("info", message, metadata),
  debug: (message, metadata) => write("debug", message, metadata),
  stream: {
    write: (message) => write("info", message.trim(), { source: "http" })
  }
};
