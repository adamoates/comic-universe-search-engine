const express = require("express");
const superHero = require("../services/superHeroService");
const googleBooks = require("../services/googleBooksService");

module.exports = () => {
  const router = express.Router();

  // SuperHero API — power stats and character enrichment by name
  router.get("/api/enrich/character/:name", async (req, res) => {
    const name = req.params.name?.trim();
    if (!name || name.length > 100) {
      return res.status(400).json({ error: "Valid character name is required (max 100 chars)" });
    }
    try {
      const result = await superHero.enrich(name);
      if (!result) return res.status(404).json({ error: "Character not found in SuperHero API" });
      res.json(result);
    } catch (err) {
      console.error("SuperHero enrich error:", err.message);
      res.status(502).json({ error: "Failed to fetch character enrichment" });
    }
  });

  // Google Books — lookup by ISBN
  router.get("/api/enrich/isbn/:isbn", async (req, res) => {
    const isbn = req.params.isbn?.replace(/[^0-9X]/gi, "");
    if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
      return res.status(400).json({ error: "Valid ISBN-10 or ISBN-13 required" });
    }
    try {
      const result = await googleBooks.lookupByISBN(isbn);
      if (!result) return res.status(404).json({ error: "No book found for that ISBN" });
      res.json(result);
    } catch (err) {
      console.error("Google Books ISBN error:", err.message);
      if (err.response?.status === 429) {
        return res.status(429).json({ error: "Google Books rate limit exceeded. Set GOOGLE_BOOKS_API_KEY in .env to increase quota." });
      }
      res.status(502).json({ error: "Failed to fetch book data" });
    }
  });

  // Google Books — search by title (for trade paperbacks / collected editions)
  router.get("/api/enrich/book", async (req, res) => {
    const { title } = req.query;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "title query param is required" });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: "title is too long (max 200 chars)" });
    }
    try {
      const results = await googleBooks.searchByTitle(title.trim());
      res.json({ results });
    } catch (err) {
      console.error("Google Books search error:", err.message);
      if (err.response?.status === 429) {
        return res.status(429).json({ error: "Google Books rate limit exceeded. Set GOOGLE_BOOKS_API_KEY in .env to increase quota." });
      }
      res.status(502).json({ error: "Failed to fetch book data" });
    }
  });

  return router;
};
