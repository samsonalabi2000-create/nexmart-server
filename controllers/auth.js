const jwt        = require("jsonwebtoken");
const User       = require("../models/User");
const AppError   = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });

const formatUser = (u) => ({
  id:            u.id,
  name:          u.name,
  email:         u.email,
  phone:         u.phone || "",
  avatar:        u.avatar || "",
  role:          u.role,
  loyaltyPoints: u.loyalty_points ?? 0,
});

// POST /api/auth/register
exports.register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findByEmail(email);
  if (existing) throw new AppError("Email is already registered", 400);

  const user  = await User.create({ name, email, password });
  const token = signToken(user.id);

  res.status(201).json({ token, user: formatUser(user) });
});

// POST /api/auth/login
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user  = await User.findByEmail(email);
  const valid = user && await User.verifyPassword(password, user.password);
  if (!valid) throw new AppError("Invalid email or password", 401);

  const token = signToken(user.id);
  res.json({ token, user: formatUser(user) });
});

// GET /api/auth/me
exports.getMe = catchAsync(async (req, res) => {
  res.json({ user: formatUser(req.user) });
});

// POST /api/auth/logout
exports.logout = (_req, res) => {
  // JWT is stateless — instruct the client to drop the token
  res.json({ message: "Logged out successfully" });
};
