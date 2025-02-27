const router = require("express").Router();
const User = require("../models/User");
const auth = require("../middleware/auth");
const Equipment = require("../models/Equipment");
const Booking = require("../models/Booking");

router.get("/dashboard", auth(["admin"]), async (req, res) => {
  const { activeTab } = req.query;
  const workersWithCorrDepartment = await User.Worker.find({
    department: { $in: req.user.assignedDepartments },
  });

  const equipment = await Equipment.find();

  const bookings = await Booking.find()
    .populate("customer")
    .populate("equipment")
    .exec();

  res.render("dash/admin", {
    title: "Dashboard",
    workers: workersWithCorrDepartment,
    activetab: "dashboard",
    equipment,
    page: "admin dashboard",
    activeTab,
    bookings,
  });
});

module.exports = router;
