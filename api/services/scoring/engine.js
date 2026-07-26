const config = require("./config");

async function scoreIssue(issueData, context) {
  const { weights, valuableCreatorRoles } = config;
  const { hotCreators = [], watchlistEntries = [] } = context;

  let totalScore = 0;
  const breakdown = {
    firstAppearance: 0,
    issueOne: 0,
    keyCreator: 0,
    movieSpec: 0,
    death: 0,
    storyArc: 0,
  };
  const signals = {
    firstAppearanceCharacters: [],
    firstAppearanceTeams: [],
    keyCreators: [],
    movieSpecMatches: [],
    deaths: [],
    storyArcs: [],
  };
  const flags = {
    hasFirstAppearance: false,
    isIssueOne: false,
    hasKeyCreator: false,
    hasMovieSpec: false,
    hasDeathIssue: false,
    hasStoryArcSignificance: false,
  };

  const faCharacters = issueData.first_appearance_characters || [];
  for (const char of faCharacters) {
    const name = char.name || char;
    breakdown.firstAppearance += weights.firstAppearanceCharacter;
    totalScore += weights.firstAppearanceCharacter;
    signals.firstAppearanceCharacters.push(name);
  }

  const faTeams = issueData.first_appearance_teams || [];
  for (const team of faTeams) {
    const name = team.name || team;
    breakdown.firstAppearance += weights.firstAppearanceTeam;
    totalScore += weights.firstAppearanceTeam;
    signals.firstAppearanceTeams.push(name);
  }

  const faConcepts = issueData.first_appearance_concepts || [];
  for (const concept of faConcepts) {
    breakdown.firstAppearance += weights.firstAppearanceConcept;
    totalScore += weights.firstAppearanceConcept;
  }

  if (faCharacters.length > 0 || faTeams.length > 0 || faConcepts.length > 0) {
    flags.hasFirstAppearance = true;
  }

  if (issueData.issue_number === "1") {
    breakdown.issueOne = weights.issueOne;
    totalScore += weights.issueOne;
    flags.isIssueOne = true;
  }

  const personCredits = issueData.person_credits || [];
  const hotCreatorMap = new Map();
  for (const hc of hotCreators) {
    hotCreatorMap.set(hc.name.toLowerCase(), hc);
    if (hc.comicVineId) {
      hotCreatorMap.set(String(hc.comicVineId), hc);
    }
  }

  for (const person of personCredits) {
    const personName = (person.name || "").toLowerCase();
    const personId = person.id ? String(person.id) : null;
    const matched = hotCreatorMap.get(personName) || (personId && hotCreatorMap.get(personId));

    if (!matched) continue;

    const role = (person.role || "").toLowerCase();
    if (!valuableCreatorRoles.has(role)) continue;

    const tierKey = `keyCreatorTier${matched.tier}`;
    const weight = weights[tierKey] || weights.keyCreatorTier3;

    breakdown.keyCreator += weight;
    totalScore += weight;
    signals.keyCreators.push({
      name: matched.name,
      role: person.role || role,
      tier: matched.tier,
    });
    flags.hasKeyCreator = true;
  }

  const characterCredits = issueData.character_credits || [];
  const watchlistByName = new Map();
  const watchlistById = new Map();
  for (const entry of watchlistEntries) {
    watchlistByName.set(entry.name.toLowerCase(), entry);
    if (entry.comicVineId) {
      watchlistById.set(entry.comicVineId, entry);
    }
  }

  for (const char of characterCredits) {
    const charName = (char.name || "").toLowerCase();
    const charId = char.id || null;
    const matched = watchlistByName.get(charName) || (charId && watchlistById.get(charId));

    if (!matched) continue;

    let weight;
    switch (matched.confidence) {
      case "confirmed":
        weight = weights.movieSpecConfirmed;
        break;
      case "rumored":
        weight = weights.movieSpecRumored;
        break;
      default:
        weight = weights.movieSpeculation;
    }

    breakdown.movieSpec += weight;
    totalScore += weight;
    signals.movieSpecMatches.push({
      character: char.name || matched.name,
      production: matched.production,
      confidence: matched.confidence,
    });
    flags.hasMovieSpec = true;
  }

  const deaths = issueData.character_died_in || [];
  for (const death of deaths) {
    const name = death.name || death;
    breakdown.death += weights.deathIssue;
    totalScore += weights.deathIssue;
    signals.deaths.push(name);
  }
  if (deaths.length > 0) {
    flags.hasDeathIssue = true;
  }

  const storyArcs = issueData.story_arc_credits || [];
  for (const arc of storyArcs) {
    const name = arc.name || arc;
    breakdown.storyArc += weights.storyArcStart;
    totalScore += weights.storyArcStart;
    signals.storyArcs.push(name);
  }
  if (storyArcs.length > 0) {
    flags.hasStoryArcSignificance = true;
  }

  return { totalScore, breakdown, signals, flags };
}

module.exports = { scoreIssue };
