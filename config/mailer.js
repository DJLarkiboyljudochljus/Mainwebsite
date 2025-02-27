const nodemailer = require("nodemailer");
const path = require("path");
const ejs = require("ejs");
const logger = require("./logger");

// Create a transporter object
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

const renderEmail = async (templateName, data) => {
  const baseUrl = process.env.HOST || "http://localhost:3000";

  const layoutPath = path.join(
    __dirname,
    "..",
    "public",
    "html",
    "emails",
    "layout.ejs",
  );
  const templatePath = path.join(
    __dirname,
    "..",
    "public",
    "html",
    "emails",
    `${templateName}.ejs`,
  );

  // Render the email content first
  const content = await ejs.renderFile(templatePath, data);

  // Render the layout and inject the content inside <%- body %>
  return ejs.renderFile(layoutPath, { body: content, baseUrl });
};

const sendEmail = (to, sub, text, html) => async (req, res, next) => {
  try {
    await transporter.sendMail({
      from: `"DjLarkiboyLjudochLjus" <${process.env.EMAIL}>`,
      to,
      subject: sub,
      text,
      html,
      headers: {
        "List-Unsubscribe": `<https://djlarkiboy.com/unsubscribe?email=${to}>`,
      },
    });
  } catch (error) {
    logger.error("Error sending email:", error);
    next(error);
  }
};

module.exports = Object.assign(transporter, { renderEmail, sendEmail });
