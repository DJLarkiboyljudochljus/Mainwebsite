const auth =
  (roles = ["admin", "worker", "customer"]) =>
  (req, res, next) => {
    if (!req.user) {
      req.flash("error", "You have to login to view this resource");
      res.status(401).redirect(`/auth/login?n=${req.url}`);
      return;
    }
    const rolesToLowercase = roles.map((r) => r.toLowerCase());

    if (
      rolesToLowercase.includes(req.user.Role.toLowerCase()) ||
      req.user.Role === "Admin"
    ) {
      next();
    } else {
      req.flash(
        "error",
        "You don't have the right permissions to access this page",
      );
      res.status(403).redirect(req.n);
      return;
    }
  };

module.exports = auth;
