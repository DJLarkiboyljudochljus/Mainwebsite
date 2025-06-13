const router = require("express").Router();
const path = require("path");
const fs = require("fs");

router.get("/:lang", (req, res, next) => {
  const { lang } = req.params;
  const file = path.join(process.cwd(), "locales", `${lang}.json`);
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    next();
  }
});

router.get("/languages", (req, res) => {
  const file = path.join(process.cwd(), "config", "languages.json");
  res.sendFile(file);
});

module.exports = router;
