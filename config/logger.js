const nodeloggerg = require("nodeloggerg");

const logger = new nodeloggerg({
  startWebServer: true,
});

module.exports = logger;
