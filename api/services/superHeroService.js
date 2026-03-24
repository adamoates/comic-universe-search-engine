const axios = require("axios");

// akabab SuperHero API — no API key required, MIT-licensed data
const BASE = "https://akabab.github.io/superhero-api/api";

const client = axios.create({
  timeout: 8000,
  headers: { "User-Agent": "ComicUniverseSearchEngine" },
});

// In-memory cache of all heroes (loaded once)
let heroesCache = null;

async function getAllHeroes() {
  if (heroesCache) return heroesCache;
  const { data } = await client.get(`${BASE}/all.json`);
  heroesCache = data;
  return heroesCache;
}

async function searchByName(name) {
  const all = await getAllHeroes();
  const q = name.toLowerCase();
  return all.filter(
    (h) =>
      h.name.toLowerCase().includes(q) ||
      (h.biography?.fullName || "").toLowerCase().includes(q)
  );
}

async function getById(id) {
  const { data } = await client.get(`${BASE}/id/${id}.json`);
  return data;
}

// Returns the first matching hero's enrichment data, or null
async function enrich(name) {
  const results = await searchByName(name);
  if (!results.length) return null;
  const hero = results[0];
  return {
    id: hero.id,
    name: hero.name,
    powerstats: hero.powerstats,
    appearance: hero.appearance,
    biography: hero.biography,
    connections: hero.connections,
    image: hero.images,
  };
}

module.exports = { searchByName, getById, enrich };
