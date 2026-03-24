const axios = require("axios");

const BASE = "https://www.googleapis.com/books/v1";

function getApiKey() {
  return process.env.GOOGLE_BOOKS_API_KEY || null;
}

const client = axios.create({
  baseURL: BASE,
  timeout: 8000,
  headers: { "User-Agent": "ComicUniverseSearchEngine" },
});

// Simple retry for 429 rate limiting (up to 2 retries, 1s then 2s delay)
async function getWithRetry(path, params, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await client.get(path, { params });
    } catch (err) {
      const status = err.response?.status;
      if (status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

function normalize(item) {
  const info = item.volumeInfo || {};
  const sale = item.saleInfo || {};
  return {
    googleId: item.id,
    title: info.title || null,
    authors: info.authors || [],
    publisher: info.publisher || null,
    publishedDate: info.publishedDate || null,
    pageCount: info.pageCount || null,
    categories: info.categories || [],
    isbn: (info.industryIdentifiers || []).reduce((acc, i) => {
      acc[i.type.toLowerCase().replace("-", "_")] = i.identifier;
      return acc;
    }, {}),
    listPrice: sale.listPrice
      ? { amount: sale.listPrice.amount, currency: sale.listPrice.currencyCode }
      : null,
    retailPrice: sale.retailPrice
      ? { amount: sale.retailPrice.amount, currency: sale.retailPrice.currencyCode }
      : null,
    previewLink: info.previewLink || null,
    thumbnail: info.imageLinks?.thumbnail || null,
  };
}

async function searchByTitle(query) {
  const params = { q: `${query}+comics`, maxResults: 10, printType: "books" };
  if (getApiKey()) params.key = getApiKey();
  const { data } = await getWithRetry("/volumes", params);
  return (data.items || []).map(normalize);
}

async function lookupByISBN(isbn) {
  const params = { q: `isbn:${isbn}`, maxResults: 1 };
  if (getApiKey()) params.key = getApiKey();
  const { data } = await getWithRetry("/volumes", params);
  const items = data.items || [];
  return items.length ? normalize(items[0]) : null;
}

module.exports = { searchByTitle, lookupByISBN };
