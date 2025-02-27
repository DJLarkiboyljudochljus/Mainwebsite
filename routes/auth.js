const router = require("express").Router();
const logger = require("../config/logger");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

router.get("/register", (req, res) => {
  res.render("register", { activeTab: "register", title: "Register" });
});

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      req.flash("error", "All fields are required");
      return res.redirect("/register");
    }

    const existingUser = await User.User.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already exists");
      return res.redirect("/register");
    }

    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match");
      return res.redirect("/register");
    }

    const newUser = new User.Customer({ name, email, password });
    await newUser.save();

    const token = jwt.sign({ email: newUser.email }, process.env.JWT_SECRET);
    res.cookie("jwt", token, { expiresIn: "1d" });

    req.flash(
      "success",
      "Registration successful, you can now use the website as it is supposed to use",
    );
    res.redirect(req.n);
  } catch (err) {
    logger.error("Error in registration route", err);
    next(err);
  }
});

router.post("/register/worker", async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      req.flash("error", "All fields are required");
      return res.redirect("/register");
    }

    const existingUser = await User.User.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already exists");
      return res.redirect("/register");
    }

    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match");
      return res.redirect("/register");
    }

    const newUser = new User.Worker({ name, email, password });
    await newUser.save();

    const token = jwt.sign({ email: newUser.email }, process.env.JWT_SECRET);
    res.cookie("jwt", token, { expiresIn: "1d" });

    req.flash(
      "success",
      "Registration successful, you can now use the website as it is supposed to use",
    );
    res.redirect(req.n);
  } catch (err) {
    logger.error("Error in registration route", err);
    next(err);
  }
});

router.post("/register/admin", async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      req.flash("error", "All fields are required");
      return res.redirect("/register");
    }

    const existingUser = await User.User.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already exists");
      return res.redirect("/register");
    }

    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match");
      return res.redirect("/register");
    }

    const newUser = new User.Admin({ name, email, password });
    await newUser.save();

    const token = jwt.sign({ email: newUser.email }, process.env.JWT_SECRET);
    res.cookie("jwt", token, { expiresIn: "1d" });

    req.flash(
      "success",
      "Registration successful, you can now use the website as it is supposed to use",
    );
    res.redirect(req.n);
  } catch (err) {
    logger.error("Error in registration route", err);
    next(err);
  }
});

router.get("/login", (req, res) => {
  res.render("login", { activeTab: "login", title: "Login" });
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      req.flash("error", "All fields are required");
      return res.redirect("/login");
    }

    const user = await User.User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePasswords(password))) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET);
    res.cookie("jwt", token, { expiresIn: "1d" });

    req.flash("success", `Logged in as ${user.name}`);
    res.redirect(req.n);
  } catch (err) {
    logger.error("Error in login route", err);
    next(err);
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("jwt");
  req.flash("success", "You have been logged out");
  res.redirect("/");
});

module.exports = router;
