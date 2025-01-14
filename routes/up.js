const router = require("express").Router();
const path = require("path");
const Equipment = require(path.join(__dirname, "..", "models", "Equipment.js"));

router.get("/browse", async (req, res) => {
  const equipment = await Equipment.find({ inStore: { $gt: 5 } });
  res.render("browse", { title: "Browse Equipment", equipment });
});

router.get("/equipment/:id", async (req, res) => {
  const equipment = await Equipment.findById(req.params.id);
  res.render("equipment", { title: equipment.name, equipment });
});

module.exports = router;
