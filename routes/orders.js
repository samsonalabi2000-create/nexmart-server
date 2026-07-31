const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/orders");
const { protect }  = require("../middleware/auth");
const validate     = require("../middleware/validate");
const v            = require("../middleware/validators");

// All order routes require authentication
router.use(protect);

router.get ("/",    ctrl.getOrders);
router.post("/",    v.createOrder, validate, ctrl.createOrder);
router.get ("/:id", ctrl.getById);

module.exports = router;
