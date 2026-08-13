const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/categories");
const { protect, adminOnly } = require("../middleware/auth");

// Public
router.get("/", ctrl.getCategories);
router.get("/:slug", ctrl.getCategory);

// Admin management
router.post("/", protect, adminOnly, ctrl.createCategory);
router.patch("/:slug", protect, adminOnly, ctrl.updateCategory);
router.delete("/:slug", protect, adminOnly, ctrl.deleteCategory);

module.exports = router;