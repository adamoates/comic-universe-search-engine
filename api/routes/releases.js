const express = require("express");
const store = require("../services/store");
const { checkForNewReleases, getUpcomingForTracked } = require("../services/releaseChecker");

const ALLOWED_TRACK_TYPES = new Set(["volume", "character", "story_arc"]);

module.exports = () => {
  const router = express.Router();

  // Get all tracked items
  router.get("/api/releases/tracked", (_req, res) => {
    res.json({ tracked: store.getTracked() });
  });

  // Track a series, character, or story arc
  router.post("/api/releases/track", (req, res) => {
    const { comicVineId, resourceType, name, image, publisher } = req.body;

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

    const entry = store.addTracked({
      comicVineId: String(comicVineId),
      resourceType,
      name,
      image: image || null,
      publisher: publisher || null,
    });

    res.status(201).json(entry);
  });

  // Untrack an item
  router.delete("/api/releases/track/:id", (req, res) => {
    const removed = store.removeTracked(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: "Tracked item not found" });
    }
    res.json({ success: true });
  });

  // Get upcoming releases for all tracked items
  router.get("/api/releases/upcoming", async (_req, res) => {
    const tracked = store.getTracked();
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
  });

  // Manually trigger release check
  router.post("/api/releases/check", async (_req, res) => {
    try {
      const newReleases = await checkForNewReleases();
      res.json({
        checked: store.getTracked().length,
        newReleases: newReleases.length,
        releases: newReleases,
      });
    } catch (err) {
      console.error("Release check error:", err.message);
      res.status(500).json({ error: "Failed to check for new releases" });
    }
  });

  // Get notifications
  router.get("/api/releases/notifications", (_req, res) => {
    const notifications = store.getNotifications();
    const unread = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unread });
  });

  // Mark a notification as read
  router.put("/api/releases/notifications/:id/read", (req, res) => {
    const success = store.markNotificationRead(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json({ success: true });
  });

  // Mark all notifications as read
  router.put("/api/releases/notifications/read-all", (_req, res) => {
    store.markAllNotificationsRead();
    res.json({ success: true });
  });

  return router;
};
