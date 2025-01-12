const router = require("express").Router();
const path = require("path");
const logger = require(path.join(__dirname, "..", "config", "logger.js"));
const User = require(path.join(__dirname, "..", "models", "User.js"));
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const secret = process.env.JWT_SECRET;

router.use("/", require(path.join(__dirname, "index.js")));

router.get("/auth/register", (req, res) => {
  res.render("register");
});

router.get("/auth/login", (req, res) => {
  res.render("login");
});

router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password, adress } = req.body;

    if (!name || !email || !phone || !password || !adress) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const pVer = crypto.randomBytes(3).toString("hex");
    const eVer = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      name,
      email: {
        adress: email,
        ver: eVer,
      },
      phone,
      password,
      contactInfo: {
        phone: {
          number: phone,
          ver: pVer,
        },
        adress,
      },
    });

    await newUser.save();

    const payload = { email: newUser.email };
    const token = jwt.sign(payload, secret, { expiresIn: "24h" });

    res.cookie("token", token, { httpOnly: true });

    const message = "User registered sucessfully";

    res
      .status(201)
      .redirect(`/?message=${encodeURIComponent(message)}&type=info`);
  } catch (err) {
    logger.error("Error registering user:  " + err.message);
    return res.status(400).json({ message: "Invalid input" });
  }
});

module.exports = router;
