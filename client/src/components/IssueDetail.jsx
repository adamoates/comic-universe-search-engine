import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../services/api";
import SignalBadge from "./SignalBadge";
import ScoreGauge from "./ScoreGauge";

function IssueDetail({ comicVineId, onBack }) {
  const [issue, setIssue] = useState(null);
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);

  useEffect(() => {
    fetchIssue();
  }, [comicVineId]);

  const fetchIssue = async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/scanner/issue/${comicVineId}`);
      setIssue(data.issue || data);
      if (data.issue?.priceData?.length > 0) {
        setPrices(data.issue.priceData[0]);
      }
    } catch (err) {
      console.error("Failed to fetch issue:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    setLoadingPrices(true);
    try {
      const data = await apiGet(`/prices/${comicVineId}`);
      setPrices(data.prices || null);
    } catch (err) {
      console.error("Failed to fetch prices:", err.message);
    } finally {
      setLoadingPrices(false);
    }
  };

  const refreshPrices = async () => {
    setLoadingPrices(true);
    try {
      const data = await apiPost(`/prices/${comicVineId}/refresh`, {});
      setPrices(data.prices || null);
    } catch (err) {
      console.error("Failed to refresh prices:", err.message);
    } finally {
      setLoadingPrices(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPrice = (price) => {
    if (price == null) return "N/A";
    return `$${price.toFixed(2)}`;
  };

  if (loading) return <p className="loading-text">Loading issue details...</p>;
  if (!issue) return <p className="error">Issue not found</p>;

  const breakdown = issue.scoreBreakdown || {};
  const signals = [];
  if (issue.hasFirstAppearance) signals.push("firstAppearance");
  if (issue.hasKeyCreator) signals.push("keyCreator");
  if (issue.hasMovieSpec) signals.push("movieSpec");
  if (issue.hasDeathIssue) signals.push("deathIssue");
  if (issue.isIssueOne) signals.push("issueOne");
  if (issue.hasStoryArcSignificance) signals.push("storyArc");

  return (
    <div className="issue-detail">
      <button className="back-btn" onClick={onBack}>
        Back to results
      </button>

      <div className="issue-detail-main">
        <div className="issue-detail-left">
          {issue.imageUrl && (
            <img
              src={issue.imageUrl}
              alt={issue.name}
              className="issue-detail-img"
            />
          )}
          <div className="issue-detail-score-section">
            <ScoreGauge score={issue.totalScore} />
            <span className="score-label">Investment Score</span>
          </div>
        </div>

        <div className="issue-detail-right">
          <h2>
            {issue.volumeName || issue.name}
            {issue.issueNumber && ` #${issue.issueNumber}`}
          </h2>
          {issue.publisher && (
            <p className="issue-detail-publisher">{issue.publisher}</p>
          )}
          <p className="issue-detail-dates">
            {issue.storeDate && <>Store: {formatDate(issue.storeDate)}</>}
            {issue.coverDate && <> | Cover: {formatDate(issue.coverDate)}</>}
          </p>

          <div className="signal-badges">
            {signals.map((type) => (
              <SignalBadge key={type} type={type} />
            ))}
          </div>

          {issue.deck && <p className="issue-detail-deck">{issue.deck}</p>}

          <div className="score-breakdown">
            <h3>Score Breakdown</h3>
            <div className="breakdown-bars">
              {Object.entries(breakdown)
                .filter(([, val]) => val > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([key, val]) => (
                  <div key={key} className="breakdown-row">
                    <span className="breakdown-label">{key}</span>
                    <div className="breakdown-bar-container">
                      <div
                        className="breakdown-bar-fill"
                        style={{ width: `${Math.min(100, (val / issue.totalScore) * 100)}%` }}
                      />
                    </div>
                    <span className="breakdown-value">+{val}</span>
                  </div>
                ))}
            </div>
          </div>

          {issue.firstAppearanceDetails && (
            <div className="signal-detail-section">
              <h4>First Appearances</h4>
              <ul>
                {(Array.isArray(issue.firstAppearanceDetails)
                  ? issue.firstAppearanceDetails
                  : []
                ).map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </div>
          )}

          {issue.keyCreatorDetails && (
            <div className="signal-detail-section">
              <h4>Key Creators</h4>
              <ul>
                {(Array.isArray(issue.keyCreatorDetails)
                  ? issue.keyCreatorDetails
                  : []
                ).map((c, i) => (
                  <li key={i}>
                    {c.name} ({c.role}) — Tier {c.tier}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {issue.movieSpecDetails && (
            <div className="signal-detail-section">
              <h4>Movie/TV Speculation</h4>
              <ul>
                {(Array.isArray(issue.movieSpecDetails)
                  ? issue.movieSpecDetails
                  : []
                ).map((m, i) => (
                  <li key={i}>
                    {m.character} — {m.production || "Unknown production"} (
                    {m.confidence})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {issue.deathDetails && (
            <div className="signal-detail-section">
              <h4>Character Deaths</h4>
              <ul>
                {(Array.isArray(issue.deathDetails)
                  ? issue.deathDetails
                  : []
                ).map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="price-section">
        <div className="price-header">
          <h3>Price Data</h3>
          <button
            className="price-refresh-btn"
            onClick={prices ? refreshPrices : fetchPrices}
            disabled={loadingPrices}
          >
            {loadingPrices
              ? "Loading..."
              : prices
                ? "Refresh Prices"
                : "Fetch Prices"}
          </button>
        </div>
        {prices ? (
          <div className="price-grid">
            <div className="price-card">
              <span className="price-label">Average</span>
              <span className="price-value">{formatPrice(prices.averagePrice)}</span>
            </div>
            <div className="price-card">
              <span className="price-label">Median</span>
              <span className="price-value">{formatPrice(prices.medianPrice)}</span>
            </div>
            <div className="price-card">
              <span className="price-label">Low</span>
              <span className="price-value">{formatPrice(prices.lowPrice)}</span>
            </div>
            <div className="price-card">
              <span className="price-label">High</span>
              <span className="price-value">{formatPrice(prices.highPrice)}</span>
            </div>
            <div className="price-card">
              <span className="price-label">Sample</span>
              <span className="price-value">{prices.sampleSize} sold</span>
            </div>
          </div>
        ) : (
          <p className="price-unavailable">
            {loadingPrices
              ? "Fetching price data..."
              : "Click 'Fetch Prices' to look up eBay sold listings"}
          </p>
        )}
      </div>
    </div>
  );
}

export default IssueDetail;
