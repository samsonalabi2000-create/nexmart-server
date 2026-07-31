const Product    = require("../models/Product");
const AppError   = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// GET /api/products
exports.getAll = catchAsync(async (req, res) => {
  const result = await Product.getAll(req.query);
  res.json(result);
});

// GET /api/products/best-sellers
exports.getBestSellers = catchAsync(async (_req, res) => {
  res.json(await Product.getBestSellers());
});

// GET /api/products/new-arrivals
exports.getNewArrivals = catchAsync(async (_req, res) => {
  res.json(await Product.getNewArrivals());
});

// GET /api/products/flash-sales
exports.getFlashSales = catchAsync(async (_req, res) => {
  res.json(await Product.getFlashSales());
});

// GET /api/products/search?q=
exports.search = catchAsync(async (req, res) => {
  if (!req.query.q) return res.json([]);
  res.json(await Product.search(req.query.q));
});

// GET /api/products/:id
exports.getById = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError("Product not found", 404);
  res.json(product);
});

// GET /api/products/:id/related
exports.getRelated = catchAsync(async (req, res) => {
  res.json(await Product.getRelated(req.params.id));
});

// POST /api/products/:id/reviews  (protected)
exports.addReview = catchAsync(async (req, res) => {
  const { rating, comment } = req.body;

  const review = await Product.addReview(
    req.params.id,
    req.user.id,
    req.user.name,
    { rating: Number(rating), comment }
  );
  res.status(201).json(review);
});

// 
exports.getFeatured = catchAsync(async (_req, res) => {
  res.json(await Product.getFeatured());
});
