const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  if (!req.user) {
    return res
      .status(403)
      .redirect(
        `/login?message=${encodeURIComponent(
          "You have to be signed in to visit this page"
        )}&type=error`
      );
  }

  const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

  if (!(decoded.email === req.user.email.address)) {
    return res
      .status(403)
      .redirect(
        `/login?message=${encodeURIComponent(
          "Invalid token. Please log in again"
        )}&type=error`
      );
  }

  next();
};

const checkRoles =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res
        .status(403)
        .redirect(
          `/auth/sign?message=${encodeURIComponent(
            "You have to be signed in to visit this page"
          )}&type=error`
        );
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .redirect(
          `/auth/sign?message=${encodeURIComponent(
            "You don't have the required role to access this page"
          )}&type=error`
        );
    }

    next();
  };

module.exports = Object.assign(auth, { checkRoles });
