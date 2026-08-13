const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/seller");
const { protect, sellerOnly } = require("../middleware/sellerAuth");

router.get("/status", protect, ctrl.getStatus);
router.post("/apply", protect, ctrl.apply);

router.use(protect, sellerOnly);

router.get("/dashboard", ctrl.dashboard);
router.get("/products", ctrl.products);
router.post("/products", ctrl.createProduct);
router.put("/products/:id", ctrl.updateProduct);
router.delete("/products/:id", ctrl.deleteProduct);

router.get("/orders", ctrl.orders);
router.patch("/orders/:orderId/fulfillment", ctrl.updateOrderFulfillment);

module.exports = router;
