const Product    = require("../models/Product");
const Order      = require("../models/Order");
const AppError   = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// ── Products ──────────────────────────────────────────────────────────────────

// POST /api/admin/products
exports.createProduct = catchAsync(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

// PUT /api/admin/products/:id
exports.updateProduct = catchAsync(async (req, res) => {
  const product = await Product.update(req.params.id, req.body);
  if (!product) throw new AppError("Product not found", 404);
  res.json(product);
});

// DELETE /api/admin/products/:id  (soft delete)
exports.deleteProduct = catchAsync(async (req, res) => {
  const done = await Product.deactivate(req.params.id);
  if (!done) throw new AppError("Product not found", 404);
  res.json({ message: "Product deactivated" });
});

// ── Orders ────────────────────────────────────────────────────────────────────

// GET /api/admin/orders
exports.getAllOrders = catchAsync(async (req, res) => {
  const result = await Order.getAll(req.query);
  res.json(result);
});

// GET /api/admin/orders/:id
exports.getOrder = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id, { admin: true });
  if (!order) throw new AppError("Order not found", 404);
  res.json(order);
});

// PATCH /api/admin/orders/:id/status
exports.updateOrderStatus = catchAsync(async (req, res) => {
  const { status, paymentStatus, transactionId } = req.body;
  const order = await Order.updateStatus(req.params.id, { status, paymentStatus, transactionId });
  if (!order) throw new AppError("Order not found or nothing to update", 404);
  res.json(order);
});
