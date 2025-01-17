const router = require("express").Router();
const path = require("path");

router.use("/", require(path.join(__dirname, "index.js")));

module.exports = router;
