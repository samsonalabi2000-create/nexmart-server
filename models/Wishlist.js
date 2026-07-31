const { query } = require("../config/db");

// ── Get all wishlist products for a user ──────────────────────────────────────
const getByUser = async (userId) => {
  const { rows } = await query(
    `SELECT p.id, p.name, p.price, p.original_price, p.images,
            p.badge, p.rating, p.review_count, p.category, p.brand, p.stock,
            w.added_at
     FROM wishlist w
     JOIN products p ON p.id = w.product_id
     WHERE w.user_id = $1
     ORDER BY w.added_at DESC`,
    [userId]
  );
  return rows;
};

// ── Add — silently ignores duplicate ─────────────────────────────────────────
const add = async (userId, productId) => {
  await query(
    `INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, productId]
  );
};

// ── Remove ────────────────────────────────────────────────────────────────────
const remove = async (userId, productId) => {
  const { rowCount } = await query(
    `DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2`,
    [userId, productId]
  );
  return rowCount > 0;
};

// ── Check membership ──────────────────────────────────────────────────────────
const contains = async (userId, productId) => {
  const { rows } = await query(
    `SELECT 1 FROM wishlist WHERE user_id = $1 AND product_id = $2`,
    [userId, productId]
  );
  return rows.length > 0;
};

// ── Clear entire wishlist ─────────────────────────────────────────────────────
const clear = async (userId) => {
  await query(`DELETE FROM wishlist WHERE user_id = $1`, [userId]);
};

module.exports = { getByUser, add, remove, contains, clear };
