const router = require("express").Router();
const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Booking = require("../models/Booking");
const axios = require("axios");

router.get("/dashboard", async (req, res) => {
  const { activeTab } = req.query;
  const workersWithCorrDepartment = await User.Worker.find({
    department: { $in: req.user.assignedDepartments },
  });

  const users = await User.User.find();

  const equipment = await Equipment.find();

  const bookings = await Booking.find()
    .populate("customer")
    .populate("equipment")
    .exec();

  res.render("dash/admin", {
    title: res.__("admin-dashboard"),
    workers: workersWithCorrDepartment,
    activetab: "dashboard",
    equipment,
    page: "admin dashboard",
    activeTab,
    bookings,
    users,
  });
});

router.get("/logmanager", async (req, res) => {
  const url = "http://localhost:9001";

  const response = await axios.get(url);

  res.send(response.data);
});

module.exports = router;
