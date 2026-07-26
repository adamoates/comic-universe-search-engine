require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");
const routes = require("./routes");
const releaseRoutes = require("./routes/releases");
const authRoutes = require("./routes/auth");
const scannerRoutes = require("./routes/scanner");
const watchlistRoutes = require("./routes/watchlist");
const priceRoutes = require("./routes/prices");
const { runWeeklyScan } = require("./services/scanner");

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());

const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: allowedOrigin }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  })
);

app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(express.json({ limit: "10kb" }));

app.use(morgan("tiny"));

app.use("/", routes());
app.use("/", authRoutes());
app.use("/", releaseRoutes());
app.use("/", scannerRoutes());
app.use("/", watchlistRoutes());
app.use("/", priceRoutes());

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// Wednesday at 9 AM ET (14:00 UTC) — new comic book day
cron.schedule("0 14 * * 3", () => {
  const today = new Date().toISOString().split("T")[0];
  console.log(`Running weekly comic scan for ${today}`);
  runWeeklyScan(today).catch((err) =>
    console.error("Weekly scan failed:", err.message)
  );
});

app.listen(port, () => {
  console.log(`Comic Investment Scanner listening at http://localhost:${port}`);
});
