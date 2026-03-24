const express = require("express");
const marvel = require("../services/marvelService");

const ALLOWED_TYPES = new Set(["character", "comic", "series"]);

function isPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

module.exports = () => {
  const router = express.Router();

  // Search Marvel characters, comics, or series
  router.get("/api/marvel/search", async (req, res) => {
    const { query, type = "character", page = 1 } = req.query;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "query is required" });
    }
    if (query.length > 200) {
      return res.status(400).json({ error: "query is too long (max 200 chars)" });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ error: `Invalid type. Allowed: ${[...ALLOWED_TYPES].join(", ")}` });
    }
    if (!isPositiveInt(page)) {
      return res.status(400).json({ error: "page must be a positive integer" });
    }

    if (!process.env.MARVEL_PUBLIC_KEY || !process.env.MARVEL_PRIVATE_KEY) {
      return res.status(503).json({ error: "Marvel API keys not configured" });
    }

    try {
      const pageNum = Number(page);
      let result;
      if (type === "character") result = await marvel.searchCharacters(query.trim(), pageNum);
      else if (type === "comic")  result = await marvel.searchComics(query.trim(), pageNum);
      else                        result = await marvel.searchSeries(query.trim(), pageNum);
      res.json(result);
    } catch (err) {
      console.error("Marvel search error:", err.message);
      res.status(502).json({ error: "Failed to fetch from Marvel API" });
    }
  });

  // Marvel character detail
  router.get("/api/marvel/characters/:id", async (req, res) => {
    if (!isPositiveInt(req.params.id)) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }
    if (!process.env.MARVEL_PUBLIC_KEY || !process.env.MARVEL_PRIVATE_KEY) {
      return res.status(503).json({ error: "Marvel API keys not configured" });
    }
    try {
      const result = await marvel.getCharacter(req.params.id);
      if (!result) return res.status(404).json({ error: "Character not found" });
      res.json(result);
    } catch (err) {
      console.error("Marvel character error:", err.message);
      res.status(502).json({ error: "Failed to fetch Marvel character" });
    }
  });

  // Marvel comic detail
  router.get("/api/marvel/comics/:id", async (req, res) => {
    if (!isPositiveInt(req.params.id)) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }
    if (!process.env.MARVEL_PUBLIC_KEY || !process.env.MARVEL_PRIVATE_KEY) {
      return res.status(503).json({ error: "Marvel API keys not configured" });
    }
    try {
      const result = await marvel.getComic(req.params.id);
      if (!result) return res.status(404).json({ error: "Comic not found" });
      res.json(result);
    } catch (err) {
      console.error("Marvel comic error:", err.message);
      res.status(502).json({ error: "Failed to fetch Marvel comic" });
    }
  });

  return router;
};
