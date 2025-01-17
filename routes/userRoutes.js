const router = require("express").Router();
const path = require("path");
const upload = require(path.join(__dirname, "..", "config", "cloudinary.js"));
const User = require(path.join(__dirname, "..", "models", "User.js"));
const logger = require("../config/logger");

router.get("/profile", (req, res) => {
  res.render("profile", { title: "Profile" });
});

router.post("/profile", upload.single("image"), async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    if (!name || !email || !phone || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userEmail = req.user.email;

    const user = await User.findOne({ "email.address": userEmail });

    user.update({
      name,
      email: {
        address,
        ver: req.user.email.ver,
      },
      phone,
      image: req.file.path || user.image,
    });

    await user.save();

    res.redirect("/profile");
  } catch (err) {
    logger.error("Error updating user profile", err);
    res
      .status(500)
      .redirect(
        `/profile?message=${encodeURIComponent(
          "Error updating profile"
        )}&type=error`
      );
  }
});

module.exports = router;
