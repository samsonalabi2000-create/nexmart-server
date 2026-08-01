const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");
const AppError  = require("./utils/AppError");
const categoryRoutes = require("./routes/categories");

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ── Paystack webhook needs raw body BEFORE express.json() ─────────────────────
// ── Paystack webhook ─────────────────────────────────────────────────────────
// IMPORTANT: keep the raw body so the Paystack signature can be verified.
app.use(
  "/api/payment/webhook",
  express.raw({ type: "application/json" })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests — please try again later",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    message: "Too many authentication attempts — please try again later",
  },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    message: "Chat rate limit reached — please wait a moment",
  },
});

app.use("/api", globalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/chat", chatLimiter);
app.use("/api/categories", categoryRoutes);

// ── HTTP logging ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/profile",  require("./routes/profile"));
app.use("/api/users",    require("./routes/users"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders",   require("./routes/orders"));
app.use("/api/wishlist", require("./routes/wishlist"));
app.use("/api/admin",    require("./routes/admin"));

// IMPORTANT:
// Your actual file is payment_route.js
app.use("/api/payment", require("./routes/payment_route"));

// AI chatbot
app.use("/api/chat", require("./routes/chat"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
    db: "postgresql",
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404
    )
  );
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err.code === "23505") {
    return res.status(400).json({
      message: "A record with that value already exists",
    });
  }

  if (err.code === "23503") {
    return res.status(400).json({
      message: "Related resource not found",
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  console.error("💥 UNEXPECTED ERROR:", err);

  const message =
    process.env.NODE_ENV === "development"
      ? err.message
      : "Something went wrong";

  res.status(err.statusCode || 500).json({
    message,
  });
});


module.exports = app;