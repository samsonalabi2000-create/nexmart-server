const Wishlist   = require("../models/Wishlist");
const AppError   = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// GET /api/wishlist
exports.getWishlist = catchAsync(async (req, res) => {
  res.json(await Wishlist.getByUser(req.user.id));
});

// POST /api/wishlist/:productId
exports.add = catchAsync(async (req, res) => {
  await Wishlist.add(req.user.id, req.params.productId);
  res.status(201).json({ message: "Added to wishlist" });
});

// DELETE /api/wishlist/:productId
exports.remove = catchAsync(async (req, res) => {
  const removed = await Wishlist.remove(req.user.id, req.params.productId);
  if (!removed) throw new AppError("Item not in wishlist", 404);
  res.json({ message: "Removed from wishlist" });
});

// GET /api/wishlist/:productId/check
exports.check = catchAsync(async (req, res) => {
  const inWishlist = await Wishlist.contains(req.user.id, req.params.productId);
  res.json({ inWishlist });
});

// DELETE /api/wishlist
exports.clear = catchAsync(async (req, res) => {
  await Wishlist.clear(req.user.id);
  res.json({ message: "Wishlist cleared" });
});
