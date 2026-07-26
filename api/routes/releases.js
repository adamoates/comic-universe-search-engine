const express = require("express");
const prisma = require("../services/db");
const { authenticate } = require("../middleware/auth");
const { checkForNewReleases, getUpcomingForTracked } = require("../services/releaseChecker");

const ALLOWED_TRACK_TYPES = new Set(["volume", "character", "story_arc"]);

module.exports = () => {
  const router = express.Router();

  // All release routes require authentication
  router.use("/api/releases", authenticate);

  // Get all tracked items for the authenticated user
  router.get("/api/releases/tracked", async (req, res) => {
    try {
      const tracked = await prisma.trackedItem.findMany({
        where: { userId: req.userId },
      });
      res.json({ tracked });
    } catch (err) {
      console.error("Tracked items fetch error:", err.message);
      res.status(500).json({ error: "Failed to fetch tracked items" });
    }
  });

  // Track a series, character, or story arc
  router.post("/api/releases/track", async (req, res) => {
    try {
      const { comicVineId, resourceType, name, imageUrl, publisher } = req.body;

      if (!comicVineId || !resourceType || !name) {
        return res
          .status(400)
          .json({ error: "comicVineId, resourceType, and name are required" });
      }
      if (!ALLOWED_TRACK_TYPES.has(resourceType)) {
        return res.status(400).json({
          error: `Invalid resourceType. Allowed: ${[...ALLOWED_TRACK_TYPES].join(", ")}`,
        });
      }

      const entry = await prisma.trackedItem.upsert({
        where: {
          userId_comicVineId_resourceType: {
            userId: req.userId,
            comicVineId: String(comicVineId),
            resourceType,
          },
        },
        update: {
          name,
          imageUrl: imageUrl || null,
          publisher: publisher || null,
        },
        create: {
          userId: req.userId,
          comicVineId: String(comicVineId),
          resourceType,
          name,
          imageUrl: imageUrl || null,
          publisher: publisher || null,
        },
      });

      res.status(201).json(entry);
    } catch (err) {
      console.error("Track item error:", err.message);
      res.status(500).json({ error: "Failed to track item" });
    }
  });

  // Untrack an item
  router.delete("/api/releases/track/:id", async (req, res) => {
    try {
      const deleted = await prisma.trackedItem.deleteMany({
        where: { id: req.params.id, userId: req.userId },
      });

      if (deleted.count === 0) {
        return res.status(404).json({ error: "Tracked item not found" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Untrack item error:", err.message);
      res.status(500).json({ error: "Failed to untrack item" });
    }
  });

  // Get upcoming releases for all tracked items
  router.get("/api/releases/upcoming", async (req, res) => {
    try {
      const tracked = await prisma.trackedItem.findMany({
        where: { userId: req.userId },
      });

      const allUpcoming = [];

      for (const item of tracked) {
        try {
          const issues = await getUpcomingForTracked(item);
          allUpcoming.push(...issues);
        } catch (err) {
          console.error(`Failed to get upcoming for ${item.name}:`, err.message);
        }
      }

      // Sort by date descending (newest first)
      allUpcoming.sort((a, b) => {
        const dateA = a.storeDate || a.coverDate || "";
        const dateB = b.storeDate || b.coverDate || "";
        return dateB.localeCompare(dateA);
      });

      res.json({ releases: allUpcoming });
    } catch (err) {
      console.error("Upcoming releases error:", err.message);
      res.status(500).json({ error: "Failed to fetch upcoming releases" });
    }
  });

  // Manually trigger release check
  router.post("/api/releases/check", async (req, res) => {
    try {
      const newReleases = await checkForNewReleases();
      const tracked = await prisma.trackedItem.findMany({
        where: { userId: req.userId },
      });
      res.json({
        checked: tracked.length,
        newReleases: newReleases.length,
        releases: newReleases,
      });
    } catch (err) {
      console.error("Release check error:", err.message);
      res.status(500).json({ error: "Failed to check for new releases" });
    }
  });

  // Get notifications for the authenticated user
  router.get("/api/releases/notifications", async (req, res) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      const unread = notifications.filter((n) => !n.read).length;
      res.json({ notifications, unread });
    } catch (err) {
      console.error("Notifications fetch error:", err.message);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark a notification as read
  router.put("/api/releases/notifications/:id/read", async (req, res) => {
    try {
      const result = await prisma.notification.updateMany({
        where: { id: req.params.id, userId: req.userId },
        data: { read: true },
      });

      if (result.count === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Mark notification read error:", err.message);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  router.put("/api/releases/notifications/read-all", async (req, res) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.userId, read: false },
        data: { read: true },
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Mark all notifications read error:", err.message);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  return router;
};
