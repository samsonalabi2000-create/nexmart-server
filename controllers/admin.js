const Product    = require("../models/Product");
const Order      = require("../models/Order");
const AppError   = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { query } = require("../config/db");

// ── Dashboard stats ────────────────────────────────────────────────────────────
exports.getStats = catchAsync(async (req, res) => {
  const [
    productsResult,
    usersResult,
    ordersResult,
    pendingResult,
    revenueResult,
    lowStockResult,
    statusResult,
    recentOrdersResult,
    salesResult,
  ] = await Promise.all([
    query(`
      SELECT COUNT(*)
      FROM products
      WHERE is_active = TRUE
    `),

    query(`
      SELECT COUNT(*)
      FROM users
      WHERE is_active = TRUE
        AND role = 'user'
    `),

    query(`
      SELECT COUNT(*)
      FROM orders
    `),

    query(`
      SELECT COUNT(*)
      FROM orders
      WHERE status = 'processing'
    `),

    query(`
      SELECT COALESCE(SUM(total), 0) AS sum
      FROM orders
      WHERE payment_status = 'paid'
    `),

    query(`
      SELECT id, name, stock
      FROM products
      WHERE stock <= 10
        AND is_active = TRUE
      ORDER BY stock ASC
      LIMIT 5
    `),

    query(`
      SELECT
        status,
        COUNT(*)::int AS count
      FROM orders
      GROUP BY status
      ORDER BY status
    `),

    query(`
      SELECT
        id,
        tracking_number,
        total,
        status,
        payment_status,
        created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5
    `),

    query(`
      SELECT
        DATE(created_at) AS date,
        COALESCE(SUM(total), 0) AS revenue,
        COUNT(*)::int AS orders
      FROM orders
      WHERE payment_status = 'paid'
        AND created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `),
  ]);

  const orderStatus = {
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

  for (const row of statusResult.rows) {
    if (row.status in orderStatus) {
      orderStatus[row.status] = Number(row.count);
    }
  }

  res.json({
    totalProducts: parseInt(productsResult.rows[0].count, 10),
    totalCustomers: parseInt(usersResult.rows[0].count, 10),
    totalOrders: parseInt(ordersResult.rows[0].count, 10),
    pendingOrders: parseInt(pendingResult.rows[0].count, 10),
    totalRevenue: parseFloat(revenueResult.rows[0].sum),

    lowStockProducts: lowStockResult.rows,

    orderStatus,

    recentOrders: recentOrdersResult.rows,

    salesOverview: salesResult.rows.map((row) => ({
      date: row.date,
      revenue: Number(row.revenue),
      orders: Number(row.orders),
    })),
  });
});


// ── Products ───────────────────────────────────────────────────────────────────

exports.getAllProducts = catchAsync(async (req, res) => {
  const {
    search,
    category,
    page = 1,
    limit = 20,
  } = req.query;

  const result = await Product.getAllAdmin({
    search,
    category,
    page: Number(page),
    limit: Number(limit),
  });

  res.json(result);
});


exports.createProduct = catchAsync(async (req, res) => {
  const product = await Product.create(req.body);

  res.status(201).json({
    message: "Product created successfully",
    product,
  });
});


exports.updateProduct = catchAsync(async (req, res) => {
  const product = await Product.update(req.params.id, req.body);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  res.json({
    message: "Product updated successfully",
    product,
  });
});


exports.deleteProduct = catchAsync(async (req, res) => {
  const deleted = await Product.deactivate(req.params.id);

  if (!deleted) {
    throw new AppError("Product not found", 404);
  }

  res.json({
    message: "Product deactivated successfully",
  });
});


// ── Orders ─────────────────────────────────────────────────────────────────────

exports.getAllOrders = catchAsync(async (req, res) => {
  const {
    status,
    paymentStatus,
    page = 1,
    limit = 20,
  } = req.query;

  const result = await Order.getAll({
    status,
    paymentStatus,
    page: Number(page),
    limit: Number(limit),
  });

  res.json(result);
});


exports.getOrder = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  res.json({
    order,
  });
});


exports.updateOrderStatus = catchAsync(async (req, res) => {
  const { status } = req.body;

  const order = await Order.updateStatus(
    req.params.id,
    status
  );

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  res.json({
    message: "Order status updated successfully",
    order,
  });
});