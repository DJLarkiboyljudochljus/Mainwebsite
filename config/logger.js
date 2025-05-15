const nodelogger = require("nodeloggerg");

const logger = nodelogger({
  startWebServer: false,
  authEnabled: false,
  enableSearch: true,
  levels: ["info", "warn", "error", "debug", "critical"],
  compressOldLogs_: true,
});

module.exports = logger;
