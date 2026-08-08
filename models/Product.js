const { query } = require("../config/db");

const LIST_FIELDS = `
  id, name, description, price, original_price, category, category_name,
  brand, images, badge, is_new, is_best_seller, stock, specs, tags,
  rating, review_count, is_active, created_at
`;

// ── Get all with filters / sort / pagination (public — active only) ──────────
const getAll = async ({ category, search, sort, brand, minPrice, maxPrice, rating, page = 1, limit = 12 } = {}) => {
  const conditions = ["is_active = TRUE"];
  const params     = [];
  let   p          = 1;

  if (category) { conditions.push(`category = $${p++}`);          params.push(category); }
  if (brand)    { conditions.push(`brand ILIKE $${p++}`);         params.push(`%${brand}%`); }
  if (search)   { conditions.push(`name ILIKE $${p++}`);          params.push(`%${search}%`); }
  if (minPrice) { conditions.push(`price >= $${p++}`);            params.push(Number(minPrice)); }
  if (maxPrice) { conditions.push(`price <= $${p++}`);            params.push(Number(maxPrice)); }
  if (rating)   { conditions.push(`rating >= $${p++}`);           params.push(Number(rating)); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const sortMap = {
    "price-asc":  "price ASC",
    "price-desc": "price DESC",
    "rating":     "rating DESC",
    "newest":     "created_at DESC",
    "popular":    "review_count DESC",
  };
  const orderBy = sortMap[sort] || "review_count DESC";
  const offset  = (Number(page) - 1) * Number(limit);

  const { rows: [{ count }] } = await query(
    `SELECT COUNT(*) FROM products ${where}`, params
  );

  const { rows: products } = await query(
    `SELECT ${LIST_FIELDS} FROM products ${where}
     ORDER BY ${orderBy} LIMIT $${p++} OFFSET $${p++}`,
    [...params, Number(limit), offset]
  );

  return {
    products,
    total:      parseInt(count, 10),
    page:       Number(page),
    totalPages: Math.ceil(count / limit),
  };
};

// ── Get ALL products for admin — includes inactive, no active-only filter ────
const getAllAdmin = async ({ search, category, page = 1, limit = 20 } = {}) => {
  const conditions = [];
  const params     = [];
  let   p          = 1;

  if (search)   { conditions.push(`name ILIKE $${p++}`); params.push(`%${search}%`); }
  if (category) { conditions.push(`category = $${p++}`); params.push(category); }

  const where  = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (Number(page) - 1) * Number(limit);

  const { rows: [{ count }] } = await query(
    `SELECT COUNT(*) FROM products ${where}`, params
  );

  const { rows: products } = await query(
    `SELECT ${LIST_FIELDS} FROM products ${where}
     ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`,
    [...params, Number(limit), offset]
  );

  return {
    products,
    total:      parseInt(count, 10),
    page:       Number(page),
    totalPages: Math.ceil(count / limit),
  };
};

// ── Flag-based lists ──────────────────────────────────────────────────────────
const getBestSellers = async () => {
  const { rows } = await query(
    `SELECT ${LIST_FIELDS} FROM products
     WHERE is_best_seller = TRUE AND is_active = TRUE
     ORDER BY review_count DESC LIMIT 8`
  );
  return rows;
};

const getNewArrivals = async () => {
  const { rows } = await query(
    `SELECT ${LIST_FIELDS} FROM products
     WHERE is_new = TRUE AND is_active = TRUE
     ORDER BY created_at DESC LIMIT 8`
  );
  return rows;
};

const getFlashSales = async () => {
  const { rows } = await query(
    `SELECT ${LIST_FIELDS} FROM products
     WHERE badge = 'sale' AND is_active = TRUE LIMIT 6`
  );
  return rows;
};

// ── Single product with reviews ───────────────────────────────────────────────
const findById = async (id) => {
  const { rows } = await query(
    `SELECT * FROM products WHERE id = $1 AND is_active = TRUE`, [id]
  );
  if (!rows[0]) return null;

  const { rows: reviews } = await query(
    `SELECT r.id, r.user_id, r.user_name, r.rating, r.comment, r.verified, r.created_at
     FROM reviews r WHERE r.product_id = $1 ORDER BY r.created_at DESC`,
    [id]
  );
  return { ...rows[0], reviews };
};

// ── Related products ──────────────────────────────────────────────────────────
const getRelated = async (id) => {
  const { rows: [product] } = await query(
    `SELECT category FROM products WHERE id = $1`, [id]
  );
  if (!product) return [];

  const { rows } = await query(
    `SELECT ${LIST_FIELDS} FROM products
     WHERE category = $1 AND id != $2 AND is_active = TRUE
     ORDER BY review_count DESC LIMIT 6`,
    [product.category, id]
  );
  return rows;
};

// ── Full-text search ──────────────────────────────────────────────────────────
const search = async (q) => {
  const { rows } = await query(
    `SELECT id, name, price, images, category, rating
     FROM products
     WHERE name ILIKE $1 AND is_active = TRUE LIMIT 8`,
    [`%${q}%`]
  );
  return rows;
};

// ── Add review ────────────────────────────────────────────────────────────────
const addReview = async (productId, userId, userName, { rating, comment }) => {
  const { rows } = await query(
    `INSERT INTO reviews (product_id, user_id, user_name, rating, comment, verified)
     VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
    [productId, userId, userName, rating, comment]
  );

  await query(
    `UPDATE products
     SET review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1),
         rating       = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE product_id = $1)
     WHERE id = $1`,
    [productId]
  );
  return rows[0];
};

// ── Admin: create product ─────────────────────────────────────────────────────
const create = async (data) => {
  const {
    name, description, price, originalPrice, category, categoryName,
    brand, images, badge, isNew, isBestSeller, stock, specs, tags,
  } = data;
  const { rows } = await query(
    `INSERT INTO products
       (name, description, price, original_price, category, category_name,
        brand, images, badge, is_new, is_best_seller, stock, specs, tags)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING ${LIST_FIELDS}`,
    [
      name, description, price, originalPrice || null, category, categoryName,
      brand, images || [], badge || null, isNew || false, isBestSeller || false,
      stock || 0, JSON.stringify(specs || {}), tags || [],
    ]
  );
  return rows[0];
};

// ── Admin: update product ─────────────────────────────────────────────────────
const update = async (id, data) => {
  const fields = [];
  const params = [];
  let   p      = 1;

  const allowed = [
    ["name",           data.name],
    ["description",    data.description],
    ["price",          data.price],
    ["original_price", data.originalPrice],
    ["category",       data.category],
    ["category_name",  data.categoryName],
    ["brand",          data.brand],
    ["images",         data.images],
    ["badge",          data.badge],
    ["is_new",         data.isNew],
    ["is_best_seller", data.isBestSeller],
    ["stock",          data.stock],
    ["specs",          data.specs ? JSON.stringify(data.specs) : undefined],
    ["tags",           data.tags],
    ["is_active",      data.isActive],
  ];

  for (const [col, val] of allowed) {
    if (val !== undefined) { fields.push(`${col} = $${p++}`); params.push(val); }
  }

  if (!fields.length) return null;

  params.push(id);
  const { rows } = await query(
    `UPDATE products SET ${fields.join(", ")} WHERE id = $${p} RETURNING ${LIST_FIELDS}`,
    params
  );
  return rows[0] || null;
};

// ── Admin: delete product (soft) ──────────────────────────────────────────────
const deactivate = async (id) => {
  const { rowCount } = await query(
    `UPDATE products SET is_active = FALSE WHERE id = $1`, [id]
  );
  return rowCount > 0;
};

module.exports = {
  getAll, getAllAdmin, getBestSellers, getNewArrivals, getFlashSales,
  findById, getRelated, search, addReview,
  create, update, deactivate,
};
