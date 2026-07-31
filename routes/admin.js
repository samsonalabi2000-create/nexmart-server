const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/admin");
const { protect, adminOnly } = require("../middleware/auth");
const validate               = require("../middleware/validate");
const v                      = require("../middleware/validators");

// Every admin route is behind protect + adminOnly
router.use(protect, adminOnly);

// ── Products ──────────────────────────────────────────────────────────────────
router.post  ("/products",     v.createProduct, validate, ctrl.createProduct);
router.put   ("/products/:id", v.updateProduct, validate, ctrl.updateProduct);
router.delete("/products/:id",                  ctrl.deleteProduct);

// ── Orders ────────────────────────────────────────────────────────────────────
router.get   ("/orders",           ctrl.getAllOrders);
router.get   ("/orders/:id",       ctrl.getOrder);
router.patch ("/orders/:id/status", v.updateOrderStatus, validate, ctrl.updateOrderStatus);

module.exports = router;
