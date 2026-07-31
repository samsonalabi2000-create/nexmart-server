const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/products");
const { protect }  = require("../middleware/auth");
const validate     = require("../middleware/validate");
const v            = require("../middleware/validators");

// Static routes — MUST come before /:id
router.get("/best-sellers", ctrl.getBestSellers);
router.get("/new-arrivals", ctrl.getNewArrivals);
router.get("/flash-sales",  ctrl.getFlashSales);
router.get("/search",       ctrl.search);

// Collection + single
router.get("/",    ctrl.getAll);
router.get("/featured", ctrl.getFeatured);
router.get("/:id", ctrl.getById);

// Related
router.get("/:id/related", ctrl.getRelated);

// Reviews — requires login
router.post("/:id/reviews", protect, v.addReview, validate, ctrl.addReview);

module.exports = router;
