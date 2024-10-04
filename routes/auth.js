const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const router = express.Router();

// Register
router.get('/register', (req, res) => {
   res.render('register', { user: req.session.user });
});

router.post('/register', async (req, res) => {
   const { username, password } = req.body;
   const hashedPassword = await bcrypt.hash(password, 10);
   const user = new User({ username, password: hashedPassword });
   await user.save();
   req.session.user = user;
   res.redirect('/');
});

// Login
router.get('/login', (req, res) => {
   res.render('login', { user: req.session.user });
});

router.post('/login', async (req, res) => {
   const { username, password } = req.body;
   const user = await User.findOne({ username });
   if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = user;
      res.redirect('/');
   } else {
      res.redirect('/auth/login');
   }
});

// Logout
router.get('/logout', (req, res) => {
   req.session.destroy();
   res.redirect('/');
});

module.exports = router;
