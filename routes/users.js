const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/users");
const { protect, adminOnly } = require("../middleware/auth");
const validate               = require("../middleware/validate");
const v                      = require("../middleware/validators");

// All user management routes — admin only
router.use(protect, adminOnly);

router.get   ("/",              ctrl.getAll);
router.get   ("/:id",          ctrl.getById);
router.patch ("/:id/role",     v.updateUserRole, validate, ctrl.updateRole);
router.delete("/:id",          ctrl.deactivate);

module.exports = router;
