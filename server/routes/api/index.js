const router = require("express").Router();
const fs = require("fs");
const path = require("path");

router.use("/i18n", require("./i18n.js"))

module.exports = router;
