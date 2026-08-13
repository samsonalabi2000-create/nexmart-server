const Seller = require("../models/Seller");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

exports.getStatus = catchAsync(async (req, res) => {
  const profile = await Seller.getProfileByUser(req.user.id);
  const application = await Seller.getApplicationByUser(req.user.id);

  res.json({
    profile,
    application,
    isSeller: profile?.status === "approved",
  });
});

exports.apply = catchAsync(async (req, res) => {
  const existingProfile = await Seller.getProfileByUser(req.user.id);
  if (existingProfile?.status === "approved") {
    throw new AppError("You already have an approved seller account.", 409);
  }

  const existingApplication = await Seller.getApplicationByUser(req.user.id);
  if (existingApplication?.status === "pending") {
    throw new AppError("Your seller application is already under review.", 409);
  }

  const required = ["storeName", "phone", "businessEmail", "address", "city", "state"];
  for (const field of required) {
    if (!String(req.body[field] || "").trim()) {
      throw new AppError(`${field} is required`, 400);
    }
  }

  const application = await Seller.createApplication(req.user.id, req.body);

  res.status(201).json({
    message: "Seller application submitted successfully.",
    application,
  });
});

exports.dashboard = catchAsync(async (req, res) => {
  res.json({
    seller: req.seller,
    stats: await Seller.getDashboard(req.seller.id),
  });
});

exports.products = catchAsync(async (req, res) => {
  res.json(await Seller.getProducts(req.seller.id, req.query));
});

exports.createProduct = catchAsync(async (req, res) => {
  const product = await Seller.createProduct(req.seller.id, req.body);
  res.status(201).json(product);
});

exports.updateProduct = catchAsync(async (req, res) => {
  const product = await Seller.updateProduct(req.seller.id, req.params.id, req.body);
  if (!product) throw new AppError("Product not found or not owned by this seller.", 404);
  res.json(product);
});

exports.deleteProduct = catchAsync(async (req, res) => {
  const done = await Seller.deactivateProduct(req.seller.id, req.params.id);
  if (!done) throw new AppError("Product not found or not owned by this seller.", 404);
  res.json({ message: "Product deactivated" });
});

exports.orders = catchAsync(async (req, res) => {
  res.json(await Seller.getOrders(req.seller.id, req.query));
});

exports.updateOrderFulfillment = catchAsync(async (req, res) => {
  const fulfillment = await Seller.updateFulfillment(
    req.seller.id,
    req.params.orderId,
    req.body
  );

  if (!fulfillment) {
    throw new AppError("Order does not contain products belonging to this seller.", 404);
  }

  res.json(fulfillment);
});
