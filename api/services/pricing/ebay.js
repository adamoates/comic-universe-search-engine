const axios = require("axios");

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const { data } = await axios.post(
    "https://api.ebay.com/identity/v1/oauth2/token",
    "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      timeout: 10000,
    }
  );

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function searchEbayListings(query, options = {}) {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  let token;
  try {
    token = await getAccessToken();
  } catch (err) {
    console.error("Failed to get eBay access token:", err.message);
    return null;
  }

  if (!token) return null;

  const { limit = 25, condition, sort = "price" } = options;

  const params = {
    q: query,
    category_ids: "63",
    limit,
    sort,
  };

  if (condition) {
    params.filter = `conditionIds:{${condition}}`;
  }

  try {
    const { data } = await axios.get(
      "https://api.ebay.com/buy/browse/v1/item_summary/search",
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
        timeout: 10000,
      }
    );

    const items = data.itemSummaries || [];

    return items.map((item) => ({
      title: item.title,
      price: item.price ? parseFloat(item.price.value) : null,
      date: item.itemEndDate || item.itemCreationDate || null,
      url: item.itemWebUrl,
      condition: item.condition || null,
    }));
  } catch (err) {
    console.error("eBay search failed:", err.message);
    return null;
  }
}

module.exports = { searchEbayListings };
