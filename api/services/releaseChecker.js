const axios = require("axios");
const prisma = require("./db");

const COMIC_VINE_BASE = "https://comicvine.gamespot.com/api";

const ISSUE_FIELDS = [
  "id", "name", "issue_number", "store_date", "cover_date",
  "volume", "image", "deck", "description",
  "first_appearance_characters", "first_appearance_teams",
  "first_appearance_concepts", "first_appearance_locations",
  "first_appearance_objects",
  "character_credits", "person_credits", "story_arc_credits",
  "character_died_in",
].join(",");

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      field_list: ISSUE_FIELDS,
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

async function fetchIssuesByStoreDate(dateString, delayMs = 1000) {
  const allIssues = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data } = await apiClient.get("/issues/", {
      params: {
        api_key: getApiKey(),
        format: "json",
        field_list: ISSUE_FIELDS,
        filter: `store_date:${dateString}`,
        limit,
        offset,
        sort: "id:asc",
      },
    });

    const results = data.results || [];
    allIssues.push(...results);

    if (results.length < limit || allIssues.length >= data.number_of_total_results) {
      break;
    }

    offset += limit;
    await sleep(delayMs);
  }

  return allIssues;
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

async function checkForNewReleases(userId) {
  const tracked = await prisma.trackedItem.findMany({
    where: { userId },
  });
  const newReleases = [];

  for (const item of tracked) {
    try {
      const issues = await getUpcomingForTracked(item);
      const today = new Date().toISOString().split("T")[0];

      for (const issue of issues) {
        const releaseDate = issue.storeDate || issue.coverDate;

        if (releaseDate >= today) {
          const isNew =
            !item.latestKnownIssueId || String(issue.id) !== item.latestKnownIssueId;

          if (isNew) {
            const notification = await prisma.notification.create({
              data: {
                userId,
                type: releaseDate === today ? "released_today" : "upcoming",
                title: `${issue.name || issue.volume?.name} #${issue.issueNumber || "?"}`,
                message:
                  releaseDate === today
                    ? `New release today from "${item.name}"!`
                    : `Upcoming release on ${releaseDate} from "${item.name}"`,
                imageUrl: issue.image?.small_url || null,
              },
            });
            newReleases.push(notification);
          }
        }
      }

      await prisma.trackedItem.update({
        where: { id: item.id },
        data: {
          lastChecked: new Date(),
          ...(issues.length > 0 && {
            latestKnownIssueId: String(issues[0].id),
          }),
        },
      });
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
  fetchIssuesByStoreDate,
};
