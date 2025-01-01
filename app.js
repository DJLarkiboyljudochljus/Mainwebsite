const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const cookieparser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const auth = require("./middleware/auth");
const ejsLayouts = require("express-ejs-layouts");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Booking = require("./models/Booking");
const Equipment = require("./models/Equipment");
const today = new Date();
const logger = require("./config/logger");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieparser());
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  })
);

app.set("view engine", "ejs");
app.set("views", "views");
app.use(ejsLayouts);
app.set("layout", "layouts/layout");

// Error handeling middleware
app.use((err, req, res, next) => {
  console.log("An error was thrown", err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Server Error" });
  next();
});

app.use(async (req, res, next) => {
  try {
    const token = req.cookies.token || null;

    const verified = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ "email.email": verified.email });

    req.user = user;

    user.balance = 0;

    user.orders = [];

    res.locals.user = user;
    next();
  } catch (err) {
    res.locals.user = undefined;
    next();
  }
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("Error Connecting to MongoDB" + err));

// Routes
app.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});

app.get(
  "/dashboard",
  auth.auth("admin", "worker", "user"),
  async (req, res) => {
    const users = await User.find({});
    const equipments = await Equipment.find({});

    let totalEquipment = 0;

    equipments.forEach((equipment) => {
      totalEquipment += equipment.inInventory;
    });

    let totaltasks = 0;

    req.user.tasks.forEach((task) => {
      totaltasks++;
    });

    const bookings = await Booking.find({ date: { $gt: today } })
      .populate("User")
      .populate("Equipment");

    const upcommingtasks = req.user.tasks.filter(
      (task) => new Date(task.due) > today
    );

    res.render("dashboard", {
      req,
      res,
      title: "Dashboard",
      users,
      totalEquipment,
      bookings,
      totaltasks,
      upcommingtasks,
    });
  }
);

app.get("/about", async (req, res) => {
  const equipment = await Equipment.find({});
  res.render("about", { title: "About", equipment });
});

// Routes import
app.use("/api", require("./routes/api"));
app.use("/auth", require("./routes/auth"));
app.use("/admin", require("./routes/admin"));
app.use("/user", require("./routes/user"));

// Wildcard route
app.all("*", (req, res) => {
  res.render("404", { title: "404 Not Found" });
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
