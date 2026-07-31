const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/auth");
const { protect }     = require("../middleware/auth");
const validate        = require("../middleware/validate");
const { register, login } = require("../middleware/validators");

// Public
router.post("/register", register,  validate, ctrl.register);
router.post("/login",    login,     validate, ctrl.login);
router.post("/logout",                        ctrl.logout);

// Protected
router.get("/me", protect, ctrl.getMe);

module.exports = router;
