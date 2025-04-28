const router = require("express").Router();
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const logger = require("../config/logger");

router.get("/profile", (req, res) => {
  res.render("profile", { title: res.__("profile"), activetab: "profile" });
});

router.post(
  "/update/profile",
  cloudinary.userImageUpload.single("image"),
  async (req, res) => {
    try {
      const { name, email } = req.body;
      const user = await User.User.findById(req.user._id);

      if (!user) {
        req.flash("error", res.__("user-not-found"));
        return res.redirect("/user/profile");
      }

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

      user.name = name || user.name;
      user.email = email || user.email;

      await user.save();

      req.flash("success", res.__("profile-updated"));
      res.redirect("/user/profile");
    } catch (err) {
      logger.error("Error in update/profile route", err);
      req.flash("error", res.__("profile-update-failed"));
      res.redirect("/user/profile");
    }
  },
);

module.exports = router;
