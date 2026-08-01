const { query } = require("../config/db");

const getCategories = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT DISTINCT
        category,
        category_name
      FROM products
      WHERE is_active = TRUE
      ORDER BY category_name
    `);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCategories,
};