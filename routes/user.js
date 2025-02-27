const router = require("express").Router();
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const logger = require("../config/logger");
const auth = require("../middleware/auth");

router.get("/profile", auth(), (req, res) => {
  res.render("profile", { title: "Profile", activetab: "profile" });
});

router.post(
  "/update/profile",
  auth(),
  cloudinary.userImageUpload.single("image"),
  async (req, res) => {
    try {
      const { name, email } = req.body;
      const user = await User.User.findById(req.user._id);

      if (req.file) {
        try {
          cloudinary.deleteFile(
            new URL(user.image).pathname
              .split("/")
              .slice(5)
              .join("/")
              .replace(/\.[^/.]+$/, ""),
          );
        } catch (err) {}
        user.image = req.file.path;
      }

      await user.save();

      if (!user) {
        req.flash("error", "User not found");
        res.redirect("/user/profile");
      }
      user.name = name || user.name;
      user.email = email || user.email;
      req.flash("success", "Profile updated successfully");
      res.redirect("/user/profile");
    } catch (err) {
      logger.error("Error in update/profile route", err);
      req.flash("error", "Failed to update profile");
      res.redirect("/user/profile");
    }
  },
);

module.exports = router;
