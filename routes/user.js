const router = require("express").Router();
const path = require("path");

router.use("/", require(path.join(__dirname, "up.js")));

module.exports = router;
