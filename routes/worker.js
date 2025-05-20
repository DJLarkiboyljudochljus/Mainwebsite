const router = require("express").Router();
const Equipment = require("../models/Equipment");

router.get("/dashboard", async (req, res) => {
  const equipment = await Equipment.find();
  res.render("dash/worker", {
    title: res.__("dashboard"),
    activetab: "dashboard",
    equipment,
    page: "worker dashboard",
    titleEn: "Dashboard",
  });
});

module.exports = router;
