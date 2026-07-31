const argon2    = require("argon2");
const { query } = require("../config/db");

// Argon2id — strongest variant, OWASP recommended settings
const ARGON_OPTS = {
  type:        argon2.argon2id,
  memoryCost:  2 ** 16,   // 64 MB
  timeCost:    3,
  parallelism: 1,
};

// ── Password helpers ──────────────────────────────────────────────────────────
const hashPassword   = (plain)        => argon2.hash(plain, ARGON_OPTS);
const verifyPassword = (plain, hash)  => argon2.verify(hash, plain);

// ── Safe public fields (never expose password) ────────────────────────────────
const PUBLIC_FIELDS = `
  id, name, email, phone, avatar, role, loyalty_points, is_active, created_at, updated_at
`;

// ── Create user ───────────────────────────────────────────────────────────────
const create = async ({ name, email, password }) => {
  const hashed = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_FIELDS}`,
    [name.trim(), email.toLowerCase().trim(), hashed]
  );
  return rows[0];
};

// ── Find by email — returns password hash (for auth only) ─────────────────────
const findByEmail = async (email) => {
  const { rows } = await query(
    `SELECT id, name, email, password, phone, avatar, role, loyalty_points, is_active
     FROM users WHERE email = $1 AND is_active = TRUE`, 
    [email.toLowerCase().trim()]
  );
  return rows[0] || null;
};

// ── Find by ID — no password ───────────────────────────────────────────────────
const findById = async (id) => {
  const { rows } = await query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1 AND is_active = TRUE`,
    [id]
  );
  return rows[0] || null;
};

// ── Get all users (admin) ──────────────────────────────────────────────────────
const findAll = async ({ page = 1, limit = 20, search, role } = {}) => {
  const conditions = ["is_active = TRUE"];
  const params     = [];
  let   p          = 1;

  if (search) { conditions.push(`(name ILIKE $${p} OR email ILIKE $${p})`); params.push(`%${search}%`); p++; }
  if (role)   { conditions.push(`role = $${p++}`); params.push(role); }

  const where  = `WHERE ${conditions.join(" AND ")}`;
  const offset = (Number(page) - 1) * Number(limit);

  const { rows: [{ count }] } = await query(
    `SELECT COUNT(*) FROM users ${where}`, params
  );

  const { rows: users } = await query(
    `SELECT ${PUBLIC_FIELDS} FROM users ${where}
     ORDER BY created_at DESC
     LIMIT $${p++} OFFSET $${p++}`,
    [...params, Number(limit), offset]
  );

  return { users, total: parseInt(count, 10), page: Number(page), totalPages: Math.ceil(count / limit) };
};

// ── Update profile ─────────────────────────────────────────────────────────────
const updateProfile = async (id, { name, email, phone }) => {
  const { rows } = await query(
    `UPDATE users
     SET name  = COALESCE(NULLIF(TRIM($1), ''), name),
         email = COALESCE(NULLIF(TRIM(LOWER($2)), ''), email),
         phone = COALESCE($3, phone)
     WHERE id = $4 AND is_active = TRUE
     RETURNING ${PUBLIC_FIELDS}`,
    [name, email, phone, id]
  );
  return rows[0] || null;
};

// ── Update avatar URL ──────────────────────────────────────────────────────────
const updateAvatar = async (id, avatarUrl) => {
  const { rows } = await query(
    `UPDATE users SET avatar = $1 WHERE id = $2 RETURNING ${PUBLIC_FIELDS}`,
    [avatarUrl, id]
  );
  return rows[0] || null;
};

// ── Change password ────────────────────────────────────────────────────────────
const updatePassword = async (id, newPlain) => {
  const hashed = await hashPassword(newPlain);
  await query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, id]);
};

// ── Admin: update role ─────────────────────────────────────────────────────────
const updateRole = async (id, role) => {
  const { rows } = await query(
    `UPDATE users SET role = $1 WHERE id = $2 RETURNING ${PUBLIC_FIELDS}`,
    [role, id]
  );
  return rows[0] || null;
};

// ── Soft-delete user ───────────────────────────────────────────────────────────
const deactivate = async (id) => {
  const { rowCount } = await query(
    `UPDATE users SET is_active = FALSE WHERE id = $1`, [id]
  );
  return rowCount > 0;
};

// ── Loyalty points ─────────────────────────────────────────────────────────────
const addLoyaltyPoints = async (id, points) => {
  await query(
    `UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2`,
    [points, id]
  );
};

// ─── Addresses ────────────────────────────────────────────────────────────────

const getAddresses = async (userId) => {
  const { rows } = await query(
    `SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
  return rows;
};

const addAddress = async (userId, { label, street, city, state, zip, isDefault }) => {
  // If marking as default, clear existing default first
  if (isDefault) {
    await query(
      `UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1`, [userId]
    );
  }
  const { rows } = await query(
    `INSERT INTO user_addresses (user_id, label, street, city, state, zip, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, label || "Home", street, city, state, zip || "", isDefault || false]
  );
  return rows[0];
};

const updateAddress = async (userId, addressId, { label, street, city, state, zip, isDefault }) => {
  if (isDefault) {
    await query(
      `UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1`, [userId]
    );
  }
  const { rows } = await query(
    `UPDATE user_addresses
     SET label      = COALESCE($1, label),
         street     = COALESCE($2, street),
         city       = COALESCE($3, city),
         state      = COALESCE($4, state),
         zip        = COALESCE($5, zip),
         is_default = COALESCE($6, is_default)
     WHERE id = $7 AND user_id = $8
     RETURNING *`,
    [label, street, city, state, zip, isDefault, addressId, userId]
  );
  return rows[0] || null;
};

const deleteAddress = async (userId, addressId) => {
  const { rowCount } = await query(
    `DELETE FROM user_addresses WHERE id = $1 AND user_id = $2`,
    [addressId, userId]
  );
  return rowCount > 0;
};

const setDefaultAddress = async (userId, addressId) => {
  await query(`UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1`, [userId]);
  const { rows } = await query(
    `UPDATE user_addresses SET is_default = TRUE WHERE id = $1 AND user_id = $2 RETURNING *`,
    [addressId, userId]
  );
  return rows[0] || null;
};

module.exports = {
  create, findByEmail, findById, findAll,
  updateProfile, updateAvatar, updatePassword, updateRole, deactivate,
  addLoyaltyPoints,
  getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress,
  hashPassword, verifyPassword,
};
