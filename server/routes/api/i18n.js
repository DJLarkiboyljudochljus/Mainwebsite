const router = require("express").Router();
const path = require("path");
const fs = require("fs");

router.get("/:lang", (req, res) => {
  const { lang } = req.params;
  const file = path.join(process.cwd(), "locales", `${lang}.json`);
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.status(404).json({ error: "Language not supported0" });
  }
});

router.get("/languages", (req, res) => {
  const file = path.join(process.cwd(), "config", "languages.json");
  res.sendFile(file);
});

module.exports = router;
