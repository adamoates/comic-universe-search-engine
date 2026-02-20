const express = require("express");
const axios = require("axios");

const router = express.Router();
const COMIC_VINE_BASE = "https://comicvine.gamespot.com/api";

function getApiKey() {
  const key = process.env.COMIC_VINE_API_KEY;
  if (!key) throw new Error("COMIC_VINE_API_KEY is not set in .env");
  return key;
}

module.exports = () => {
  router.get("/", (req, res) => {
    res.send("<h1>Comic Universe Search Engine API</h1>");
  });

  // Search characters or issues
  router.get("/api/search", async (req, res) => {
    const { query, type = "character", page = 1 } = req.query;
    if (!query) return res.status(400).json({ error: "query is required" });

    const limit = 20;
    const offset = (page - 1) * limit;

    try {
      const { data } = await axios.get(`${COMIC_VINE_BASE}/search/`, {
        params: {
          api_key: getApiKey(),
          format: "json",
          query,
          resources: type,
          limit,
          offset,
        },
        headers: { "User-Agent": "MarvelSearchEngine" },
      });

      res.json({
        results: data.results,
        total: data.number_of_total_results,
        page: Number(page),
        limit,
      });
    } catch (err) {
      console.error("Comic Vine search error:", err.message);
      res.status(502).json({ error: "Failed to fetch from Comic Vine" });
    }
  });

  // Character detail
  router.get("/api/characters/:id", async (req, res) => {
    try {
      const { data } = await axios.get(
        `${COMIC_VINE_BASE}/character/4005-${req.params.id}/`,
        {
          params: { api_key: getApiKey(), format: "json" },
          headers: { "User-Agent": "MarvelSearchEngine" },
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
    try {
      const { data } = await axios.get(
        `${COMIC_VINE_BASE}/issue/4000-${req.params.id}/`,
        {
          params: { api_key: getApiKey(), format: "json" },
          headers: { "User-Agent": "MarvelSearchEngine" },
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
