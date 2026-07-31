const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/wishlist");
const { protect }  = require("../middleware/auth");
const v            = require("../middleware/validators");
const validate     = require("../middleware/validate");

// All wishlist routes require authentication
router.use(protect);

router.get   ("/",                   ctrl.getWishlist);
router.delete("/",                   ctrl.clear);
router.post  ("/:productId",  v.uuidParam("productId"), validate, ctrl.add);
router.delete("/:productId",  v.uuidParam("productId"), validate, ctrl.remove);
router.get   ("/:productId/check", v.uuidParam("productId"), validate, ctrl.check);

module.exports = router;
