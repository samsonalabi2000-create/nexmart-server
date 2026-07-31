const Order      = require("../models/Order");
const User       = require("../models/User");
const AppError   = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// GET /api/orders
exports.getOrders = catchAsync(async (req, res) => {
  const result = await Order.getByUser(req.user.id, req.query);
  res.json(result);
});

// GET /api/orders/:id
exports.getById = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id, { userId: req.user.id });
  if (!order) throw new AppError("Order not found", 404);
  res.json(order);
});

// POST /api/orders
exports.createOrder = catchAsync(async (req, res) => {
  const { items, shipping, payment, notes } = req.body;

  const order = await Order.create(req.user.id, { items, shipping, payment, notes });

  // Award loyalty points — 1 point per ₦100 (server-calculated total only)
  const points = Math.floor(Number(order.total) / 100);
  if (points > 0) await User.addLoyaltyPoints(req.user.id, points);

  res.status(201).json(order);
});
