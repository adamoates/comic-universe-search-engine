require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");

const app = express();
const port = process.env.PORT || 4000;

// Security headers
app.use(helmet());

// CORS – allow configurable origin, default to localhost for dev
const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: allowedOrigin }));

// Rate limiting – 100 requests per 15 minutes per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  })
);

// Body parsing with size limits
app.use(express.urlencoded({ extended: true, limit: "1kb" }));
app.use(express.json({ limit: "1kb" }));

app.use(morgan("tiny"));

app.use("/", routes());

// Global error handler – never leak internals
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Comic Universe Search Engine listening at http://localhost:${port}`);
});
