const nodelogger = require("nodeloggerg");

const logger = new nodelogger({
  startWebServer: true,
});

module.exports = logger;
