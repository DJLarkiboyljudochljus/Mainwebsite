const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const Event = require('../models/Booking');
const Equipment = require('../models/Equipment');

router.get('/users', auth.auth(["admin"]), async (req, res) => {
  const users = await User.find({});
  res.render('users', { title: "Users", users });
});

router.get('/events', auth.auth(["admin"]), async (req, res) => {
  const events = await Event.find({});

  res.render('events', { title: "Events", events });
});

router.get('/equipment', auth.auth(["admin"]), async (req, res) => {
  const equipment = await Equipment.find({});

  res.render('equipment', { title: "Equipment", equipment });
});

router.get('/settings', auth.auth(["admin"]), (req, res) => {
  res.render('settings', { title: "Settings" });
});

module.exports = router;