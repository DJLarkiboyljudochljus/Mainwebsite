const express = require('express');
const ejs = require('ejs');
const fs = require('fs');
const crypto = require('crypto');
const User = require('../../models/user');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const token = crypto.randomBytes(256).toString('hex')

    const newUser = new User({
      name: {
        first: firstName,
        last: lastName,
      },
      email,
      password,
      verificationToken: token
    });

    await newUser.save();

    const verificationURL = `${process.env.ROOT_URL}/api/auth/verifyemail?token=${token}`;

    const verificationtemplate = fs.readFileSync('/emails/verifyemail.ejs', 'utf-8');
    const htmlverificationtemplate = ejs.render(verificationtemplate, { user: newUser, verificationURL });

    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Email",
      text: `Please verify your email using this url: ${verificationURL}`,
      html: htmlverificationtemplate
    });
  } catch (err) {
    console.log("An unexpected error occured", err)
    res.status(400).render('error', { title: "Error", message: "An error occured during registation", target: "/auth/register", error: err, user: null });
  }
});

module.exports = router;
