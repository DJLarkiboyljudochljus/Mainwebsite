const express = require('express');
const crypto = require('crypto');
const User = require('../../models/User');
const transporter = require('../../config/mailer');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const eVer = crypto.randomBytes(32).toString('hex');
    const pVer = crypto.randomBytes(3).toString('hex');

    const newUser = new User({
      name,
      email: {
        email,
        verificationToken: eVer,
      },
      phone: {
        phone,
        verificationToken: pVer,
        isVerified: true,
      },
      password,
    });

    await newUser.save();

    const eVerificationURI = `${process.env.ROOT}/api/auth/verify/email?${eVer}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verfy your email",
      text: `Please verify your email using this link: ${eVerificationURI}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    background-color: #f4f4f9;
                    margin: 0;
                    padding: 20px;
                    text-align: center;
                }
                .container {
                    background-color: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    padding: 20px;
                    max-width: 500px;
                    margin: auto;
                }
                .header {
                    font-size: 24px;
                    color: #333;
                    margin-bottom: 20px;
                }
                .message {
                    font-size: 16px;
                    color: #555;
                    margin-bottom: 20px;
                }
                .button {
                    display: inline-block;
                    padding: 10px 20px;
                    background-color: #007BFF;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 4px;
                    font-size: 16px;
                }
                .button:hover {
                    background-color: #0056b3;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">Verify Your Email</div>
                <div class="message">
                    Thank you for signing up! Please verify your email address by clicking the button below:
                </div>
                <a href="${eVerificationURI}" class="button">Verify Email</a>
                <div class="message" style="margin-top: 20px;">
                    If you did not sign up, please ignore this email.
                </div>
            </div>
        </body>
        </html>
      `
    });

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error occured during registration" });
  };
});

router.get('/verify/email', async (req, res) => {
  const token = req.query.token;

  const user = await User.findOne({ token });
  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  };

  user.email.isVerified = true;

  await user.save();

  res.status(200).json({ message: "Verified your account sucessfully" });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ 'email.email': email });

    if (!user) return res.status(400).json({ message: "Invalid Email" });

    const isMatch = await user.comparePasswords(password);

    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    if (!user.email.isVerified) {
      return res.status(400).json({ message: "Please verify your email address before continuing." });
    };

    if (!user.phone.isVerified) {
      return res.status(400).json({ message: "Please verify your phone number before continuing." });
    };
    
    
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'Production',
      maxage: 3600000,
    });

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An unexpected error occured during login" });
  }
});

router.get('/logout', async (req, res) => {
  try {
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'strict' });

    res.redirect('/');
  } catch (err) {
    console.error("Error logout", err);
    res.status(500).json({ message: "Error with logout" });
  };
});

module.exports = router;
