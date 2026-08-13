const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminSellers");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/applications", ctrl.getApplications);
router.patch("/applications/:id/approve", ctrl.approve);
router.patch("/applications/:id/reject", ctrl.reject);

module.exports = router;
