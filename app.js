const express = require("express");
const layouts = require("express-ejs-layouts");
const path = require("path");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const Activity = require("./models/Activity");
const { stringify } = require("flatted");
const bcrypt = require("bcrypt");

require("dotenv").config();
const app = express();
const logger = require("./config/logger");
const PORT = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET;
const User = require(path.join(__dirname, "models", "User.js"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(layouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", path.join(__dirname, "views", "layouts", "layout.ejs"));
app.use(express.static(path.join(__dirname, "public")));
app.use(helmet());
app.use(cookieParser());

app.use((req, res, next) => {
  logger.info(req.method, req.url);
  next();
});

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  res.setHeader(
    "Content-Security-Policy",
    `script-src 'self' 'nonce-${res.locals.nonce}'`
  );
  next();
});

app.use(async (req, res, next) => {
  try {
    const token = req.cookies.token;

    // If no token, continue to the next middleware/route
    if (!token) {
      req.user = null;
      res.locals.user = null;
      return next();
    }

    // Verify the token
    const decoded = jwt.verify(token, secret);

    // Fetch user from the database
    const user = await User.findOne({ "email.address": decoded.email });
    if (!user) {
      req.user = null;
      res.locals.user = null;
      return next();
    }

    // Set user info in request and response locals
    req.user = user;
    res.locals.user = user;
  } catch (err) {
    // Log the error but don't stop the request flow
    if (err.name === "TokenExpiredError") {
      logger.warn("JWT expired");
    } else {
      logger.error(`Error verifying JWT: ${err.message}`);
    }

    req.user = null;
    res.locals.user = null;
  } finally {
    next(); // Continue to the next middleware/route
  }
});

app.use((req, res, next) => {
  res.locals.h = true; // Default value
  res.locals.title = "";
  next();
});

app.use((req, res, next) => {
  try {
    const message = req.query.message
      ? decodeURIComponent(req.query.message)
      : null;

    res.locals.message = message;
    res.locals.type = req.query.type || null;
    res.locals.url = req.url;
  } catch (err) {
    // Log the error but don't stop the request flow
    logger.error(`Error decoding query parameters: ${err.message}`);
  }

  next();
});

app.use(async (req, res, next) => {
  try {
    const body = JSON.parse(JSON.stringify(req.body)); // Deep copy to prevent mutation of req.body.

    // Exclude sensitive fields if needed
    delete body.password;

    const newActivity = new Activity({
      url: req.url,
      type: req.method,
      body: stringify(body),
    });

    await newActivity.save();
    next();
  } catch (error) {
    console.error("Error in middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Middleware for testing purposes
app.use((req, res, next) => {
  next();
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("Error connecting to MongoDB:  " + err));

app.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});

app.use("/", require("./routes/index"));
/*app.use("/user", require("./routes/user"));
app.use("/worker", require("./routes/worker"));
app.use("/admin", require("./routes/admin"));
*/

// Error Handling
app.use((req, res) => {
  res
    .status(404)
    .redirect(
      `/?message=${encodeURIComponent(`Page not found: ${req.url}`)}&type=error`
    );
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res
    .status(500)
    .render("error", { error: err.message, h: false, title: "Error" });
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
