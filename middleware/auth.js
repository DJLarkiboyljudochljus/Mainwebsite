const auth =
  (roles = ["admin", "worker", "customer"]) =>
  (req, res, next) => {
    if (!req.user) {
      req.flash("error", res.__("401"));
      res.status(401).redirect(`/auth/login?n=${req.url}`);
      return;
    }

    const rolesToLowercase = roles.map((r) => r.toLowerCase());

    if (!rolesToLowercase.includes("admin")) rolesToLowercase.push("admin");

    if (rolesToLowercase.includes(req.user.Role.toLowerCase())) {
      next();
    } else {
      req.flash(
        "error",
        "You don't have the right permissions to access this page",
      );
      res.status(403).redirect("/"); // Or redirect to a sensible default
      return;
    }
  };

module.exports = auth;
