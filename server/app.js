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
const axios = require("axios");
const i18n = require("i18n");
const auth = require("./middleware/auth");
const fs = require("fs");
const cors = require("cors");
const Slide = require("./models/Slide");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// Middleware for logging requests
app.use((req, res, next) => {
  logger.info(
    `Received ${req.method} request at ${req.url} from ${req.headers["x-forwarded-for"] || req.socket.remoteAddress}`,
  );
  next();
});

app.head("/", (req, res) => res.status(200).json({ status: "Healty" }));

app.use(cors());

let languageConfig = {
  supported: [],
  countryNameMapping: {},
};

JSON.parse(
  fs.readFileSync(path.join(__dirname, "config", "languages.json"), "utf8"),
).map((lang) => {
  languageConfig.supported.push(lang);
  languageConfig.countryNameMapping[lang.code] = lang.nativeName;
});

const server = http.createServer(app);
const io = socketIo(server);

const supportedLanguages = languageConfig.supported;

const ipCache = {};
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const DEFAULT_LANGUAGE = "en";

if (
  !supportedLanguages.some(
    (lang) =>
      (typeof lang === "string" ? lang : lang.code) === DEFAULT_LANGUAGE,
  )
) {
  throw new Error(
    `DEFAULT_LANGUAGE "${DEFAULT_LANGUAGE}" is not in supportedLanguages`,
  );
}

const countryNameMapping = languageConfig.countryNameMapping;

const languages = supportedLanguages.map((lang) => {
  return { code: lang.code, name: countryNameMapping[lang], dir: lang.dir };
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(require("express-ejs-layouts"));
app.set("layout", path.join(__dirname, "views", "layouts", "layout.ejs"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

i18n.configure({
  locales: supportedLanguages,
  defaultLocale: DEFAULT_LANGUAGE,
  directory: path.join(__dirname, "locales"),
  queryParameter: "lang",
  cookie: "lang",
  autoReload: true,
  syncFiles: true,
  objectNotation: true,
  logWarnFn: function (msg) {
    logger.warn("Warning from i18n: ", msg);
  },
  logErrorFn: function (msg) {
    logger.error("Error from i18n: ", msg);
  },
});

app.use(i18n.init);

app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "img", "favicon.ico"));
});

app.get("/apple-touch-icon.png", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "img", "favicon.ico"));
});

app.get("/apple-touch-icon-precompressed.png", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "img", "favicon.ico"));
});

app.get("/sw.js", (req, res) => res.sendFile(path.join(__dirname, "sw.js")));

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

app.use(async (req, res, next) => {
  let lang;
  const clientIP =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress.split(",")[0];

  if (req.query.bypassQueryAndCookie === "true") {
    const acceptLang = req.headers["accept-language"]
      ?.split(",")[0]
      ?.split("-")[0];
    if (acceptLang && supportedLanguages.includes(acceptLang)) {
      lang = acceptLang;
    }
  } else {
    const userLang = req.query.lang || req.cookies.lang;

    if (userLang && supportedLanguages.includes(userLang)) {
      lang = userLang;
    } else {
      const acceptLang = req.headers["accept-language"]
        ?.split(",")[0]
        ?.split("-")[0];
      if (acceptLang && supportedLanguages.includes(acceptLang)) {
        lang = acceptLang;
      } else {
        if (
          ipCache[clientIP] &&
          Date.now() - ipCache[clientIP].timeStamp < CACHE_EXPIRATION
        ) {
          lang = ipCache[clientIP].lang;
        } else {
          try {
            const response = await axios.get(
              `https://api.ipstack.com/${clientIP}?access_key=${process.env.IPSTACK_API_KEY}`,
            );

            if (!response.data.languages) {
              throw new Error("Failed to fetch user's language from IPStack");
            }

            let detectedLang = response.data.languages.code;

            lang = supportedLanguages.includes(detectedLang)
              ? detectedLang
              : DEFAULT_LANGUAGE;

            ipCache[clientIP] = { lang, timeStamp: Date.now() };
          } catch (err) {
            logger.error("Failed to fetch user's language", err);
            lang = DEFAULT_LANGUAGE;
          }
        }
      }
    }
  }

  res.cookie("lang", lang, { maxAge: 86400000, sameSite: "Lax" });

  req.setLocale(lang);

  next();
});

// Middleware to make flash messages available to all views and also set some other important locals
app.use((req, res, next) => {
  const copyYear =
    new Date().getFullYear() === 2025
      ? 2025
      : `2025 - ${new Date().getFullYear()}`;

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
    __: res.__,
    lang: supportedLanguages.filter((lang) => {
      return lang.code === req.getLocale();
    }),
    copyright: `&copy; ${copyYear} ${res.__("title")}. ${res.__("copyright")}`,
    headInject: "",
    showLoginModal: false,
    loginError: null,
    languages: languages,
    currentLanguage: req.getLocale(),
    titleEn: "",
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
    .randomBytes(crypto.randomInt(16, 48))
    .toString("base64")
    .replace("=", "")
    .replace("+", "")
    .replace("/", "");

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; img-src 'self' https://res.cloudinary.com https://*; script-src 'self' 'nonce-${res.locals.nonce}'; style-src 'self' 'nonce-${res.locals.nonce}'; report-uri /contact/csp-security-violation; connect-src 'self' https://*.google.com`,
  );

  res.removeHeader("X-Powered-By");
  next();
});

// Middleware for parsing JWT tokens
app.use(async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userIp = req.ip;

      if (decoded && decoded.userIp !== userIp) {
        logger.warn(
          `IP mismatch for token: expected ${decoded.userIp}, got ${userIp}`,
        );
        res.locals.showLoginModal = true;
        res.locals.loginError = res.__("ip-mismatch");
      }

      if (decoded && decoded.userIp === userIp) {
        req.user = await User.User.findOne({ email: decoded.email }).lean();
      }
    } else {
      const hasExpired = req.cookies.sessionExpiry;
      if (hasExpired && hasExpired < Date.now()) {
        res.clearCookie("sessionExpiry");
        res.locals.showLoginModal = true;
        res.locals.loginError = res.__("session-expired");
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
  res.render("index", { title: res.__("home"), gallery: galleryImages });
});

app.get("/sitemap", (req, res) => {
  res.render("more", { title: res.__("site-map"), activeTab: res.__("more") });
});

app.get("/slideshow", async (req, res) => {
  const slides = await Slide.find({ active: true });

  res.render("slideshow", {
    h: false,
    slides,
    headInject: `
      <style nonce="${res.locals.nonce}">
        body: { overflow-y: hidden }
        .flash-messages: { display: none, margin: 0 }
        .slideshow-container { position: relative; max-width: 800px; margin: 2rem auto; }
        .slide { min-height: 350px; padding: 2rem; border-radius: 1rem; box-shadow: 0 2px 8px #0002; }
        .slide-content { text-align: center; }
        .slide-html { margin: 1rem 0; }
        .slide-qr img { width: 120px; height: 120px; margin: 1rem auto; display: block; }
        .slide-link a { color: #007bff; text-decoration: underline; }
        .slide-nav { position: absolute; top: 50%; transform: translateY(-50%); background: #fff8; border: none; font-size: 2rem; padding: 0.5rem 1rem; cursor: pointer; border-radius: 50%; }
        .slide-nav.prev { left: 10px; }
        .slide-nav.next { right: 10px; }
        .slide-indicators { text-align: center; margin-top: 1rem; }
        .indicator { display: inline-block; width: 12px; height: 12px; margin: 0 4px; background: #bbb; border-radius: 50%; cursor: pointer; }
        .indicator.active { background: #333; }
      </style>
    `,
  });
});

app.get("/url", (req, res, next) => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl) {
      req.flash("error", res.__("missing-url-parameter"));
      return res.status(400).redirect(req.n);
    }

    const nLUrl = decodeURIComponent(rawUrl).trim();

    // Prevent JavaScript-based attacks
    if (nLUrl.toLowerCase().startsWith("javascript:")) {
      req.flash("error", res.__("invalid-url"));
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
      req.flash("error", res.__("invalid-url-format"));
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
        `${res.__("external-redirects-to")} ${hostname.toLowerCase()} ${res.__("not-allowed")}`,
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
  res.render("faq", { title: res.__("faq"), activetab: res.__("faq") });
});

if (process.env.NODE_ENV === "development") {
  app.get("/flash", (req, res) => {
    req.flash("success", "Flash message test");
    req.flash("error", "Flash message test error");
    req.flash("errorWC", "Flash message test warning");
    req.flash("info", "Flash message test info");
    req.flash("infoWC", "Flash message test warning info");
    res.redirect("/");
  });
}

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
  res.render("about", { title: res.__("about"), activetab: res.__("about") });
});

app.get("/unsubscribe", async (req, res, next) => {
  try {
    const user = await User.User.findOne({ email });

    if (!user) {
      req.flash("error", res.__("user-not-found"));
      return res.redirect(req.n);
    }

    user.unsubscribed = true;
    await user.save();
  } catch (err) {
    next(err);
  }
});

app.get("/privacy-policy", (req, res) => {
  res.render("privacy-policy", {
    title: res.__("privacy"),
    activetab: res.__("privacy"),
  });
});

app.get("/cookie-notice", (req, res) => {
  res.render("cookie-notice", {
    title: res.__("cookie"),
    activetab: res.__("cookie"),
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
    res.status(500).json({ error: res.__("error-fetching-messages") });
  }
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
      title: res.__("browse"),
      activetab: res.__("browse"),
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
});

app.use("/admin", auth(["admin"]));
app.use("/worker", auth(["worker"]));
app.use("/user", auth());

app.use("/admin", require(path.join(__dirname, "routes", "admin.js")));
app.use("/contact", require(path.join(__dirname, "routes", "contact.js")));
app.use("/auth", require(path.join(__dirname, "routes", "auth.js")));
app.use("/user", require(path.join(__dirname, "routes", "user.js")));
app.use("/equipment", require(path.join(__dirname, "routes", "equip.js")));
app.use("/worker", require(path.join(__dirname, "routes", "worker.js")));
app.use("/status", require(path.join(__dirname, "routes", "uptimerobot.js")));
app.use(
  "/loggerServer",
  createProxyMiddleware({
    target: "http://localhost:9001",
    changeOrigin: true,
    pathRewrite: { "^/loggerServer": "" },
  }),
);
app.use("/api", require(path.join(__dirname, "routes", "api", "index.js")));

// Error handling for 404
app.use((req, res, next) => {
  const err = new Error("404 Not Found");
  err.status = 404;

  logger.error("404 Not Found:", req.originalUrl);
  next(err);
});

// General error handler
app.use((err, req, res, next) => {
  if (err.status === 404) {
    return res.status(404).render("404", { title: "404 Not Found", h: false });
  }

  logger.error("Error occurred when trying to access the server:", err);

  res
    .status(err.status || err.statusCode || 500)
    .render("err", { h: false, title: res.__("error"), err: err.message });
});

io.on("connection", (socket) => {
  const socketId = socket.id;
  logger.info(`Socket connected: ${socketId}`);

  socket.on("join", (userId) => {
    const user = User.User.findByIdAndUpdate(userId, {
      socketId: socketId,
    });
    if (user) {
      logger.info(`User ${userId} joined with socket ID: ${socketId}`);
    }
  });

  socket.on("message", async (message) => {
    const { senderId, receiverId, content } = message;

    const sender = await User.User.findById(senderId);
    const receiver = await User.User.findById(receiverId);

    if (!sender || !receiver) {
      logger.error("Sender or receiver not found");
      return;
    }

    const newMessage = new Message({
      sender,
      receiver,
      content,
    });

    await newMessage.save();

    if (receiver.socketId) {
      io.to(receiver.socketId).emit("message", newMessage);
    }
  });

  socket.on("disconnect", async () => {
    await User.User.findOneAndUpdate(
      { socketId: socketId },
      { socketId: null },
    );
    logger.info(`Socket disconnected: ${socketId}`);
  });
});

module.exports = server;
