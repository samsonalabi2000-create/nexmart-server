const jwt      = require("jsonwebtoken");
const User     = require("../models/User");
const AppError = require("../utils/AppError");

// ── Verify JWT and attach user to req ─────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) throw new AppError("Not authorised — no token provided", 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user) throw new AppError("The user belonging to this token no longer exists", 401);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError")  return next(new AppError("Invalid token", 401));
    if (err.name === "TokenExpiredError")  return next(new AppError("Token has expired — please log in again", 401));
    next(err);
  }
};

// ── Admin-only guard — always use after protect ────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return next(new AppError("This action requires admin privileges", 403));
  }
  next();
};

module.exports = { protect, adminOnly };
