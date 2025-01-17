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

    const userEmail = req.user.email;

    const user = await User.findOne({ "email.address": userEmail });

    user.update({
      name || user.name,
      email: {
        address: email || user.email.address,
      },
      userDetails: {
        phone || user.userDetails.phone,
        address || user.userDetails.address,
      },
      image: req.file.path || user.image,
    });

    await user.save();

    res.redirect(
      `/profile?message=${encodeURIComponent(
        "User profile updated successfully"
      )}&type=info`
    );
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
