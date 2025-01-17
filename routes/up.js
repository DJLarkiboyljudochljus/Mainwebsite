const router = require("express").Router();
const path = require("path");
const logger = require("../config/logger");
const Equipment = require(path.join(__dirname, "..", "models", "Equipment.js"));
const Sponsor = require(path.join(__dirname, "..", "models", "Sponsor.js"));

router.get("/browse", async (req, res) => {
  const equipment = await Equipment.find({ inStore: { $gt: 5 } });
  res.render("browse", { title: "Browse Equipment", equipment });
});

router.get("/equipment/:id", async (req, res) => {
  const equipment = await Equipment.findById(req.params.id);
  res.render("equipment", { title: equipment.name, equipment });
});

router.get("/:sponsor", async (req, res, next) => {
  try {
    const sponsor = await Sponsor.findOne({ url: req.params.sponsor });

    res.render("sponsor", { title: `Sponsor: ${sponsor.name}`, sponsor });
  } catch (err) {
    logger.info("Error finding sponsor", err);
    next();
  }
});

module.exports = router;
