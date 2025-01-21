const router = require("express").Router();
const path = require("path");
const logger = require(path.join(__dirname, "..", "config", "logger.js"));
const User = require(path.join(__dirname, "..", "models", "User.js"));
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const secret = process.env.JWT_SECRET;
const transporter = require(path.join(__dirname, "..", "config", "mailer.js"));

async function login(email) {
  const user = await User.findOne({ "email.address": email });
  if (!user) {
    return { status: 401, message: "Invalid email" };
  }

  if (!user.email.iVer) {
    return {
      status: 400,
      message: "Please verify your email before signing in",
      redirect: true,
    };
  }

  const payload = { email: user.email.address };
  const token = jwt.sign(payload, secret, { expiresIn: "24h" });
  return { status: 200, token };
}

// Middleware
router.use("/", require(path.join(__dirname, "index.js")));
router.use("/", require(path.join(__dirname, "up.js")));

// Registration Route
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;

    if (!name || !email || !phone || !password || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ "email.address": email });
    if (existingUser) {
      return res
        .status(409)
        .redirect(
          `/?message=${encodeURIComponent(
            "Email already registered. Please log in."
          )}&type=info`
        );
    }

    const pVer = crypto.randomBytes(3).toString("hex");
    const eVer = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      name,
      email: {
        address: email,
        ver: eVer,
      },
      phone,
      password,
      contactInfo: {
        phone: {
          number: phone,
          ver: pVer,
        },
        address,
      },
    });

    await newUser.save();

    const verificationLink = `${req.protocol}://${req.headers.host}/auth/verify/email/?email=${email}&ver=${eVer}`;

    // Plain Text Email
    const emailText = `
Hi ${name},

Thank you for signing up with DjLarkiboyLjudochLjus! We're excited to help you bring your events to life with our premium sound and lighting equipment.

To complete your registration, please verify your email address by clicking the link below:

${verificationLink}

This step ensures your account is secure and ready to use. If you didn't create an account with us, please disregard this email.

Feel free to reach out to us at gronlundisak11@gmail.com if you have any questions.

Warm regards,
The DjLarkiboyLjudochLjus Team
${req.headers.host}`;

    // HTML Email
    const year =
      new Date().getFullYear() === 2025
        ? "2025"
        : `2025 - ${new Date().getFullYear()}`;

    const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background-color: #4caf50;
            color: white;
            text-align: center;
            padding: 20px;
        }
        .content {
            padding: 20px;
            color: #333333;
            line-height: 1.6;
        }
        .button {
            display: block;
            width: 200px;
            margin: 20px auto;
            text-align: center;
            background-color: #4caf50;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
        }
        .footer {
            text-align: center;
            padding: 10px;
            font-size: 12px;
            color: #777777;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to DjLarkiboyLjudochLjus!</h1>
        </div>
        <div class="content">
            <p>Hi ${name},</p>
            <p>Thank you for signing up with DjLarkiboyLjudochLjus! We're excited to help you bring your events to life with our premium sound and lighting equipment.</p>
            <p>To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}" class="button">Verify Email</a>
            <p>If the button doesn’t work, you can copy and paste the following link into your browser:</p>
            <p><a href="${verificationLink}">${verificationLink}</a></p>
            <p>This step ensures your account is secure and ready to use. If you didn't create an account with us, please disregard this email.</p>
            <p>Feel free to reach out to us at <a href="mailto:gronlundisak11@gmail.com">gronlundisak11@gmail.com</a> if you have any questions.</p>
        </div>
        <div class="footer">
            <p>&copy; ${year} DjLarkiboyLjudochLjus</p>
        </div>
    </div>
</body>
</html>
    `;

    // Send Email
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Verify Your Email",
      text: emailText,
      html: emailHTML,
    });

    res.redirect(
      `/?message=${encodeURIComponent(
        "User registered successfully. Please verify your email."
      )}&type=info`
    );
  } catch (err) {
    logger.error("Error registering user: " + err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
