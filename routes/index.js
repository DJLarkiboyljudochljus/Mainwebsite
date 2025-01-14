const router = require("express").Router();

router.get("/about", (req, res) => {
  res.render("about", { title: "About Us" });
});

router.get("/dj-sim", (req, res) => {
  res.render("dj-sim", { h: false, title: "Dj Simulator" });
});

module.exports = router;
