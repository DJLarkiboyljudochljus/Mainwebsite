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
    const { name, email, bio } = req.body;

    const user = await User.findOne({ "email.address": email });

    if (!user) {
      throw new Error("User not found");
    }

    const oldImage = user.image;

    user.name = name || user.name;
    user.email.address = email || user.email.address;
    user.bio = bio || user.bio;
    if (req.file && req.file.path) {
      user.image = req.file.path || user.image;
    }

    await user.save();

    if (oldImage) {
      upload.deleteImage(oldImage);
    }

    res.redirect(
      `/user/profile?message=${encodeURIComponent(
        "User profile updated successfully"
      )}&type=info`
    );
  } catch (err) {
    logger.error("Error updating user profile", err);
    res
      .status(500)
      .redirect(
        `/user/profile?message=${encodeURIComponent(
          "Error updating profile"
        )}&type=error`
      );
  }
});

module.exports = router;
