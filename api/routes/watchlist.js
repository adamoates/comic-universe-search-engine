const express = require("express");
const prisma = require("../services/db");
const { authenticate } = require("../middleware/auth");

const ALLOWED_ENTITY_TYPES = new Set(["character", "team", "property"]);

module.exports = () => {
  const router = express.Router();

  // All watchlist routes require authentication
  router.use("/api/watchlist", authenticate);

  // List watchlist entries
  router.get("/api/watchlist", async (req, res) => {
    try {
      const where = { userId: req.userId };

      // By default only show active entries; ?all=true shows everything
      if (req.query.all !== "true") {
        where.active = true;
      }

      const entries = await prisma.watchlistEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      res.json({ entries });
    } catch (err) {
      console.error("Watchlist list error:", err.message);
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  // Add a new watchlist entry
  router.post("/api/watchlist", async (req, res) => {
    try {
      const {
        entityType,
        name,
        comicVineId,
        production,
        productionType,
        confidence,
        notes,
        sourceUrl,
      } = req.body;

      if (!entityType || !name) {
        return res
          .status(400)
          .json({ error: "entityType and name are required" });
      }

      if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
        return res.status(400).json({
          error: `Invalid entityType. Allowed: ${[...ALLOWED_ENTITY_TYPES].join(", ")}`,
        });
      }

      const entry = await prisma.watchlistEntry.create({
        data: {
          userId: req.userId,
          entityType,
          name,
          comicVineId: comicVineId != null ? parseInt(comicVineId, 10) : null,
          production: production || null,
          productionType: productionType || null,
          confidence: confidence || "rumored",
          notes: notes || null,
          sourceUrl: sourceUrl || null,
        },
      });

      res.status(201).json({ entry });
    } catch (err) {
      // Handle unique constraint violation
      if (err.code === "P2002") {
        return res.status(409).json({
          error: "A watchlist entry with this comicVineId and entityType already exists",
        });
      }
      console.error("Watchlist add error:", err.message);
      res.status(500).json({ error: "Failed to add watchlist entry" });
    }
  });

  // Update a watchlist entry
  router.put("/api/watchlist/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Verify the entry belongs to this user
      const existing = await prisma.watchlistEntry.findFirst({
        where: { id, userId: req.userId },
      });

      if (!existing) {
        return res.status(404).json({ error: "Watchlist entry not found" });
      }

      const allowedFields = [
        "entityType",
        "name",
        "comicVineId",
        "production",
        "productionType",
        "confidence",
        "notes",
        "sourceUrl",
        "active",
      ];

      const data = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          data[field] = req.body[field];
        }
      }

      // Validate entityType if being updated
      if (data.entityType && !ALLOWED_ENTITY_TYPES.has(data.entityType)) {
        return res.status(400).json({
          error: `Invalid entityType. Allowed: ${[...ALLOWED_ENTITY_TYPES].join(", ")}`,
        });
      }

      const updated = await prisma.watchlistEntry.update({
        where: { id },
        data,
      });

      res.json({ entry: updated });
    } catch (err) {
      console.error("Watchlist update error:", err.message);
      res.status(500).json({ error: "Failed to update watchlist entry" });
    }
  });

  // Delete a watchlist entry
  router.delete("/api/watchlist/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Verify the entry belongs to this user before deleting
      const deleted = await prisma.watchlistEntry.deleteMany({
        where: { id, userId: req.userId },
      });

      if (deleted.count === 0) {
        return res.status(404).json({ error: "Watchlist entry not found" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Watchlist delete error:", err.message);
      res.status(500).json({ error: "Failed to delete watchlist entry" });
    }
  });

  // Find recent scored issues that match the user's watchlist
  router.get("/api/watchlist/hits", async (req, res) => {
    try {
      const entries = await prisma.watchlistEntry.findMany({
        where: { userId: req.userId, active: true },
        select: { id: true, name: true, entityType: true },
      });

      if (entries.length === 0) {
        return res.json({ hits: [], total: 0 });
      }

      // Find recent scored issues with movie/media speculation
      const recentIssues = await prisma.scoredIssue.findMany({
        where: { hasMovieSpec: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      const watchlistNames = entries.map((e) => ({
        id: e.id,
        name: e.name.toLowerCase(),
        entityType: e.entityType,
      }));

      const hits = [];
      for (const issue of recentIssues) {
        if (!issue.movieSpecDetails) continue;

        const details =
          typeof issue.movieSpecDetails === "string"
            ? JSON.parse(issue.movieSpecDetails)
            : issue.movieSpecDetails;
        const detailStr = JSON.stringify(details).toLowerCase();

        const matchedEntries = watchlistNames.filter((entry) =>
          detailStr.includes(entry.name)
        );

        if (matchedEntries.length > 0) {
          hits.push({
            issue,
            matchedWatchlistEntries: matchedEntries.map((m) => ({
              id: m.id,
              name: m.name,
              entityType: m.entityType,
            })),
          });
        }
      }

      res.json({ hits, total: hits.length });
    } catch (err) {
      console.error("Watchlist hits error:", err.message);
      res.status(500).json({ error: "Failed to find watchlist hits" });
    }
  });

  return router;
};
