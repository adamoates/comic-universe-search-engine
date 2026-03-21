const axios = require("axios");
const store = require("./store");

const COMIC_VINE_BASE = "https://comicvine.gamespot.com/api";

function getApiKey() {
  const key = process.env.COMIC_VINE_API_KEY;
  if (!key) throw new Error("COMIC_VINE_API_KEY is not set in .env");
  return key;
}

const apiClient = axios.create({
  baseURL: COMIC_VINE_BASE,
  timeout: 15000,
  headers: { "User-Agent": "ComicUniverseSearchEngine" },
});

async function fetchVolumeIssues(volumeId) {
  const { data } = await apiClient.get(`/volume/4050-${volumeId}/`, {
    params: {
      api_key: getApiKey(),
      format: "json",
      field_list: "issues,name,id",
    },
  });
  return data.results;
}

async function fetchIssueDetail(issueId) {
  const { data } = await apiClient.get(`/issue/4000-${issueId}/`, {
    params: {
      api_key: getApiKey(),
      format: "json",
      field_list:
        "id,name,issue_number,store_date,cover_date,volume,image,deck,description",
    },
  });
  return data.results;
}

async function fetchCharacterIssues(characterId) {
  const { data } = await apiClient.get(`/character/4005-${characterId}/`, {
    params: {
      api_key: getApiKey(),
      format: "json",
      field_list: "issue_credits,name,id",
    },
  });
  return data.results;
}

async function fetchStoryArcIssues(storyArcId) {
  const { data } = await apiClient.get(`/story_arc/4045-${storyArcId}/`, {
    params: {
      api_key: getApiKey(),
      format: "json",
      field_list: "issues,name,id",
    },
  });
  return data.results;
}

async function getUpcomingForTracked(trackedItem) {
  const today = new Date().toISOString().split("T")[0];
  let issues = [];

  try {
    if (trackedItem.resourceType === "volume") {
      const volume = await fetchVolumeIssues(trackedItem.comicVineId);
      issues = (volume.issues || []).slice(-10);
    } else if (trackedItem.resourceType === "character") {
      const character = await fetchCharacterIssues(trackedItem.comicVineId);
      issues = (character.issue_credits || []).slice(-10);
    } else if (trackedItem.resourceType === "story_arc") {
      const arc = await fetchStoryArcIssues(trackedItem.comicVineId);
      issues = (arc.issues || []).slice(-10);
    }
  } catch (err) {
    console.error(
      `Failed to fetch issues for ${trackedItem.resourceType} ${trackedItem.comicVineId}:`,
      err.message
    );
    return [];
  }

  // Fetch details for recent issues to get dates
  const detailed = [];
  for (const issue of issues) {
    try {
      const detail = await fetchIssueDetail(issue.id);
      if (detail) {
        detailed.push(detail);
      }
    } catch (err) {
      // Skip issues we can't fetch
    }
  }

  return detailed
    .filter((d) => d.store_date || d.cover_date)
    .map((d) => ({
      id: d.id,
      name: d.name || d.volume?.name,
      issueNumber: d.issue_number,
      storeDate: d.store_date,
      coverDate: d.cover_date,
      image: d.image,
      deck: d.deck,
      volume: d.volume,
      isUpcoming: (d.store_date || d.cover_date) >= today,
      trackedItemId: trackedItem.id,
      trackedItemName: trackedItem.name,
    }))
    .sort((a, b) => {
      const dateA = a.storeDate || a.coverDate || "";
      const dateB = b.storeDate || b.coverDate || "";
      return dateB.localeCompare(dateA);
    });
}

async function checkForNewReleases() {
  const tracked = store.getTracked();
  const newReleases = [];

  for (const item of tracked) {
    try {
      const issues = await getUpcomingForTracked(item);
      const today = new Date().toISOString().split("T")[0];

      for (const issue of issues) {
        const releaseDate = issue.storeDate || issue.coverDate;

        // Notify about issues releasing today or in the future
        if (releaseDate >= today) {
          const isNew =
            !item.latestKnownIssueId || issue.id !== item.latestKnownIssueId;

          if (isNew) {
            const notification = {
              type: releaseDate === today ? "released_today" : "upcoming",
              title: `${issue.name || issue.volume?.name} #${issue.issueNumber || "?"}`,
              message:
                releaseDate === today
                  ? `New release today from "${item.name}"!`
                  : `Upcoming release on ${releaseDate} from "${item.name}"`,
              resourceType: "issue",
              comicVineId: issue.id,
              releaseDate,
              image: issue.image,
            };
            store.addNotification(notification);
            newReleases.push(notification);
          }
        }
      }

      // Update last checked and latest known issue
      if (issues.length > 0) {
        store.updateTracked(item.id, {
          lastChecked: new Date().toISOString(),
          latestKnownIssueId: issues[0].id,
        });
      } else {
        store.updateTracked(item.id, {
          lastChecked: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`Release check failed for ${item.name}:`, err.message);
    }
  }

  return newReleases;
}

module.exports = {
  checkForNewReleases,
  getUpcomingForTracked,
  fetchIssueDetail,
};
