const express = require("express");
const axios = require("axios");

const router = express.Router();
const COMIC_VINE_BASE = "https://comicvine.gamespot.com/api";

const ALLOWED_RESOURCE_TYPES = new Set([
  "character",
  "issue",
  "volume",
  "story_arc",
]);

function getApiKey() {
  const key = process.env.COMIC_VINE_API_KEY;
  if (!key) throw new Error("COMIC_VINE_API_KEY is not set in .env");
  return key;
}

function isPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

module.exports = () => {
  router.get("/", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Search characters or issues
  router.get("/api/search", async (req, res) => {
    const { query, type = "character", page = 1 } = req.query;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "query is required" });
    }
    if (query.length > 200) {
      return res.status(400).json({ error: "query is too long (max 200 chars)" });
    }
    if (!ALLOWED_RESOURCE_TYPES.has(type)) {
      return res.status(400).json({ error: `Invalid type. Allowed: ${[...ALLOWED_RESOURCE_TYPES].join(", ")}` });
    }
    if (!isPositiveInt(page)) {
      return res.status(400).json({ error: "page must be a positive integer" });
    }

    const limit = 20;
    const pageNum = Number(page);
    const offset = (pageNum - 1) * limit;

    try {
      const { data } = await axios.get(`${COMIC_VINE_BASE}/search/`, {
        params: {
          api_key: getApiKey(),
          format: "json",
          query: query.trim(),
          resources: type,
          limit,
          offset,
        },
        headers: { "User-Agent": "ComicUniverseSearchEngine" },
        timeout: 10000,
      });

      res.json({
        results: data.results,
        total: data.number_of_total_results,
        page: pageNum,
        limit,
      });
    } catch (err) {
      console.error("Comic Vine search error:", err.message);
      res.status(502).json({ error: "Failed to fetch from Comic Vine" });
    }
  });

  // Character detail
  router.get("/api/characters/:id", async (req, res) => {
    if (!isPositiveInt(req.params.id)) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    try {
      const { data } = await axios.get(
        `${COMIC_VINE_BASE}/character/4005-${req.params.id}/`,
        {
          params: { api_key: getApiKey(), format: "json" },
          headers: { "User-Agent": "ComicUniverseSearchEngine" },
          timeout: 10000,
        }
      );
      res.json(data.results);
    } catch (err) {
      console.error("Comic Vine character error:", err.message);
      res.status(502).json({ error: "Failed to fetch character" });
    }
  });

  // Issue/comic detail
  router.get("/api/issues/:id", async (req, res) => {
    if (!isPositiveInt(req.params.id)) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    try {
      const { data } = await axios.get(
        `${COMIC_VINE_BASE}/issue/4000-${req.params.id}/`,
        {
          params: { api_key: getApiKey(), format: "json" },
          headers: { "User-Agent": "ComicUniverseSearchEngine" },
          timeout: 10000,
        }
      );
      res.json(data.results);
    } catch (err) {
      console.error("Comic Vine issue error:", err.message);
      res.status(502).json({ error: "Failed to fetch issue" });
    }
  });

  return router;
};
