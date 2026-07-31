const { body, query, param } = require("express-validator");

// ── Auth ──────────────────────────────────────────────────────────────────────
exports.register = [
  body("name")
    .trim().notEmpty().withMessage("Name is required")
    .isLength({ max: 80 }).withMessage("Name must be under 80 characters"),
  body("email")
    .trim().isEmail().withMessage("A valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number"),
];

exports.login = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

exports.changePassword = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("New password must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("New password must contain at least one number"),
];

// ── Profile ───────────────────────────────────────────────────────────────────
exports.updateProfile = [
  body("name").optional().trim().isLength({ min: 1, max: 80 }).withMessage("Name must be 1–80 characters"),
  body("email").optional().trim().isEmail().withMessage("Must be a valid email").normalizeEmail(),
  body("phone").optional().trim().isMobilePhone().withMessage("Must be a valid phone number"),
];

// ── Addresses ─────────────────────────────────────────────────────────────────
exports.address = [
  body("street").trim().notEmpty().withMessage("Street address is required"),
  body("city").trim().notEmpty().withMessage("City is required"),
  body("state").trim().notEmpty().withMessage("State is required"),
  body("label").optional().trim().isLength({ max: 30 }),
  body("zip").optional().trim(),
  body("isDefault").optional().isBoolean(),
];

// ── Products ──────────────────────────────────────────────────────────────────
exports.createProduct = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("categoryName").trim().notEmpty().withMessage("Category name is required"),
  body("brand").trim().notEmpty().withMessage("Brand is required"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  body("badge").optional().isIn(["sale", "new", "hot"]).withMessage("Badge must be sale, new, or hot"),
  body("images").optional().isArray(),
];

exports.updateProduct = [
  body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  body("badge").optional().isIn(["sale", "new", "hot", null]).withMessage("Invalid badge"),
];

// ── Reviews ───────────────────────────────────────────────────────────────────
exports.addReview = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").trim().isLength({ min: 10, max: 1000 })
    .withMessage("Comment must be between 10 and 1000 characters"),
];

// ── Orders ────────────────────────────────────────────────────────────────────
exports.createOrder = [
  body("items").isArray({ min: 1 }).withMessage("Order must contain at least one item"),
  body("items.*.productId").isUUID().withMessage("Each item must have a valid product ID"),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("Each item quantity must be at least 1"),
  body("shipping.firstName").trim().notEmpty().withMessage("First name is required"),
  body("shipping.lastName").trim().notEmpty().withMessage("Last name is required"),
  body("shipping.email").trim().isEmail().withMessage("A valid shipping email is required"),
  body("shipping.phone").trim().notEmpty().withMessage("Phone number is required"),
  body("shipping.address").trim().notEmpty().withMessage("Shipping address is required"),
  body("shipping.city").trim().notEmpty().withMessage("City is required"),
  body("shipping.state").trim().notEmpty().withMessage("State is required"),
  body("payment.method").optional().isIn(["card", "transfer", "crypto"]).withMessage("Invalid payment method"),
];

// ── Admin: update order status ────────────────────────────────────────────────
exports.updateOrderStatus = [
  body("status")
    .optional()
    .isIn(["processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid order status"),
  body("paymentStatus")
    .optional()
    .isIn(["pending", "paid", "failed"])
    .withMessage("Invalid payment status"),
];

// ── Admin: update user role ───────────────────────────────────────────────────
exports.updateUserRole = [
  body("role").isIn(["user", "admin"]).withMessage("Role must be user or admin"),
];

// ── UUID params ───────────────────────────────────────────────────────────────
exports.uuidParam = (paramName = "id") => [
  param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
];
