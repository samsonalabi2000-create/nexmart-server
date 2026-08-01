require("dotenv").config();

const { connectDB } = require("./config/db");
const app           = require("./app");

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log("─────────────────────────────────────────────");
    console.log(`🚀 NexMart API running on port ${PORT}`);
    console.log(`Environment : ${process.env.NODE_ENV}`);
    console.log(`Client URL  : ${process.env.CLIENT_URL || "Not configured"}`);
    console.log(`Database    : PostgreSQL → ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    console.log("─────────────────────────────────────────────");
    console.log(
      `🚀 NexMart API running on ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`
    );
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully`);
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start();
