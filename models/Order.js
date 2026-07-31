const crypto          = require("crypto");
const { query, getClient } = require("../config/db");

const generateTracking = () => "NX" + crypto.randomBytes(5).toString("hex").toUpperCase();

// ── Shared items aggregation SQL ──────────────────────────────────────────────
const ITEMS_AGG = `
  COALESCE(
    json_agg(
      json_build_object(
        'id',         oi.id,
        'product_id', oi.product_id,
        'name',       oi.name,
        'price',      oi.price,
        'quantity',   oi.quantity,
        'image',      oi.image
      )
    ) FILTER (WHERE oi.id IS NOT NULL),
    '[]'
  ) AS items
`;

// ── Get all orders for a user ─────────────────────────────────────────────────
const getByUser = async (userId, { page = 1, limit = 10 } = {}) => {
  const offset = (Number(page) - 1) * Number(limit);

  const { rows: [{ count }] } = await query(
    `SELECT COUNT(*) FROM orders WHERE user_id = $1`, [userId]
  );

  const { rows } = await query(
    `SELECT o.id, o.status, o.total, o.shipping_fee, o.subtotal, o.tax,
            o.payment_method, o.payment_status, o.tracking_number,
            o.shipping_first_name, o.shipping_last_name, o.shipping_city, o.shipping_state,
            o.created_at, ${ITEMS_AGG}
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, Number(limit), offset]
  );

  return { orders: rows, total: parseInt(count, 10), page: Number(page), totalPages: Math.ceil(count / limit) };
};

// ── Get single order (scoped to user unless admin=true) ───────────────────────
const findById = async (orderId, { userId, admin = false } = {}) => {
  const condition = admin ? `o.id = $1` : `o.id = $1 AND o.user_id = $2`;
  const params    = admin ? [orderId] : [orderId, userId];

  const { rows: [order] } = await query(
    `SELECT o.*, ${ITEMS_AGG}
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE ${condition}
     GROUP BY o.id`,
    params
  );
  return order || null;
};

// ── Get all orders (admin) ────────────────────────────────────────────────────
const getAll = async ({ page = 1, limit = 20, status } = {}) => {
  const conditions = [];
  const params     = [];
  let   p          = 1;

  if (status) { conditions.push(`o.status = $${p++}`); params.push(status); }

  const where  = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (Number(page) - 1) * Number(limit);

  const { rows: [{ count }] } = await query(
    `SELECT COUNT(*) FROM orders o ${where}`, params
  );

  const { rows } = await query(
    `SELECT o.id, o.user_id, o.status, o.total, o.payment_status,
            o.tracking_number, o.created_at,
            u.name AS user_name, u.email AS user_email,
            ${ITEMS_AGG}
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN users u ON u.id = o.user_id
     ${where}
     GROUP BY o.id, u.name, u.email
     ORDER BY o.created_at DESC
     LIMIT $${p++} OFFSET $${p++}`,
    [...params, Number(limit), offset]
  );

  return { orders: rows, total: parseInt(count, 10), page: Number(page), totalPages: Math.ceil(count / limit) };
};

// ── Create order in a transaction ─────────────────────────────────────────────
const create = async (userId, { items, shipping, payment, notes }) => {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Fetch real prices and stock from DB
    const productIds = items.map((i) => i.productId);
    const { rows: dbProducts } = await client.query(
      `SELECT id, name, price, stock FROM products
       WHERE id = ANY($1::uuid[]) AND is_active = TRUE`,
      [productIds]
    );

    const productMap = Object.fromEntries(dbProducts.map((p) => [p.id, p]));

    // 2. Validate + build verified line items
    const verifiedItems = [];
    for (const item of items) {
      const product = productMap[item.productId];
      if (!product)
        throw Object.assign(new Error(`Product not found: ${item.productId}`), { status: 404 });
      if (product.stock < item.quantity)
        throw Object.assign(
          new Error(`Insufficient stock for "${product.name}" (available: ${product.stock})`),
          { status: 400 }
        );
      verifiedItems.push({
        productId: product.id,
        name:      product.name,
        price:     Number(product.price),
        quantity:  item.quantity,
        image:     item.image || null,
      });
    }

    // 3. Server-side totals — client values are ignored
    const subtotal    = verifiedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const shippingFee = subtotal >= 50_000 ? 0 : 2_000;   // free delivery over ₦50k
    const tax         = 0;
    const total       = subtotal + shippingFee + tax;

    // 4. Insert order row
    const { rows: [order] } = await client.query(
      `INSERT INTO orders (
         user_id,
         shipping_first_name, shipping_last_name, shipping_email,
         shipping_phone, shipping_address, shipping_city, shipping_state, shipping_zip,
         payment_method, transaction_id,
         subtotal, shipping_fee, tax, total,
         tracking_number, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        userId,
        shipping.firstName, shipping.lastName, shipping.email,
        shipping.phone,     shipping.address,  shipping.city,
        shipping.state,     shipping.zip || "",
        payment?.method || "card",
        payment?.transactionId || null,
        subtotal, shippingFee, tax, total,
        generateTracking(),
        notes || null,
      ]
    );

    // 5. Insert line items + decrement stock
    for (const item of verifiedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity, image)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, item.productId, item.name, item.price, item.quantity, item.image]
      );
      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.productId]
      );
    }

    await client.query("COMMIT");
    return { ...order, items: verifiedItems };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// ── Admin: update order status / payment status ───────────────────────────────
const updateStatus = async (id, { status, paymentStatus, transactionId }) => {
  const fields = [];
  const params = [];
  let   p      = 1;

  if (status)          { fields.push(`status = $${p++}`);           params.push(status); }
  if (paymentStatus)   { fields.push(`payment_status = $${p++}`);   params.push(paymentStatus); }
  if (transactionId)   { fields.push(`transaction_id = $${p++}`);   params.push(transactionId); }

  if (!fields.length) return null;

  params.push(id);
  const { rows } = await query(
    `UPDATE orders SET ${fields.join(", ")} WHERE id = $${p} RETURNING *`,
    params
  );
  return rows[0] || null;
};

module.exports = { getByUser, findById, getAll, create, updateStatus };
