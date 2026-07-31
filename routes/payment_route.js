const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/payment");
const { protect} = require("../middleware/auth");

// Webhook must use raw body — registered before express.json() in app.js
// All other routes need auth
router.post("/webhook",    ctrl.webhook);            // no auth — Paystack calls this
router.post("/initialize", protect, ctrl.initialize); // create order + get pay URL
router.get ("/verify",     protect, ctrl.verify);     // confirm payment after redirect

module.exports = router;
