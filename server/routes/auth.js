const router = require("express").Router();
const logger = require("../config/logger");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

router.get("/register", (req, res) => {
  res.render("register", {
    activeTab: "register",
    title: res.__("register"),
    showLoginModal: false,
  });
});

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      req.flash("error", res.__("all-fields-required"));
      return res.redirect("/register");
    }

    const existingUser = await User.User.findOne({ email });
    if (existingUser) {
      req.flash("error", res.__("email-already-exists"));
      return res.redirect("/register");
    }

    if (password !== confirmPassword) {
      req.flash("error", res.__("passwords-do-not-match"));
      return res.redirect("/register");
    }

    const newUser = new User.Customer({ name, email, password });
    await newUser.save();

    const userIp = req.ip;

    const token = jwt.sign(
      { email: newUser.email, userIp },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );
    res.cookie("jwt", token, {
      maxAge: 86400000,
      secure: true,
      httpOnly: true,
      sameSite: "Strict",
    });

    res.cookie("sessionExpiry", Date.now() + 86400000);

    req.flash("success", res.__("registration-successful"));
    res.redirect(req.n);
  } catch (err) {
    logger.error("Error in registration route", err);
    next(err);
  }
});

router.post("/register/worker", auth(), async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      req.flash("error", res.__("all-fields-required"));
      return res.redirect(req.url);
    }

    const existingUser = await User.User.findOne({ email });
    if (existingUser) {
      req.flash("error", res.__("email-already-exists"));
      return res.redirect(req.url);
    }

    if (password !== confirmPassword) {
      req.flash("error", res.__("passwords-do-not-match"));
      return res.redirect(req.url);
    }

    const newUser = new User.Worker({ name, email, password });
    await newUser.save();

    req.flash("success", res.__("registration-successful"));
    res.redirect(req.n);
  } catch (err) {
    logger.error("Error in registration route", err);
    next(err);
  }
});

router.post("/register/admin", auth(), async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      req.flash("error", res.__("all-fields-required"));
      return res.redirect(req.url);
    }

    const existingUser = await User.User.findOne({ email });
    if (existingUser) {
      req.flash("error", res.__("email-already-exists"));
      return res.redirect(req.url);
    }

    if (password !== confirmPassword) {
      req.flash("error", res.__("passwords-do-not-match"));
      return res.redirect(req.url);
    }

    const newUser = new User.Admin({ name, email, password });
    await newUser.save();

    req.flash("success", res.__("registration-successful"));
    res.redirect(req.n);
  } catch (err) {
    logger.error("Error in registration route", err);
    next(err);
  }
});

router.get("/login", (req, res) => {
  res.render("login", {
    activeTab: "login",
    title: res.__("login"),
    headInject: '<link rel="prefetch" href="/auth/login/password" />',
    showLoginModal: false,
  });
});

router.get("/login/password", (req, res) => {
  res.render("login-password", {
    activeTab: "login",
    title: res.__("login"),
    showLoginModal: false,
  });
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      req.flash("error", res.__("all-fields-required"));
      return res.redirect("/login");
    }

    const user = await User.User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePasswords(password))) {
      req.flash("error", res.__("invalid-email-or-password"));
      return res.redirect("/login");
    }

    const userIp = req.ip;

    const token = jwt.sign(
      { email: user.email, userIp },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );
    res.cookie("jwt", token, {
      maxAge: 86400000,
      secure: true,
      httpOnly: true,
      sameSite: "Strict",
    });

    res.cookie("sessionExpiry", Date.now() + 86400000);

    req.flash("success", `${res.__("logged-in-as")} ${user.name}`);
    res.redirect(req.n);
  } catch (err) {
    logger.error("Error in login route", err);
    next(err);
  }
});

router.get("/logout", auth(["customer", "worker", "admin"]), (req, res) => {
  res.clearCookie("jwt");
  res.clearCookie("sessionExpiry");
  req.flash("success", res.__("logged-out"));
  res.redirect("/");
});

module.exports = router;
