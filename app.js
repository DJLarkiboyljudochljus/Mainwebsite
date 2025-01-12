const express = require("express");
const layouts = require("express-ejs-layouts");
const path = require("path");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

require("dotenv").config();
const app = express();
const logger = require("./config/logger");
const PORT = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(layouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", path.join(__dirname, "views", "layouts", "layout.ejs"));
app.use(express.static(path.join(__dirname, "public")));
app.use(helmet());
app.use(cookieParser());

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
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      req.user = null;
      res.locals.user = null;
      return next();
    }

    // Set user info in request and response locals
    req.user = user;
    res.locals.user = user;

    next(); // Proceed to the next middleware/route
  } catch (err) {
    // Log the error but don't stop the request flow
    if (err.name === "TokenExpiredError") {
      logger.warn("JWT expired");
    } else {
      logger.error(`Error verifying JWT: ${err.message}`);
    }

    req.user = null;
    res.locals.user = null;

    next(); // Continue to the next middleware/route
  }
});

app.use((req, res, next) => {
  res.locals.h = true; // Default value
  res.locals.title = "";
  next();
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("Error connecting to MongoDB" + err));

app.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});

app.use((req, res, next) => {
  if (!req.user) {
    app.use("/", path.join(__dirname, "routes", "public.js"));
    return next();
  }

  switch (req.user.role) {
    case "admin":
      app.use("/", require(path.join(__dirname, "routes", "admin.js")));
      break;
    case "worker":
      app.use("/", require(path.join(__dirname, "routes", "worker.js")));
      break;
    case "user":
      app.use("/", require(path.join(__dirname, "routes", "user.js")));
      break;
    default:
      app.use("/", require(path.join(__dirname, "routes", "public.js")));
      break;
  }

  next();
});

// Error Handling
app.all("*", (req, res) => {
  res.render("404", { h: false, title: "404" });
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
