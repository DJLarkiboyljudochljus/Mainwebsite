const nodelogger = require("nodeloggerg");

const logger = nodelogger({
  levels: ["info", "warn", "error", "debug", "critical"],
  compressOldLogs: true,
  serverConfig: {
    authEnabled: true,
    auth: {
      user: "admin",
      pass: "admin",
    },
    startWebServer: false,
    enableRealtime: true,
    enableSearch: true,
  },
  enableMetrics: true,
});

module.exports = logger;
