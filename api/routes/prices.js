const express = require("express");
const prisma = require("../services/db");
const { getPriceData } = require("../services/pricing/aggregator");

/** How long (in hours) before price data is considered stale. */
const STALE_HOURS = 24;

function isPriceDataStale(fetchedAt) {
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  return ageMs > STALE_HOURS * 60 * 60 * 1000;
}

function formatPriceResponse(priceRecords) {
  if (!priceRecords || priceRecords.length === 0) {
    return null;
  }

  // Use the most recent price record
  const latest = priceRecords[0];

  return {
    average: latest.averagePrice,
    median: latest.medianPrice,
    low: latest.lowPrice,
    high: latest.highPrice,
    sampleSize: latest.sampleSize,
    listings: latest.rawListings,
    fetchedAt: latest.fetchedAt,
    source: latest.source,
  };
}

module.exports = () => {
  const router = express.Router();

  // Get price data for a scored issue
  router.get("/api/prices/:comicVineId", async (req, res) => {
    try {
      const comicVineId = parseInt(req.params.comicVineId, 10);
      if (isNaN(comicVineId)) {
        return res.status(400).json({ error: "comicVineId must be a number" });
      }

      const issue = await prisma.scoredIssue.findUnique({
        where: { comicVineId },
        include: { priceData: { orderBy: { fetchedAt: "desc" }, take: 1 } },
      });

      if (!issue) {
        return res.status(404).json({ error: "Scored issue not found" });
      }

      // If price data is missing or stale, fetch fresh data
      const latestPrice = issue.priceData[0];
      if (!latestPrice || isPriceDataStale(latestPrice.fetchedAt)) {
        try {
          const freshData = await getPriceData(issue);
          return res.json({ prices: freshData });
        } catch (priceErr) {
          console.error("Price fetch error:", priceErr.message);
          // Fall through to return stale data if available
          if (latestPrice) {
            return res.json({
              prices: formatPriceResponse(issue.priceData),
              stale: true,
            });
          }
          return res.json({ prices: null });
        }
      }

      res.json({ prices: formatPriceResponse(issue.priceData) });
    } catch (err) {
      console.error("Price lookup error:", err.message);
      res.status(500).json({ error: "Failed to fetch price data" });
    }
  });

  // Force refresh price data for a scored issue
  router.post("/api/prices/:comicVineId/refresh", async (req, res) => {
    try {
      const comicVineId = parseInt(req.params.comicVineId, 10);
      if (isNaN(comicVineId)) {
        return res.status(400).json({ error: "comicVineId must be a number" });
      }

      const issue = await prisma.scoredIssue.findUnique({
        where: { comicVineId },
      });

      if (!issue) {
        return res.status(404).json({ error: "Scored issue not found" });
      }

      const freshData = await getPriceData(issue);
      res.json({ prices: freshData });
    } catch (err) {
      console.error("Price refresh error:", err.message);
      res.status(500).json({ error: "Failed to refresh price data" });
    }
  });

  return router;
};
