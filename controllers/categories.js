const { query } = require("../config/db");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeSlug(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories
// Public category listing
// ─────────────────────────────────────────────────────────────────────────────

exports.getCategories = catchAsync(async (req, res) => {
  const { rows } = await query(`
    SELECT
      c.id,
      c.name,
      c.slug,
      c.image_url,
      c.is_active,
      c.created_at,
      COUNT(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p
      ON p.category = c.slug
      AND p.is_active = TRUE
    WHERE c.is_active = TRUE
    GROUP BY
      c.id,
      c.name,
      c.slug,
      c.image_url,
      c.is_active,
      c.created_at
    ORDER BY c.name ASC
  `);

  res.json({
    categories: rows,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories/:slug
// ─────────────────────────────────────────────────────────────────────────────

exports.getCategory = catchAsync(async (req, res) => {
  const { rows } = await query(
    `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.image_url,
        c.is_active,
        c.created_at,
        COUNT(p.id)::int AS product_count
      FROM categories c
      LEFT JOIN products p
        ON p.category = c.slug
        AND p.is_active = TRUE
      WHERE c.slug = $1
        AND c.is_active = TRUE
      GROUP BY
        c.id,
        c.name,
        c.slug,
        c.image_url,
        c.is_active,
        c.created_at
    `,
    [req.params.slug]
  );

  if (!rows.length) {
    throw new AppError("Category not found", 404);
  }

  res.json({
    category: rows[0],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/categories
// Admin: create category
// ─────────────────────────────────────────────────────────────────────────────

exports.createCategory = catchAsync(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const imageUrl = req.body.imageUrl
    ? String(req.body.imageUrl).trim()
    : null;

  if (!name) {
    throw new AppError("Category name is required", 400);
  }

  if (name.length < 2 || name.length > 80) {
    throw new AppError(
      "Category name must be between 2 and 80 characters",
      400
    );
  }

  const slug = makeSlug(name);

  if (!slug) {
    throw new AppError("Unable to generate a valid category slug", 400);
  }

  const existing = await query(
    `
      SELECT id
      FROM categories
      WHERE slug = $1
         OR LOWER(name) = LOWER($2)
      LIMIT 1
    `,
    [slug, name]
  );

  if (existing.rows.length) {
    throw new AppError("A category with this name already exists", 409);
  }

  const { rows } = await query(
    `
      INSERT INTO categories (
        name,
        slug,
        image_url
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        name,
        slug,
        image_url,
        is_active,
        created_at
    `,
    [name, slug, imageUrl]
  );

  res.status(201).json({
    category: {
      ...rows[0],
      product_count: 0,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/categories/:slug
// Admin: rename/update category
// ─────────────────────────────────────────────────────────────────────────────

exports.updateCategory = catchAsync(async (req, res) => {
  const currentSlug = String(req.params.slug || "").trim();
  const name = String(req.body.name || "").trim();

  const imageUrl =
    req.body.imageUrl !== undefined
      ? String(req.body.imageUrl || "").trim() || null
      : undefined;

  if (!currentSlug) {
    throw new AppError("Category slug is required", 400);
  }

  if (!name) {
    throw new AppError("Category name is required", 400);
  }

  if (name.length < 2 || name.length > 80) {
    throw new AppError(
      "Category name must be between 2 and 80 characters",
      400
    );
  }

  const newSlug = makeSlug(name);

  if (!newSlug) {
    throw new AppError("Unable to generate a valid category slug", 400);
  }

  const current = await query(
    `
      SELECT
        id,
        name,
        slug,
        image_url,
        is_active
      FROM categories
      WHERE slug = $1
      LIMIT 1
    `,
    [currentSlug]
  );

  if (!current.rows.length) {
    throw new AppError("Category not found", 404);
  }

  const duplicate = await query(
    `
      SELECT id
      FROM categories
      WHERE id <> $1
        AND (
          slug = $2
          OR LOWER(name) = LOWER($3)
        )
      LIMIT 1
    `,
    [current.rows[0].id, newSlug, name]
  );

  if (duplicate.rows.length) {
    throw new AppError("Another category already uses this name", 409);
  }

  // Update the category itself.
  const { rows } = await query(
    `
      UPDATE categories
      SET
        name = $1,
        slug = $2,
        image_url = COALESCE($3, image_url),
        updated_at = NOW()
      WHERE id = $4
      RETURNING
        id,
        name,
        slug,
        image_url,
        is_active,
        created_at
    `,
    [
      name,
      newSlug,
      imageUrl === undefined ? null : imageUrl,
      current.rows[0].id,
    ]
  );

  // Keep existing products synchronized with the new slug/name.
  await query(
    `
      UPDATE products
      SET
        category = $1,
        category_name = $2
      WHERE category = $3
    `,
    [newSlug, name, currentSlug]
  );

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS product_count
      FROM products
      WHERE category = $1
        AND is_active = TRUE
    `,
    [newSlug]
  );

  res.json({
    category: {
      ...rows[0],
      product_count: countResult.rows[0].product_count,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/categories/:slug
// Admin: deactivate category
// ─────────────────────────────────────────────────────────────────────────────

exports.deleteCategory = catchAsync(async (req, res) => {
  const slug = String(req.params.slug || "").trim();

  if (!slug) {
    throw new AppError("Category slug is required", 400);
  }

  const category = await query(
    `
      SELECT id, name, slug
      FROM categories
      WHERE slug = $1
      LIMIT 1
    `,
    [slug]
  );

  if (!category.rows.length) {
    throw new AppError("Category not found", 404);
  }

  const productCountResult = await query(
    `
      SELECT COUNT(*)::int AS product_count
      FROM products
      WHERE category = $1
        AND is_active = TRUE
    `,
    [slug]
  );

  const productCount = productCountResult.rows[0].product_count;

  if (productCount > 0) {
    throw new AppError(
      `Cannot delete this category because it contains ${productCount} active product${
        productCount === 1 ? "" : "s"
      }. Reassign the products first.`,
      409
    );
  }

  await query(
    `
      UPDATE categories
      SET
        is_active = FALSE,
        updated_at = NOW()
      WHERE id = $1
    `,
    [category.rows[0].id]
  );

  res.json({
    message: "Category deleted successfully",
  });
});