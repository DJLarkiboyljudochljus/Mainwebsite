const router = require("express").Router();
const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Booking = require("../models/Booking");

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
    activetab: res.__("dashboard"),
    equipment,
    page: "admin dashboard",
    activeTab,
    bookings,
    users,
    titleEn: "Admin Dashboard",
  });
});

module.exports = router;
