const router = require("express").Router();
const path = require("path");
const logger = require(path.join(__dirname, "..", "config", "logger.js"));
const User = require(path.join(__dirname, "..", "models", "User.js"));
const Equipment = require(path.join(__dirname, "..", "models", "Equipment.js"));
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { nextTick } = require("process");
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

router.get("/auth/sign", (req, res) => {
  res.render("sign", { title: "Login/Register" });
});

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
            <p>&copy; ${year} DjLarkiboyLjudochLjus, ${req.headers.host}</p>
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

// Login Route
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ "email.address": email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email" });
    }

    const isMatch = await user.comparePasswords(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const result = await login(email);
    if (result.redirect) {
      return res.redirect(
        `/?message=${encodeURIComponent(result.message)}&type=info`
      );
    }

    res.cookie("token", result.token, { httpOnly: true });
    res.redirect(
      `/?message=${encodeURIComponent(
        "User logged in successfully."
      )}&type=info`
    );
  } catch (err) {
    logger.error("Error logging in user: " + err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout Route
router.get("/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect(
    `/?message=${encodeURIComponent("User logged out successfully.")}&type=info`
  );
});

router.get("/auth/verify/email", async (req, res) => {
  try {
    const { email, ver } = req.query;

    if (!email || !ver) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const user = await User.findOne({ "email.address": email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.email.ver !== ver) {
      return res.status(400).json({ message: "Invalid verification link" });
    }

    user.email.ver = "";
    await user.save();

    res.redirect(
      `/auth/sign?message=${encodeURIComponent(
        "Email verified successfully. You can now log in."
      )}&type=success`
    );
  } catch (err) {
    logger.error("Error verifying email: " + err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/auth/verify/phone", async (req, res) => {
  try {
    const { number, ver } = req.query;

    if (!number || !ver) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const user = await User.findOne({ "contactInfo.phone.number": number });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.contactInfo.phone.ver !== ver) {
      return res.status(400).json({ message: "Invalid verification link" });
    }

    user.contactInfo.phone.ver = "";
    await user.save();

    res.redirect(
      `/auth/sign?message=${encodeURIComponent(
        "Phone number verified successfully. You can now log in."
      )}&type=success`
    );
  } catch (err) {
    logger.error("Error verifying phone number: " + err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/auth/forgot-password", (req, res) => {
  res.render("forgot-password", { title: "Forgot Password" });
});

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .redirect(
          `/auth/forgot-pasword?message=${encodeURIComponent(
            "All fields are required"
          )}&type=error`
        );
    }

    const user = await User.findOne({ "email.address": email });
    if (!user) {
      return res
        .status(404)
        .redirect(
          `/auth/forgot-password?message=${encodeURIComponent(
            "User not found"
          )}&type=error`
        );
    }

    const resetToken = crypto.randomBytes(20).toString("hex");

    user.passwordResetToken = resetToken;

    await user.save();

    const resetLink = `${req.protocol}://${req.headers.host}/auth/reset-password?token=${resetToken}`;

    const emailText = `You are receiving this email because you (or someone else) has requested a password reset for your DjLarkiboyLjudochLjus account.\n\nPlease click on the following link to reset your password:\n\n${resetLink}\n\nIf you did not request a password reset, please ignore this email and your password will remain unchanged.\n`;

    const emailHTML = `<!DOCTYPE html>
    <html>
    <head>
    <title>Reset Password</title>
    <style>
    body {
     font-family: Arial, sans-serif;
     background-color: #f2f2f2;
     margin: 0;
     padding: 20px;
  }
     
  h1 {
     text-align: center;
     margin-bottom: 20px;
  }
     
  p {
     font-size: 18px;
     line-height: 1.6;
  }
     
  a {
     color: #4caf50;
     text-decoration: none;
     font-weight: bold;
  }
     
  footer {
  text-align: center;
  padding: 20px;
  font-size: 12px;
  color: #777777;
  }
  </style>
  </head>
  <body>
  <div style="max-width: 600px; margin: 0 auto;">
  <h1>Reset Password</h1>
  <p>You are receiving this email because you (or someone else) has requested a password reset for your DjLarkiboyLjudochLjus account.</p>
  <p>Please click on the following link to reset your password:</p>
  <a href="${resetLink}">Reset Password</a>
  <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
  <footer>&copy; ${new Date().getFullYear()} DjLarkiboyLjudochLjus, ${
      req.headers.host
    }</footer>
  </div>
  </body>
  </html>`;

    // Send Email
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Reset Password",
      text: emailText,
      html: emailHTML,
    });

    res.redirect(
      `/auth/forgot-password?message=${encodeURIComponent(
        "Password reset link has been sent to your email address."
      )}&type=info`
    );
  } catch (err) {
    logger.error("Error reset password: " + err.message);
    res
      .status(500)
      .redirect(
        `/auth/forgot-password?message=${encodeURIComponent(
          "Server error"
        )}&type=error`
      );
  }
});

router.get("/auth/reset-password", async (req, res) => {
  const { token } = req.query;
  res.render("reset-password", { title: "Reset Password", token });
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const user = await User.findOne({ passwordResetToken: req.body.token });
    if (!user) {
      return res
        .status(404)
        .redirect(
          `/auth/reset-password?message=${encodeURIComponent(
            "Invalid or expired reset token"
          )}&type=error`
        );
    }
    if (!(req.body.password === req.body.confirmPassword)) {
      return res
        .status(400)
        .redirect(
          `/auth/reset-password?message=${encodeURIComponent(
            "Passwords do not match"
          )}&type=error`
        );
    }

    user.password = req.body.password;

    await user.save();

    res.redirect(
      `/auth/sign?message=${encodeURIComponent(
        "Password reset successfully. You can now log in."
      )}&type=info`
    );
  } catch (err) {
    logger.error("Error finding user by reset token: " + err.message);
    return res
      .status(500)
      .redirect(
        `/auth/reset-password?message=${encodeURIComponent(
          "Server error"
        )}&type=error`
      );
  }
});

router.get("/dj-sim", (req, res) => {
  res.render("dj-sim", { title: "Dj Sim", h: false });
});

router.get("/browse", async (req, res, next) => {
  try {
    const equipment = await Equipment.find();

    res.render("browse", { title: "Browse", equipment });
  } catch (err) {
    logger.error("Error fetching equipment: " + err.message);
    next(err);
  }
});

module.exports = router;
