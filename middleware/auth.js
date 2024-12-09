const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to extract and verify the token, and attach the user to the request
function takeToken() {
  return async (req, res, next) => {
    try {
      const token = res.cookies.token || null;

      if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
      }

      const verified = jwt.verify(token, process.env.JWT_SECRET);

      console.log(verified);

      const user = await User.findOne({ email: verified.email });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      req.user = user; // Attach user to the request object
      next();
    } catch (err) {
      next(err)  
    }
  };
};

// Middleware to check roles
function auth(roles = []) {
  return async (req, res, next) => {
    try {
      // Ensure token is processed first
      takeToken(req, res, () => {});

      if (req.user.role === 'dev') {
        return next();
      }
      
      // Check if user has the required role
      if (roles.length > 0 && !roles.includes(req.user.role)) {
        console.log(req.user);
        return res.status(403).json({ message: "Access denied. You do not have the required role." });
      }

      next();
    } catch (err) {
      console.error(err, req.user)
      return res.status(403).json({ message: "Access denied. You do not have the required role." });
    }
  };
}

module.exports = { takeToken, auth };
