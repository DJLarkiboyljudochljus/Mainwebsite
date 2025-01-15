const router = require("express").Router();
const transporter = require("../config/mailer");
const logger = require("../config/logger");

router.get("/about", (req, res) => {
  res.render("about", { title: "About Us" });
});

router.get("/dj-sim", (req, res) => {
  res.render("dj-sim", { h: false, title: "Dj Simulator" });
});

router.get("/contact", (req, res) => {
  res.render("contact", { title: "Contact Us" });
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

module.exports = router;
