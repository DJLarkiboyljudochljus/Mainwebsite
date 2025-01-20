const router = require("express").Router();
const transporter = require("../config/mailer");
const logger = require("../config/logger");
const path = require("path");
const auth = require("../utils/auth");
const User = require("../models/User");
const Activity = require("../models/Activity");

router.get("/about", (req, res) => {
  res.render("about", { title: "About Us" });
});

router.get("/dj-sim", (req, res) => {
  res.render("dj-sim", { h: false, title: "Dj Simulator" });
});

router.get("/contact", (req, res) => {
  res.render("contact", { title: "Contact Us" });
});

router.post("/contact", (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailHTML = `
    <h1>New Message from ${name}</h1>
    <p>Email: ${email}</p>
    <p>Phone:</p>
    <p>${phone}</p>
    <p>Message:</p>
    <p>${message}</p>
    `;

    transporter.sendMail({
      from: process.env.EMAIL,
      to: process.env.EMAIL,
      subject: "New Message from Contact Form",
      html: emailHTML,
    });

    res.redirect(
      `/?message=${encodeURIComponent("Message sent successfully")}&type=info`
    );
  } catch (error) {
    logger.error("Error sending email", error);
    res
      .status(500)
      .redirect(
        `/?message=${encodeURIComponent("Error with sending email")}&type=error`
      );
  }
});

router.post("/contact/error", (req, res) => {
  try {
    const { error } = req.body;

    const emailHTML = `
    <h1>Error Reported by User</h1>
    <p>An error occurred:</p>
    <p>${error}</p>
  `;

    transporter.sendMail({
      from: process.env.EMAIL,
      to: process.env.EMAIL,
      subject: "Error Reported by User",
      html: emailHTML,
    });

    res
      .status(200)
      .redirect(
        `/?message=${encodeURIComponent("Message sent successfully")}&type=info`
      );
  } catch (error) {
    logger.error("Error sending message", error);
    res
      .status(500)
      .redirect(
        `/?message=${encodeURIComponent("Error with sending email")}&type=error`
      );
  }
});

router.get("/dashboard", auth, async (req, res) => {
  const stats = {};

  stats.totalUsers = await User.find();

  const activities = await Activity.find();

  res.render("dashboard", { title: "Dashboard", stats, activities });
});

router.use("/user", require(path.join(__dirname, "userRoutes.js")));

router.get("/auth/logout", (req, res) => {
  res.clearCookie("token");
  res
    .status(201)
    .redirect(
      `/?message=${encodeURIComponent(
        "User logged out successfully"
      )}&type=info`
    );
});

module.exports = router;
