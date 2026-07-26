const prisma = require("./db");
const { scoreIssue } = require("./scoring/engine");
const { fetchIssuesByStoreDate } = require("./releaseChecker");

function getNextWednesday(from = new Date()) {
  const date = new Date(from);
  const day = date.getDay();
  const daysUntilWednesday = (3 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilWednesday);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function runWeeklyScan(targetDate) {
  const storeDate = typeof targetDate === "string"
    ? new Date(targetDate + "T00:00:00Z")
    : targetDate;

  const storeDateStr = storeDate.toISOString().split("T")[0];

  const scan = await prisma.weeklyScan.create({
    data: {
      storeDate,
      status: "RUNNING",
    },
  });

  try {
    const issues = await fetchIssuesByStoreDate(storeDateStr);

    const [hotCreators, watchlistEntries] = await Promise.all([
      prisma.hotCreator.findMany({ where: { active: true } }),
      prisma.watchlistEntry.findMany({ where: { active: true } }),
    ]);

    const context = {
      hotCreators: hotCreators.map((hc) => ({
        name: hc.name,
        comicVineId: hc.comicVineId,
        tier: hc.tier,
      })),
      watchlistEntries: watchlistEntries.map((we) => ({
        name: we.name,
        comicVineId: we.comicVineId,
        production: we.production,
        confidence: we.confidence,
      })),
    };

    let flaggedCount = 0;
    const topIssues = [];

    for (const issue of issues) {
      const result = await scoreIssue(issue, context);

      const scoredIssue = await prisma.scoredIssue.upsert({
        where: { comicVineId: issue.id },
        create: {
          comicVineId: issue.id,
          name: issue.name || null,
          issueNumber: issue.issue_number || null,
          volumeName: issue.volume?.name || null,
          volumeId: issue.volume?.id || null,
          publisher: issue.publisher?.name || null,
          storeDate,
          coverDate: issue.cover_date ? new Date(issue.cover_date + "T00:00:00Z") : null,
          imageUrl: issue.image?.original_url || issue.image?.medium_url || null,
          thumbnailUrl: issue.image?.thumb_url || null,
          deck: issue.deck || null,
          totalScore: result.totalScore,
          scoreBreakdown: result.breakdown,
          hasFirstAppearance: result.flags.hasFirstAppearance,
          firstAppearanceDetails: result.flags.hasFirstAppearance ? {
            characters: result.signals.firstAppearanceCharacters,
            teams: result.signals.firstAppearanceTeams,
          } : undefined,
          isIssueOne: result.flags.isIssueOne,
          hasKeyCreator: result.flags.hasKeyCreator,
          keyCreatorDetails: result.flags.hasKeyCreator ? result.signals.keyCreators : undefined,
          hasMovieSpec: result.flags.hasMovieSpec,
          movieSpecDetails: result.flags.hasMovieSpec ? result.signals.movieSpecMatches : undefined,
          hasDeathIssue: result.flags.hasDeathIssue,
          deathDetails: result.flags.hasDeathIssue ? result.signals.deaths : undefined,
          hasStoryArcSignificance: result.flags.hasStoryArcSignificance,
          storyArcDetails: result.flags.hasStoryArcSignificance ? result.signals.storyArcs : undefined,
          characterCredits: issue.character_credits || null,
          personCredits: issue.person_credits || null,
          storyArcCredits: issue.story_arc_credits || null,
          weeklyScanId: scan.id,
        },
        update: {
          totalScore: result.totalScore,
          scoreBreakdown: result.breakdown,
          hasFirstAppearance: result.flags.hasFirstAppearance,
          firstAppearanceDetails: result.flags.hasFirstAppearance ? {
            characters: result.signals.firstAppearanceCharacters,
            teams: result.signals.firstAppearanceTeams,
          } : undefined,
          isIssueOne: result.flags.isIssueOne,
          hasKeyCreator: result.flags.hasKeyCreator,
          keyCreatorDetails: result.flags.hasKeyCreator ? result.signals.keyCreators : undefined,
          hasMovieSpec: result.flags.hasMovieSpec,
          movieSpecDetails: result.flags.hasMovieSpec ? result.signals.movieSpecMatches : undefined,
          hasDeathIssue: result.flags.hasDeathIssue,
          deathDetails: result.flags.hasDeathIssue ? result.signals.deaths : undefined,
          hasStoryArcSignificance: result.flags.hasStoryArcSignificance,
          storyArcDetails: result.flags.hasStoryArcSignificance ? result.signals.storyArcs : undefined,
          characterCredits: issue.character_credits || null,
          personCredits: issue.person_credits || null,
          storyArcCredits: issue.story_arc_credits || null,
          weeklyScanId: scan.id,
          updatedAt: new Date(),
        },
      });

      if (result.totalScore > 0) {
        flaggedCount++;
        topIssues.push({ scoredIssue, score: result.totalScore, signals: result.signals });
      }
    }

    topIssues.sort((a, b) => b.score - a.score);

    await generateNotifications(topIssues, scan.id);

    await prisma.weeklyScan.update({
      where: { id: scan.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        totalIssues: issues.length,
        flaggedCount,
      },
    });

    return {
      totalIssues: issues.length,
      flaggedCount,
      topIssues: topIssues.slice(0, 20).map((t) => ({
        id: t.scoredIssue.id,
        name: t.scoredIssue.volumeName
          ? `${t.scoredIssue.volumeName} #${t.scoredIssue.issueNumber}`
          : t.scoredIssue.name,
        score: t.score,
        signals: t.signals,
      })),
    };
  } catch (err) {
    await prisma.weeklyScan.update({
      where: { id: scan.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

async function generateNotifications(topIssues, scanId) {
  const users = await prisma.user.findMany({
    include: { scanPreference: true },
  });

  for (const user of users) {
    const prefs = user.scanPreference;
    const threshold = prefs?.minScoreThreshold ?? 30;

    for (const item of topIssues) {
      if (item.score < threshold) continue;

      const matchesPrefs = !prefs || (
        (prefs.notifyFirstAppearance && item.signals.firstAppearanceCharacters.length > 0) ||
        (prefs.notifyKeyCreator && item.signals.keyCreators.length > 0) ||
        (prefs.notifyMovieSpec && item.signals.movieSpecMatches.length > 0) ||
        (prefs.notifyIssueOne && item.signals.storyArcs.length >= 0 && item.scoredIssue.isIssueOne) ||
        (prefs.notifyDeath && item.signals.deaths.length > 0)
      );

      if (!matchesPrefs) continue;

      const signalParts = [];
      if (item.signals.firstAppearanceCharacters.length > 0) {
        signalParts.push(`First appearance: ${item.signals.firstAppearanceCharacters.join(", ")}`);
      }
      if (item.signals.keyCreators.length > 0) {
        signalParts.push(`Key creator: ${item.signals.keyCreators.map((c) => c.name).join(", ")}`);
      }
      if (item.signals.movieSpecMatches.length > 0) {
        signalParts.push(`Movie/TV: ${item.signals.movieSpecMatches.map((m) => m.character).join(", ")}`);
      }
      if (item.signals.deaths.length > 0) {
        signalParts.push(`Death: ${item.signals.deaths.join(", ")}`);
      }

      const issueName = item.scoredIssue.volumeName
        ? `${item.scoredIssue.volumeName} #${item.scoredIssue.issueNumber}`
        : item.scoredIssue.name;

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "weekly_scan",
          title: `${issueName} (Score: ${item.score})`,
          message: signalParts.join(" | ") || `Scored ${item.score} points`,
          scoredIssueId: item.scoredIssue.id,
          imageUrl: item.scoredIssue.thumbnailUrl || item.scoredIssue.imageUrl,
        },
      });
    }
  }
}

module.exports = { runWeeklyScan, getNextWednesday };
