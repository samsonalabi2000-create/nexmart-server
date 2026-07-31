const User       = require("../models/User");
const AppError   = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const formatUser = (u) => ({
  id:            u.id,
  name:          u.name,
  email:         u.email,
  phone:         u.phone || "",
  avatar:        u.avatar || "",
  role:          u.role,
  loyaltyPoints: u.loyalty_points ?? 0,
  createdAt:     u.created_at,
});

// GET /api/profile
exports.getProfile = catchAsync(async (req, res) => {
  res.json({ user: formatUser(req.user) });
});

// PUT /api/profile
exports.updateProfile = catchAsync(async (req, res) => {
  const { name, email, phone } = req.body;
  const updated = await User.updateProfile(req.user.id, { name, email, phone });
  if (!updated) throw new AppError("User not found", 404);
  res.json({ user: formatUser(updated) });
});

// PUT /api/profile/avatar
exports.updateAvatar = catchAsync(async (req, res) => {
  const { avatarUrl } = req.body;
  if (!avatarUrl) throw new AppError("avatarUrl is required", 400);

  const updated = await User.updateAvatar(req.user.id, avatarUrl);
  res.json({ avatar: updated.avatar });
});

// PUT /api/profile/password
exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Re-fetch with password hash
  const userWithHash = await User.findByEmail(req.user.email);
  const valid = await User.verifyPassword(currentPassword, userWithHash.password);
  if (!valid) throw new AppError("Current password is incorrect", 401);

  await User.updatePassword(req.user.id, newPassword);
  res.json({ message: "Password updated successfully" });
});

// ── Addresses ─────────────────────────────────────────────────────────────────

// GET /api/profile/addresses
exports.getAddresses = catchAsync(async (req, res) => {
  const addresses = await User.getAddresses(req.user.id);
  res.json({ addresses });
});

// POST /api/profile/addresses
exports.addAddress = catchAsync(async (req, res) => {
  const address = await User.addAddress(req.user.id, req.body);
  res.status(201).json({ address });
});

// PUT /api/profile/addresses/:addressId
exports.updateAddress = catchAsync(async (req, res) => {
  const address = await User.updateAddress(req.user.id, req.params.addressId, req.body);
  if (!address) throw new AppError("Address not found", 404);
  res.json({ address });
});

// DELETE /api/profile/addresses/:addressId
exports.deleteAddress = catchAsync(async (req, res) => {
  const deleted = await User.deleteAddress(req.user.id, req.params.addressId);
  if (!deleted) throw new AppError("Address not found", 404);
  res.json({ message: "Address deleted" });
});

// PATCH /api/profile/addresses/:addressId/default
exports.setDefaultAddress = catchAsync(async (req, res) => {
  const address = await User.setDefaultAddress(req.user.id, req.params.addressId);
  if (!address) throw new AppError("Address not found", 404);
  res.json({ address });
});
