const { query } = require("../config/db");

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getApprovedByUser = async (userId) => {
  const { rows } = await query(
    `SELECT * FROM seller_profiles
     WHERE user_id = $1 AND status = 'approved'
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const getProfileByUser = async (userId) => {
  const { rows } = await query(
    `SELECT * FROM seller_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const getApplicationByUser = async (userId) => {
  const { rows } = await query(
    `SELECT * FROM seller_applications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const createApplication = async (userId, data) => {
  const storeSlug = slugify(data.storeName);

  const { rows } = await query(
    `INSERT INTO seller_applications
      (user_id, store_name, store_slug, description, phone, business_email,
       address, city, state, country)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      userId,
      data.storeName,
      storeSlug,
      data.description || "",
      data.phone || "",
      data.businessEmail || "",
      data.address || "",
      data.city || "",
      data.state || "",
      data.country || "Nigeria",
    ]
  );

  return rows[0];
};

const createApprovedProfile = async (application, reviewerId) => {
  const { rows } = await query(
    `INSERT INTO seller_profiles
      (user_id, store_name, store_slug, description, phone, business_email,
       address, city, state, country, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved')
     ON CONFLICT (user_id)
     DO UPDATE SET
       store_name = EXCLUDED.store_name,
       store_slug = EXCLUDED.store_slug,
       description = EXCLUDED.description,
       phone = EXCLUDED.phone,
       business_email = EXCLUDED.business_email,
       address = EXCLUDED.address,
       city = EXCLUDED.city,
       state = EXCLUDED.state,
       country = EXCLUDED.country,
       status = 'approved',
       updated_at = NOW()
     RETURNING *`,
    [
      application.user_id,
      application.store_name,
      application.store_slug,
      application.description,
      application.phone,
      application.business_email,
      application.address,
      application.city,
      application.state,
      application.country,
    ]
  );

  await query(
    `UPDATE seller_applications
     SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [reviewerId, application.id]
  );

  return rows[0];
};

const rejectApplication = async (applicationId, reviewerId, reason) => {
  const { rows } = await query(
    `UPDATE seller_applications
     SET status = 'rejected',
         rejection_reason = $1,
         reviewed_by = $2,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [reason || "Application did not meet marketplace requirements.", reviewerId, applicationId]
  );
  return rows[0] || null;
};

const getApplications = async ({ status = "pending", search = "", page = 1, limit = 20 } = {}) => {
  const conditions = [];
  const params = [];
  let p = 1;

  if (status && status !== "all") {
    conditions.push(`a.status = $${p++}`);
    params.push(status);
  }

  if (search) {
    conditions.push(`(a.store_name ILIKE $${p} OR u.name ILIKE $${p} OR u.email ILIKE $${p})`);
    params.push(`%${search}%`);
    p++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (Number(page) - 1) * Number(limit);

  const countResult = await query(
    `SELECT COUNT(*) FROM seller_applications a
     JOIN users u ON u.id = a.user_id
     ${where}`,
    params
  );

  const { rows } = await query(
    `SELECT a.*, u.name AS applicant_name, u.email AS applicant_email
     FROM seller_applications a
     JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${p++} OFFSET $${p++}`,
    [...params, Number(limit), offset]
  );

  const total = Number(countResult.rows[0].count);

  return {
    applications: rows,
    total,
    page: Number(page),
    totalPages: Math.max(1, Math.ceil(total / Number(limit))),
  };
};

const getDashboard = async (sellerId) => {
  const [products, orders, revenue, pending, lowStock] = await Promise.all([
    query(`SELECT COUNT(*) FROM products WHERE seller_id = $1 AND is_active = TRUE`, [sellerId]),
    query(
      `SELECT COUNT(DISTINCT so.order_id)
       FROM seller_order_fulfillments so
       WHERE so.seller_id = $1`,
      [sellerId]
    ),
    query(
      `SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       WHERE p.seller_id = $1
         AND o.payment_status = 'paid'`,
      [sellerId]
    ),
    query(
      `SELECT COUNT(*) FROM seller_order_fulfillments
       WHERE seller_id = $1 AND status IN ('pending','processing')`,
      [sellerId]
    ),
    query(
      `SELECT id, name, stock
       FROM products
       WHERE seller_id = $1 AND is_active = TRUE AND stock <= 10
       ORDER BY stock ASC
       LIMIT 5`,
      [sellerId]
    ),
  ]);

  return {
    totalProducts: Number(products.rows[0].count),
    totalOrders: Number(orders.rows[0].count),
    totalRevenue: Number(revenue.rows[0].revenue),
    pendingOrders: Number(pending.rows[0].count),
    lowStockProducts: lowStock.rows,
  };
};

const getProducts = async (sellerId, { search = "", page = 1, limit = 15 } = {}) => {
  const conditions = ["seller_id = $1"];
  const params = [sellerId];
  let p = 2;

  if (search) {
    conditions.push(`name ILIKE $${p++}`);
    params.push(`%${search}%`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const offset = (Number(page) - 1) * Number(limit);

  const countResult = await query(`SELECT COUNT(*) FROM products ${where}`, params);
  const { rows } = await query(
    `SELECT id, name, description, price, original_price, category, category_name,
            brand, images, badge, is_new, is_best_seller, stock, specs, tags,
            rating, review_count, is_active, created_at
     FROM products ${where}
     ORDER BY created_at DESC
     LIMIT $${p++} OFFSET $${p++}`,
    [...params, Number(limit), offset]
  );

  const total = Number(countResult.rows[0].count);
  return {
    products: rows,
    total,
    page: Number(page),
    totalPages: Math.max(1, Math.ceil(total / Number(limit))),
  };
};

const createProduct = async (sellerId, data) => {
  const { rows } = await query(
    `INSERT INTO products
      (name, description, price, original_price, category, category_name, brand,
       images, badge, is_new, is_best_seller, stock, specs, tags, seller_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      data.name,
      data.description,
      Number(data.price),
      data.originalPrice ? Number(data.originalPrice) : null,
      data.category,
      data.categoryName,
      data.brand,
      data.images || [],
      data.badge || null,
      Boolean(data.isNew),
      Boolean(data.isBestSeller),
      Number(data.stock || 0),
      JSON.stringify(data.specs || {}),
      data.tags || [],
      sellerId,
    ]
  );
  return rows[0];
};

const updateProduct = async (sellerId, id, data) => {
  const allowed = [
    ["name", data.name],
    ["description", data.description],
    ["price", data.price === undefined ? undefined : Number(data.price)],
    ["original_price", data.originalPrice === undefined ? undefined : (data.originalPrice ? Number(data.originalPrice) : null)],
    ["category", data.category],
    ["category_name", data.categoryName],
    ["brand", data.brand],
    ["images", data.images],
    ["badge", data.badge],
    ["is_new", data.isNew],
    ["is_best_seller", data.isBestSeller],
    ["stock", data.stock === undefined ? undefined : Number(data.stock)],
    ["specs", data.specs === undefined ? undefined : JSON.stringify(data.specs || {})],
    ["tags", data.tags],
    ["is_active", data.isActive],
  ];

  const fields = [];
  const params = [];
  let p = 1;

  for (const [column, value] of allowed) {
    if (value !== undefined) {
      fields.push(`${column} = $${p++}`);
      params.push(value);
    }
  }

  if (!fields.length) return null;

  params.push(sellerId, id);
  const { rows } = await query(
    `UPDATE products
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE seller_id = $${p++} AND id = $${p}
     RETURNING *`,
    params
  );
  return rows[0] || null;
};

const deactivateProduct = async (sellerId, id) => {
  const { rowCount } = await query(
    `UPDATE products
     SET is_active = FALSE, updated_at = NOW()
     WHERE seller_id = $1 AND id = $2`,
    [sellerId, id]
  );
  return rowCount > 0;
};

const getOrders = async (sellerId, { status = "", page = 1, limit = 15 } = {}) => {
  const conditions = ["p.seller_id = $1"];
  const params = [sellerId];
  let p = 2;

  if (status) {
    conditions.push(`COALESCE(sf.status::text, 'pending') = $${p++}`);
    params.push(status);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const offset = (Number(page) - 1) * Number(limit);

  const countResult = await query(
    `SELECT COUNT(DISTINCT o.id)
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN seller_order_fulfillments sf
       ON sf.order_id = o.id AND sf.seller_id = $1
     ${where}`,
    params
  );

  const { rows } = await query(
    `SELECT
       o.id,
       o.created_at,
       o.status AS order_status,
       o.payment_status,
       o.total,
       u.name AS customer_name,
       u.email AS customer_email,
       COALESCE(sf.status::text, 'pending') AS seller_status,
       COALESCE(sf.tracking_number, '') AS tracking_number,
       COALESCE(
         json_agg(
           json_build_object(
             'productId', p.id,
             'name', p.name,
             'quantity', oi.quantity,
             'unitPrice', oi.unit_price,
             'image', p.images[1]
           )
         ) FILTER (WHERE p.id IS NOT NULL),
         '[]'::json
       ) AS items
     FROM orders o
     JOIN users u ON u.id = o.user_id
     JOIN order_items oi ON oi.order_id = o.id
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN seller_order_fulfillments sf
       ON sf.order_id = o.id AND sf.seller_id = $1
     ${where}
     GROUP BY o.id, u.name, u.email, sf.status, sf.tracking_number
     ORDER BY o.created_at DESC
     LIMIT $${p++} OFFSET $${p++}`,
    [...params, Number(limit), offset]
  );

  const total = Number(countResult.rows[0].count);
  return {
    orders: rows,
    total,
    page: Number(page),
    totalPages: Math.max(1, Math.ceil(total / Number(limit))),
  };
};

const ensureFulfillment = async (sellerId, orderId) => {
  const { rows } = await query(
    `INSERT INTO seller_order_fulfillments (seller_id, order_id)
     SELECT $1, $2
     WHERE EXISTS (
       SELECT 1
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $2 AND p.seller_id = $1
     )
     ON CONFLICT (seller_id, order_id) DO NOTHING
     RETURNING *`,
    [sellerId, orderId]
  );
  return rows[0] || null;
};

const updateFulfillment = async (sellerId, orderId, data) => {
  await ensureFulfillment(sellerId, orderId);

  const { rows } = await query(
    `UPDATE seller_order_fulfillments
     SET status = COALESCE($1::seller_fulfillment_status, status),
         tracking_number = COALESCE($2, tracking_number),
         note = COALESCE($3, note),
         updated_at = NOW()
     WHERE seller_id = $4 AND order_id = $5
     RETURNING *`,
    [data.status || null, data.trackingNumber || null, data.note || null, sellerId, orderId]
  );
  return rows[0] || null;
};

module.exports = {
  slugify,
  getApprovedByUser,
  getProfileByUser,
  getApplicationByUser,
  createApplication,
  createApprovedProfile,
  rejectApplication,
  getApplications,
  getDashboard,
  getProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  getOrders,
  updateFulfillment,
};
