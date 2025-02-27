const express = require("express");
const logger = require("./config/logger");
const path = require("path");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const flash = require("connect-flash");
const crypto = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config();
const Gallery = require("./models/Gallery");
const cookieParser = require("cookie-parser");
const User = require("./models/User");
const Equipment = require("./models/Equipment");
const Message = require("./models/Message");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = socketIo(server);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(require("express-ejs-layouts"));
app.set("layout", path.join(__dirname, "views", "layouts", "layout.ejs"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "img", "favicon.ico"));
});

app.get("/apple-touch-icon.png", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "img", "favicon.ico"));
});

app.get("/apple-touch-icon-precompressed.png", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "img", "favicon.ico"));
});

app.use((req, res, next) => {
  res.locals.previousUrl = req.cookies.previousUrl || ""; // Ensure it's always available in templates

  res.cookie("previousUrl", req.originalUrl, {
    httpOnly: true, // Prevent access from client-side scripts
    sameSite: "Lax", // Helps with CSRF protection
  });

  next();
});

// Configure session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  }),
);

// Initialize flash middleware
app.use(flash());

// Middleware to make flash messages available to all views and also set some other important locals
app.use((req, res, next) => {
  req.n = req.query.n || req.body.n || "/";
  res.locals = {
    ...res.locals,
    messages: req.flash(),
    h: true,
    activetab: null,
    url: encodeURIComponent(req.originalUrl),
    n: decodeURIComponent(req.n),
    title: "",
    page: "",
  };

  next();
});

// Connect to MongoDB database
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((err) => {
    logger.error("Failed to connect to MongoDB", err);
  });
// End of mongodb connection

// Middleware for setting response headers
app.use((req, res, next) => {
  res.locals.nonce = crypto
    .randomBytes(32)
    .toString("base64")
    .replace("=", "")
    .replace("+", "")
    .replace("/", "");

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; img-src 'self' https://res.cloudinary.com https://*; script-src 'self' 'nonce-${res.locals.nonce}'; style-src 'self' 'nonce-${res.locals.nonce}'; report-uri /contact/csp-security-violation`,
  );

  res.removeHeader("X-Powered-By");
  next();
});

// Middleware for logging requests
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request at ${req.url}`);
  next();
});

// Middleware for parsing JWT tokens
app.use(async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded) {
        req.user = await User.User.findOne({ email: decoded.email }).lean();
      }
    }
  } catch (err) {
    req.user = null;
  } finally {
    res.locals.user = req.user;
    next();
  }
});

app.get("/", async (req, res) => {
  const galleryImages = await Gallery.find();
  res.render("index", { title: "Home", gallery: galleryImages });
});

app.get("/url", (req, res, next) => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl) {
      req.flash("error", "Missing URL parameter");
      return res.status(400).redirect(req.n);
    }

    const nLUrl = decodeURIComponent(rawUrl).trim();

    // Prevent JavaScript-based attacks
    if (nLUrl.toLowerCase().startsWith("javascript:")) {
      req.flash("error", "Invalid URL");
      return res.status(400).redirect(req.n);
    }

    // Allow internal redirects
    if (nLUrl.startsWith("/")) {
      return res.redirect(301, nLUrl);
    }

    // Ensure the URL has a valid protocol
    const nLUrlWP = nLUrl.includes("://") ? nLUrl : `https://${nLUrl}`;

    let parsedUrl;
    try {
      parsedUrl = new URL(nLUrlWP);
    } catch (error) {
      req.flash("error", "Invalid URL format");
      return res.status(400).redirect(req.n);
    }

    // Convert protocol and host to lowercase
    const fixedUrl = `${parsedUrl.protocol.toLowerCase()}//${parsedUrl.hostname.toLowerCase()}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;

    const allowedHosts = ["spotify.com", "youtube.com"];
    const hostname = parsedUrl.hostname.toLowerCase();

    // Ensure exact matches or valid subdomains only
    const isAllowed = allowedHosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );

    // Extra regex check to prevent trickery like "example.com"
    const validHostname = /^[a-z0-9.-]+$/i.test(hostname);

    if (!isAllowed || !validHostname) {
      req.flash(
        "errorWC",
        `External redirect to ${hostname.toLowerCase()} isn't allowed by the site owner`,
      );
      return res.redirect(req.n);
    }

    res.redirect(301, fixedUrl);
  } catch (err) {
    logger.error("Error in URL redirect route", err);
    next(err);
  }
});

app.get("/faq", (req, res) => {
  res.render("faq", { title: "FAQ", activetab: "faq" });
});

app.get("/my-account", (req, res, next) => {
  try {
    const activeTab = req.query.activeTab || "";
    if (req.user) {
      res.redirect(`/user/dashboard?activeTab=${activeTab}`);
    } else {
      res.redirect(
        `auth/login?n=${encodeURIComponent(`user/dashboard?activeTab=${activeTab}`)}`,
      );
    }
  } catch (err) {
    logger.error("Error in My Account route", err);
    next(err);
  }
});

app.get("/about", (req, res) => {
  res.render("about", { title: "About", activetab: "about us" });
});

app.get("/unsubscribe", async (req, res, next) => {
  try {
    const user = await User.User.findOne({ email });

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect(req.n);
    }

    user.unsubscribed = false;
    await user.save();
  } catch (err) {
    next(err);
  }
});

app.get("/privacy-policy", (req, res) => {
  res.render("privacy-policy", {
    title: "Privacy Policy",
    activetab: "privacy policy",
  });
});

app.get("/cookie-notice", (req, res) => {
  res.render("cookie-notice", {
    title: "Cookie Notice",
    activetab: "cookie notice",
  });
});

app.get("/users", async (req, res) => {
  const users = await User.User.find({ Role: { $in: ["worker", "admin"] } });
  res.json(users);
});

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch messages where the user is either the sender or receiver
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender", "name email image") // Populate sender details
      .populate("receiver", "name email image") // Populate receiver details
      .sort({ createdAt: 1 }); // Sort messages by creation time (ascending)

    res.json(messages); // Return messages as a response
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.get("/flash", (req, res) => {
  req.flash("info", "welcome to djlarkiboyljudochljus");
  req.flash("error", "error flash message");
  req.flash("success", "success flash message");
  res.redirect("/");
});

app.get("/browse", async (req, res, next) => {
  try {
    // Default filter object
    let filters = {};

    // Check if a search query is provided
    if (req.query.search) {
      filters.name = { $regex: req.query.search, $options: "i" }; // Case-insensitive search
    }

    // Check for category filter
    if (req.query.category) {
      filters.category = req.query.category;
    }

    // Price range filter (min & max)
    if (req.query.minPrice || req.query.maxPrice) {
      filters.price = {};
      if (req.query.minPrice)
        filters.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice)
        filters.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Fetch filtered equipment
    const equipment = await Equipment.find(filters);

    // Fetch all categories for the sidebar filter
    const categories = await Equipment.distinct("category");

    res.render("browse", {
      equipment,
      categories,
      query: req.query,
      title: "Browse",
      activetab: "browse",
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
});

app.use("/admin", require(path.join(__dirname, "routes", "admin.js")));
app.use("/contact", require(path.join(__dirname, "routes", "contact.js")));
app.use("/auth", require(path.join(__dirname, "routes", "auth.js")));
app.use("/user", require(path.join(__dirname, "routes", "user.js")));
app.use("/equipment", require(path.join(__dirname, "routes", "equip.js")));
app.use("/worker", require(path.join(__dirname, "routes", "worker.js")));

app.get("/500", (req, res, next) => {
  const err = new Error("Example 500 server error");
  err.status = 500;

  next(err);
});

// Error handling for 404
app.use((req, res, next) => {
  const err = new Error("404 Not Found");
  err.status = 404;
  next(err);
});

// General error handler
app.use((err, req, res, next) => {
  if (err.status === 404) {
    return res.status(404).render("404", { title: "404 Not Found", h: false });
  }

  logger.error("Error occurred when trying to access the server:", err.message);

  res
    .status(err.status || err.statusCode || 500)
    .render("err", { h: false, title: "Error", err: err.message });
});

// let onlineUsers = {};

// Start server
server.listen(PORT, () => {
  logger.info(`Server started on http://localhost:${PORT}`);
});
