const axios = require("axios");
const crypto = require("crypto");

const MARVEL_BASE = "https://gateway.marvel.com/v1/public";

function getKeys() {
  const pub = process.env.MARVEL_PUBLIC_KEY;
  const priv = process.env.MARVEL_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("MARVEL_PUBLIC_KEY and MARVEL_PRIVATE_KEY must be set in .env");
  return { pub, priv };
}

function authParams() {
  const { pub, priv } = getKeys();
  const ts = Date.now().toString();
  const hash = crypto.createHash("md5").update(ts + priv + pub).digest("hex");
  return { ts, apikey: pub, hash };
}

const client = axios.create({
  baseURL: MARVEL_BASE,
  timeout: 10000,
  headers: { "User-Agent": "ComicUniverseSearchEngine" },
});

function normalizeCharacter(c) {
  return {
    id: c.id,
    name: c.name,
    deck: c.description || null,
    image: c.thumbnail
      ? { small_url: `${c.thumbnail.path}/standard_medium.${c.thumbnail.extension}`,
          medium_url: `${c.thumbnail.path}/portrait_xlarge.${c.thumbnail.extension}` }
      : null,
    publisher: { name: "Marvel" },
    source: "marvel",
  };
}

function normalizeComic(c) {
  const price = c.prices?.find((p) => p.type === "printPrice");
  const creators = (c.creators?.items || []).map((cr) => ({
    name: cr.name,
    role: cr.role,
  }));
  return {
    id: c.id,
    name: c.title,
    issue_number: c.issueNumber ?? null,
    deck: c.description || null,
    image: c.thumbnail
      ? { small_url: `${c.thumbnail.path}/standard_medium.${c.thumbnail.extension}`,
          medium_url: `${c.thumbnail.path}/portrait_xlarge.${c.thumbnail.extension}` }
      : null,
    cover_price: price ? `$${price.price.toFixed(2)}` : null,
    page_count: c.pageCount || null,
    person_credits: creators,
    store_date: c.dates?.find((d) => d.type === "onsaleDate")?.date?.slice(0, 10) || null,
    publisher: { name: "Marvel" },
    source: "marvel",
  };
}

async function searchCharacters(query, page = 1) {
  const limit = 20;
  const offset = (page - 1) * limit;
  const { data } = await client.get("/characters", {
    params: { ...authParams(), nameStartsWith: query, limit, offset },
  });
  return {
    results: (data.data.results || []).map(normalizeCharacter),
    total: data.data.total,
    page,
    limit,
  };
}

async function searchComics(query, page = 1) {
  const limit = 20;
  const offset = (page - 1) * limit;
  const { data } = await client.get("/comics", {
    params: { ...authParams(), titleStartsWith: query, limit, offset },
  });
  return {
    results: (data.data.results || []).map(normalizeComic),
    total: data.data.total,
    page,
    limit,
  };
}

async function searchSeries(query, page = 1) {
  const limit = 20;
  const offset = (page - 1) * limit;
  const { data } = await client.get("/series", {
    params: { ...authParams(), titleStartsWith: query, limit, offset },
  });
  return {
    results: (data.data.results || []).map((s) => ({
      id: s.id,
      name: s.title,
      deck: s.description || null,
      image: s.thumbnail
        ? { small_url: `${s.thumbnail.path}/standard_medium.${s.thumbnail.extension}`,
            medium_url: `${s.thumbnail.path}/portrait_xlarge.${s.thumbnail.extension}` }
        : null,
      publisher: { name: "Marvel" },
      source: "marvel",
    })),
    total: data.data.total,
    page,
    limit,
  };
}

async function getCharacter(id) {
  const { data } = await client.get(`/characters/${id}`, {
    params: authParams(),
  });
  const result = data.data.results[0];
  if (!result) return null;
  return normalizeCharacter(result);
}

async function getComic(id) {
  const { data } = await client.get(`/comics/${id}`, {
    params: authParams(),
  });
  const result = data.data.results[0];
  if (!result) return null;
  return normalizeComic(result);
}

module.exports = { searchCharacters, searchComics, searchSeries, getCharacter, getComic };
