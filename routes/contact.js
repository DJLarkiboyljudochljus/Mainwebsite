const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const transporter = require("../config/mailer");
const logger = require("../config/logger");
const User = require("../models/User");

const isValidUserAgent = (userAgent) => {
  const regex =
    /Mozilla\/5\.0 \(.*\) AppleWebKit\/537\.36 \(KHTML, like Gecko\) (Chrome\/[0-9]+|Firefox\/[0-9]+|Safari\/[0-9]+|Edge\/[0-9]+|OPR\/[0-9]+|Vivaldi\/[0-9]+|Ecosia\/[0-9]+)/;
  return regex.test(userAgent);
};

async function isUnsubscribed(email) {
  const user = await User.User.findOne({ email });
  return user?.unsubscribed || false;
}

// Rate limiting for the endpoint
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Allow only 5 requests per window
  message: "Too many requests, please try again later.",
});

router.post("/error", (req, res) => {
  try {
    const { err } = req.body;

    transporter.sendMail({
      from: process.env.EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: "Error Report",
      text: `A User reported an error: ${err}`,
    });

    req.flash("success", "message sent successfully");
    res.redirect("/");
  } catch (err) {
    logger.error("Error in error route", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/csp-security-violation", limiter, (req, res) => {
  const report = req.body["csp-report"];

  if (!report) {
    logger.warn("Missing CSP report");
    return res.status(400).send("Missing CSP report.");
  }

  if (!isValidUserAgent(req.headers["user-agent"])) {
    logger.warn("The user-agent is missing");
    return res.status(403).send("Forbidden: Invalid User-Agent");
  }

  // Send an email
  transporter.sendMail(
    {
      from: process.env.EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: "CSP Violation Report",
      text: `CSP violation report: ${JSON.stringify(report)}`,
    },
    (error, info) => {
      if (error) {
        logger.error("Error sending CSP violation email:", error);
      } else {
        logger.info("CSP violation email sent:", info.response);
      }
    },
  );

  // Log the violation
  logger.warn("CSP violation report:", report);

  res.status(204).send(); // Respond with no content.
});

router.get("/", (req, res) => {
  res.render("contact", { title: "Contact", activetab: "contact" });
});

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    req.flash("error", "All fields are required");
    return res.redirect("/contact");
  }

  const emailHTML = await transporter.renderEmail("contactEmail", {
    name,
    email,
    message,
  });

  // Send email
  transporter.sendEmail(
    process.env.ADMIN_EMAIL,
    "Contact email from user",
    `Email from user: ${name}, with email: ${email} and message: ${message}`,
    emailHTML,
  );

  if (await isUnsubscribed(email)) {
    req.flash("error", "You have been unsubscribed from receiving emails");
    return res.redirect(req.n);
  }

  const responseEmailHTML = await transporter.renderEmail("contactResponse", {
    name,
    email,
  });

  setTimeout(async () => {
    transporter.sendEmail(
      email,
      "Response to contact email",
      "Thanks for your email /DjLarkiboy",
      responseEmailHTML,
    );
  }, 1000 * 15);
});

module.exports = router;
