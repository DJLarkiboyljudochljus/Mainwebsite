const nodelogger = require("nodeloggerg");

const logger = nodelogger({
  startWebServer: false,
  authEnabled: true,
  enableSearch: true,
  levels: ["info", "warn", "error", "debug", "critical"],
  compressOldLogs: true,
  username: process.env.LOGGER_USERNAME,
  password: process.env.LOGGER_PASSWORD,
});

module.exports = logger;
