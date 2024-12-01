const jwt = require('jsonwebtoken');

const removetoken = (req, res, next) => {
  try {
    const token = req.cookies.token | null;

    if (!token) return res.status(401).json({ message: "Access denied. No token provided" });
  };

  const verified = jwt.verify(token, process.env.JWT_SECRET);

  const user = User.findOne({ email: verified.email });

  req.user = user;
}