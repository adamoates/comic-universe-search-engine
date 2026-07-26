const prisma = require("../db");
const { searchEbayListings } = require("./ebay");

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function computeStats(listings) {
  const prices = listings
    .map((l) => l.price)
    .filter((p) => typeof p === "number" && p > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return { averagePrice: null, medianPrice: null, lowPrice: null, highPrice: null, sampleSize: 0 };
  }

  const mid = Math.floor(prices.length / 2);
  const rawMedian = prices.length % 2 === 0
    ? (prices[mid - 1] + prices[mid]) / 2
    : prices[mid];

  const outlierThreshold = rawMedian * 3;
  const filtered = prices.filter((p) => p <= outlierThreshold);

  if (filtered.length === 0) {
    return { averagePrice: null, medianPrice: null, lowPrice: null, highPrice: null, sampleSize: 0 };
  }

  const filteredMid = Math.floor(filtered.length / 2);
  const medianPrice = filtered.length % 2 === 0
    ? (filtered[filteredMid - 1] + filtered[filteredMid]) / 2
    : filtered[filteredMid];

  const sum = filtered.reduce((acc, p) => acc + p, 0);
  const averagePrice = sum / filtered.length;

  return {
    averagePrice: Math.round(averagePrice * 100) / 100,
    medianPrice: Math.round(medianPrice * 100) / 100,
    lowPrice: filtered[0],
    highPrice: filtered[filtered.length - 1],
    sampleSize: filtered.length,
  };
}

async function getPriceData(scoredIssueId, volumeName, issueNumber) {
  const existing = await prisma.priceData.findFirst({
    where: {
      scoredIssueId,
      fetchedAt: { gte: new Date(Date.now() - CACHE_TTL_MS) },
    },
    orderBy: { fetchedAt: "desc" },
  });

  if (existing) {
    return existing;
  }

  const searchQuery = `${volumeName} #${issueNumber}`;
  const listings = await searchEbayListings(searchQuery);

  if (!listings) {
    return null;
  }

  const stats = computeStats(listings);

  const priceData = await prisma.priceData.create({
    data: {
      scoredIssueId,
      source: "ebay",
      searchQuery,
      averagePrice: stats.averagePrice,
      medianPrice: stats.medianPrice,
      lowPrice: stats.lowPrice,
      highPrice: stats.highPrice,
      sampleSize: stats.sampleSize,
      rawListings: listings,
    },
  });

  return priceData;
}

module.exports = { getPriceData };
