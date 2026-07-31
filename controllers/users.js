const User       = require("../models/User");
const AppError   = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// GET /api/users  (admin)
exports.getAll = catchAsync(async (req, res) => {
  const result = await User.findAll(req.query);
  res.json(result);
});

// GET /api/users/:id  (admin)
exports.getById = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  res.json({ user });
});

// PATCH /api/users/:id/role  (admin)
exports.updateRole = catchAsync(async (req, res) => {
  const { role } = req.body;
  if (req.params.id === req.user.id)
    throw new AppError("You cannot change your own role", 400);

  const updated = await User.updateRole(req.params.id, role);
  if (!updated) throw new AppError("User not found", 404);
  res.json({ user: updated });
});

// DELETE /api/users/:id  (admin — soft delete)
exports.deactivate = catchAsync(async (req, res) => {
  if (req.params.id === req.user.id)
    throw new AppError("You cannot deactivate your own account", 400);

  const done = await User.deactivate(req.params.id);
  if (!done) throw new AppError("User not found", 404);
  res.json({ message: "User deactivated" });
});
