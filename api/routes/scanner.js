const express = require("express");
const prisma = require("../services/db");
const { authenticate, optionalAuth } = require("../middleware/auth");
const { runWeeklyScan } = require("../services/scanner");
const { getPriceData } = require("../services/pricing/aggregator");

/**
 * Returns the "this week's" Wednesday date. Comic books are traditionally
 * released on Wednesdays. If today is before Wednesday, we look at the
 * previous Wednesday. If today is Wednesday or later, we use this Wednesday.
 */
function getThisWeeksWednesday() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, ...
  const diff = day >= 3 ? day - 3 : day + 4; // days since last Wednesday
  const wed = new Date(now);
  wed.setUTCDate(wed.getUTCDate() - diff);
  wed.setUTCHours(0, 0, 0, 0);
  return wed;
}

/**
 * Build a Prisma where clause for scored issues based on query params.
 */
function buildIssueFilter(query) {
  const where = {};

  if (query.minScore) {
    const min = parseInt(query.minScore, 10);
    if (!isNaN(min)) {
      where.totalScore = { gte: min };
    }
  }

  if (query.publisher) {
    where.publisher = query.publisher;
  }

  if (query.signal) {
    const signalMap = {
      firstAppearance: "hasFirstAppearance",
      issueOne: "isIssueOne",
      keyCreator: "hasKeyCreator",
      movieSpec: "hasMovieSpec",
      death: "hasDeathIssue",
      storyArc: "hasStoryArcSignificance",
    };
    const field = signalMap[query.signal];
    if (field) {
      where[field] = true;
    }
  }

  return where;
}

module.exports = () => {
  const router = express.Router();

  // Get scored issues for this week's release date
  router.get("/api/scanner/this-week", optionalAuth, async (req, res) => {
    try {
      const wednesday = getThisWeeksWednesday();

      const scan = await prisma.weeklyScan.findUnique({
        where: { storeDate: wednesday },
      });

      if (!scan) {
        return res.json({ storeDate: wednesday.toISOString().slice(0, 10), issues: [], total: 0 });
      }

      const issueFilter = buildIssueFilter(req.query);
      issueFilter.weeklyScanId = scan.id;

      const issues = await prisma.scoredIssue.findMany({
        where: issueFilter,
        orderBy: { totalScore: "desc" },
      });

      let watchlistNames = [];
      if (req.userId) {
        const entries = await prisma.watchlistEntry.findMany({
          where: { userId: req.userId, active: true },
          select: { name: true, entityType: true },
        });
        watchlistNames = entries.map((e) => e.name.toLowerCase());
      }

      const result = issues.map((issue) => {
        const item = { ...issue };
        if (req.userId && watchlistNames.length > 0) {
          item.watchlistMatch = false;
          // Check movieSpecDetails for watchlist matches
          if (issue.movieSpecDetails) {
            const details =
              typeof issue.movieSpecDetails === "string"
                ? JSON.parse(issue.movieSpecDetails)
                : issue.movieSpecDetails;
            const detailStr = JSON.stringify(details).toLowerCase();
            item.watchlistMatch = watchlistNames.some((name) =>
              detailStr.includes(name)
            );
          }
          // Check characterCredits for watchlist matches
          if (!item.watchlistMatch && issue.characterCredits) {
            const credits =
              typeof issue.characterCredits === "string"
                ? JSON.parse(issue.characterCredits)
                : issue.characterCredits;
            const creditsStr = JSON.stringify(credits).toLowerCase();
            item.watchlistMatch = watchlistNames.some((name) =>
              creditsStr.includes(name)
            );
          }
        }
        return item;
      });

      res.json({
        storeDate: wednesday.toISOString().slice(0, 10),
        scanStatus: scan.status,
        issues: result,
        total: result.length,
      });
    } catch (err) {
      console.error("Scanner this-week error:", err.message);
      res.status(500).json({ error: "Failed to fetch this week's scan" });
    }
  });

  // Get scored issues for a specific week
  router.get("/api/scanner/week/:date", optionalAuth, async (req, res) => {
    try {
      const dateStr = req.params.date;
      const date = new Date(dateStr + "T00:00:00.000Z");

      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      const scan = await prisma.weeklyScan.findUnique({
        where: { storeDate: date },
      });

      if (!scan) {
        return res.json({ storeDate: dateStr, issues: [], total: 0 });
      }

      const issueFilter = buildIssueFilter(req.query);
      issueFilter.weeklyScanId = scan.id;

      const issues = await prisma.scoredIssue.findMany({
        where: issueFilter,
        orderBy: { totalScore: "desc" },
      });

      let watchlistNames = [];
      if (req.userId) {
        const entries = await prisma.watchlistEntry.findMany({
          where: { userId: req.userId, active: true },
          select: { name: true, entityType: true },
        });
        watchlistNames = entries.map((e) => e.name.toLowerCase());
      }

      const result = issues.map((issue) => {
        const item = { ...issue };
        if (req.userId && watchlistNames.length > 0) {
          item.watchlistMatch = false;
          if (issue.movieSpecDetails) {
            const details =
              typeof issue.movieSpecDetails === "string"
                ? JSON.parse(issue.movieSpecDetails)
                : issue.movieSpecDetails;
            const detailStr = JSON.stringify(details).toLowerCase();
            item.watchlistMatch = watchlistNames.some((name) =>
              detailStr.includes(name)
            );
          }
          if (!item.watchlistMatch && issue.characterCredits) {
            const credits =
              typeof issue.characterCredits === "string"
                ? JSON.parse(issue.characterCredits)
                : issue.characterCredits;
            const creditsStr = JSON.stringify(credits).toLowerCase();
            item.watchlistMatch = watchlistNames.some((name) =>
              creditsStr.includes(name)
            );
          }
        }
        return item;
      });

      res.json({
        storeDate: dateStr,
        scanStatus: scan.status,
        issues: result,
        total: result.length,
      });
    } catch (err) {
      console.error("Scanner week error:", err.message);
      res.status(500).json({ error: "Failed to fetch scan for the given week" });
    }
  });

  // Trigger a new weekly scan (authenticated)
  router.post("/api/scanner/run", authenticate, async (req, res) => {
    try {
      const results = await runWeeklyScan();
      res.json(results);
    } catch (err) {
      console.error("Scanner run error:", err.message);
      res.status(500).json({ error: "Failed to run weekly scan" });
    }
  });

  // Get full detail for a scored issue including price data
  router.get("/api/scanner/issue/:comicVineId", optionalAuth, async (req, res) => {
    try {
      const comicVineId = parseInt(req.params.comicVineId, 10);
      if (isNaN(comicVineId)) {
        return res.status(400).json({ error: "comicVineId must be a number" });
      }

      const issue = await prisma.scoredIssue.findUnique({
        where: { comicVineId },
        include: { priceData: { orderBy: { fetchedAt: "desc" } } },
      });

      if (!issue) {
        return res.status(404).json({ error: "Scored issue not found" });
      }

      let watchlistMatch = false;
      if (req.userId) {
        const entries = await prisma.watchlistEntry.findMany({
          where: { userId: req.userId, active: true },
          select: { name: true },
        });
        const names = entries.map((e) => e.name.toLowerCase());
        if (names.length > 0 && issue.movieSpecDetails) {
          const details =
            typeof issue.movieSpecDetails === "string"
              ? JSON.parse(issue.movieSpecDetails)
              : issue.movieSpecDetails;
          const detailStr = JSON.stringify(details).toLowerCase();
          watchlistMatch = names.some((name) => detailStr.includes(name));
        }
      }

      res.json({ issue, watchlistMatch });
    } catch (err) {
      console.error("Scanner issue detail error:", err.message);
      res.status(500).json({ error: "Failed to fetch issue detail" });
    }
  });

  return router;
};
