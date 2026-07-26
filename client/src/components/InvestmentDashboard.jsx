import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../services/api";
import SignalBadge from "./SignalBadge";
import ScoreGauge from "./ScoreGauge";

function InvestmentDashboard({ onViewIssue }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanDate, setScanDate] = useState("");
  const [filters, setFilters] = useState({
    minScore: 0,
    signal: "",
    publisher: "",
  });
  const [stats, setStats] = useState({
    total: 0,
    firstAppearances: 0,
    keyCreators: 0,
    movieSpec: 0,
  });

  useEffect(() => {
    fetchThisWeek();
  }, []);

  const fetchThisWeek = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.minScore > 0) params.set("minScore", filters.minScore);
      if (filters.signal) params.set("signal", filters.signal);
      if (filters.publisher) params.set("publisher", filters.publisher);

      const qs = params.toString();
      const data = await apiGet(`/scanner/this-week${qs ? `?${qs}` : ""}`);
      setIssues(data.issues || []);
      setScanDate(data.scanDate || "");
      computeStats(data.issues || []);
    } catch (err) {
      console.error("Failed to fetch weekly scan:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const computeStats = (issues) => {
    setStats({
      total: issues.length,
      firstAppearances: issues.filter((i) => i.hasFirstAppearance).length,
      keyCreators: issues.filter((i) => i.hasKeyCreator).length,
      movieSpec: issues.filter((i) => i.hasMovieSpec).length,
    });
  };

  const runScan = async () => {
    setScanning(true);
    try {
      await apiPost("/scanner/run", {});
      await fetchThisWeek();
    } catch (err) {
      console.error("Scan failed:", err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!loading) fetchThisWeek();
  }, [filters.minScore, filters.signal, filters.publisher]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getSignalBadges = (issue) => {
    const badges = [];
    if (issue.hasFirstAppearance) badges.push("firstAppearance");
    if (issue.hasKeyCreator) badges.push("keyCreator");
    if (issue.hasMovieSpec) badges.push("movieSpec");
    if (issue.hasDeathIssue) badges.push("deathIssue");
    if (issue.isIssueOne) badges.push("issueOne");
    if (issue.hasStoryArcSignificance) badges.push("storyArc");
    return badges;
  };

  return (
    <div className="investment-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>This Week's Releases</h2>
          {scanDate && (
            <span className="scan-date">Week of {formatDate(scanDate)}</span>
          )}
        </div>
        <button
          className="scan-btn"
          onClick={runScan}
          disabled={scanning}
        >
          {scanning ? "Scanning..." : "Scan Now"}
        </button>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Issues Scanned</span>
        </div>
        <div className="stat-item stat-first">
          <span className="stat-value">{stats.firstAppearances}</span>
          <span className="stat-label">First Appearances</span>
        </div>
        <div className="stat-item stat-creator">
          <span className="stat-value">{stats.keyCreators}</span>
          <span className="stat-label">Key Creators</span>
        </div>
        <div className="stat-item stat-spec">
          <span className="stat-value">{stats.movieSpec}</span>
          <span className="stat-label">Spec Matches</span>
        </div>
      </div>

      <div className="filter-bar">
        <select
          value={filters.minScore}
          onChange={(e) => handleFilterChange("minScore", e.target.value)}
          className="filter-select"
        >
          <option value="0">All Scores</option>
          <option value="10">Score 10+</option>
          <option value="25">Score 25+</option>
          <option value="50">Score 50+</option>
        </select>
        <select
          value={filters.signal}
          onChange={(e) => handleFilterChange("signal", e.target.value)}
          className="filter-select"
        >
          <option value="">All Signals</option>
          <option value="firstAppearance">First Appearance</option>
          <option value="keyCreator">Key Creator</option>
          <option value="movieSpec">Movie/TV Spec</option>
          <option value="deathIssue">Death Issue</option>
          <option value="issueOne">#1 Issue</option>
        </select>
        <select
          value={filters.publisher}
          onChange={(e) => handleFilterChange("publisher", e.target.value)}
          className="filter-select"
        >
          <option value="">All Publishers</option>
          <option value="Marvel">Marvel</option>
          <option value="DC Comics">DC Comics</option>
          <option value="Image">Image</option>
          <option value="Dark Horse Comics">Dark Horse</option>
          <option value="IDW Publishing">IDW</option>
          <option value="BOOM! Studios">BOOM!</option>
        </select>
      </div>

      {loading && <p className="loading-text">Loading scan results...</p>}

      {!loading && issues.length === 0 && (
        <div className="empty-state">
          <p>No scan results yet for this week.</p>
          <p>Click "Scan Now" to analyze this week's releases.</p>
        </div>
      )}

      {!loading && issues.length > 0 && (
        <div className="scored-issues-list">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="scored-issue-card"
              onClick={() => onViewIssue && onViewIssue(issue.comicVineId)}
            >
              <div className="scored-issue-left">
                {issue.thumbnailUrl || issue.imageUrl ? (
                  <img
                    src={issue.thumbnailUrl || issue.imageUrl}
                    alt={issue.name}
                    className="scored-issue-img"
                  />
                ) : (
                  <div className="scored-issue-img-placeholder" />
                )}
              </div>
              <div className="scored-issue-info">
                <h3>
                  {issue.volumeName || issue.name}
                  {issue.issueNumber && ` #${issue.issueNumber}`}
                </h3>
                {issue.publisher && (
                  <span className="scored-issue-publisher">{issue.publisher}</span>
                )}
                <div className="signal-badges">
                  {getSignalBadges(issue).map((type) => (
                    <SignalBadge key={type} type={type} />
                  ))}
                </div>
                {issue.deck && (
                  <p className="scored-issue-deck">
                    {issue.deck.length > 120
                      ? issue.deck.slice(0, 120) + "..."
                      : issue.deck}
                  </p>
                )}
              </div>
              <div className="scored-issue-score">
                <ScoreGauge score={issue.totalScore} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InvestmentDashboard;
