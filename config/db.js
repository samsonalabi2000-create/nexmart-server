const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "nexmart",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",

  max: isProduction ? 20 : 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  ssl: process.env.DB_HOST?.includes("render.com")
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("error", (err) => {
  console.error("❌ Unexpected PostgreSQL pool error:", err.message);
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log(
      `✅ PostgreSQL connected → ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`
    );
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
    process.exit(1);
  }
};

// Shorthand helpers used throughout the app
const query     = (text, params) => pool.query(text, params);
const getClient = ()             => pool.connect();

module.exports = { connectDB, query, getClient, pool };

// console.log(process.env.DB_PASSWORD);
// console.log(typeof process.env.DB_PASSWORD);
