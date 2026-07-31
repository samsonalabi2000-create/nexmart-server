const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/profile");
const { protect }  = require("../middleware/auth");
const validate     = require("../middleware/validate");
const v            = require("../middleware/validators");

// All profile routes require authentication
router.use(protect);

// ── Own profile ───────────────────────────────────────────────────────────────
router.get  ("/",          ctrl.getProfile);
router.put  ("/",          v.updateProfile,  validate, ctrl.updateProfile);
router.put  ("/avatar",                                ctrl.updateAvatar);
router.put  ("/password",  v.changePassword, validate, ctrl.changePassword);

// ── Addresses ─────────────────────────────────────────────────────────────────
router.get   ("/addresses",                    ctrl.getAddresses);
router.post  ("/addresses",  v.address, validate, ctrl.addAddress);
router.put   ("/addresses/:addressId",  v.address, validate, ctrl.updateAddress);
router.delete("/addresses/:addressId",             ctrl.deleteAddress);
router.patch ("/addresses/:addressId/default",     ctrl.setDefaultAddress);

module.exports = router;
