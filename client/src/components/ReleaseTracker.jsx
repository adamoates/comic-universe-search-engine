import { useState, useEffect } from "react";

function ReleaseTracker({ trackedItems, onUntrack, onRefresh }) {
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [activeTab, setActiveTab] = useState("tracked");

  useEffect(() => {
    if (activeTab === "upcoming") {
      fetchUpcoming();
    }
  }, [activeTab]);

  const fetchUpcoming = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/releases/upcoming");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUpcoming(data.releases || []);
    } catch (err) {
      console.error("Failed to fetch upcoming:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/releases/check", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.newReleases > 0) {
        fetchUpcoming();
        onRefresh();
      }
    } catch (err) {
      console.error("Check failed:", err.message);
    } finally {
      setChecking(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDateLabel = (release) => {
    const today = new Date().toISOString().split("T")[0];
    const date = release.storeDate || release.coverDate;
    if (date === today) return "Today!";
    if (date > today) return formatDate(date);
    return formatDate(date);
  };

  const getDateClass = (release) => {
    const today = new Date().toISOString().split("T")[0];
    const date = release.storeDate || release.coverDate;
    if (date === today) return "date-today";
    if (date > today) return "date-upcoming";
    return "date-past";
  };

  return (
    <div className="release-tracker">
      <div className="tracker-tabs">
        <button
          className={`tracker-tab ${activeTab === "tracked" ? "active" : ""}`}
          onClick={() => setActiveTab("tracked")}
        >
          Tracked ({trackedItems.length})
        </button>
        <button
          className={`tracker-tab ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
        >
          Upcoming Releases
        </button>
        <button
          className="check-btn"
          onClick={checkNow}
          disabled={checking || trackedItems.length === 0}
        >
          {checking ? "Checking..." : "Check Now"}
        </button>
      </div>

      {activeTab === "tracked" && (
        <div className="tracked-list">
          {trackedItems.length === 0 && (
            <p className="empty-state">
              No tracked items yet. Search for a series, character, or story arc
              and click "Track" to monitor its releases.
            </p>
          )}
          {trackedItems.map((item) => (
            <div key={item.id} className="tracked-card">
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  className="tracked-img"
                />
              )}
              <div className="tracked-info">
                <h3>{item.name}</h3>
                <span className="resource-type-badge">{item.resourceType}</span>
                {item.publisher && (
                  <p className="tracked-publisher">{item.publisher}</p>
                )}
                <p className="tracked-meta">
                  Tracked since {formatDate(item.trackedAt?.split("T")[0])}
                  {item.lastChecked && (
                    <> · Last checked {formatDate(item.lastChecked?.split("T")[0])}</>
                  )}
                </p>
              </div>
              <button
                className="untrack-btn"
                onClick={() => onUntrack(item.id)}
              >
                Untrack
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "upcoming" && (
        <div className="upcoming-list">
          {loading && <p className="loading-text">Loading upcoming releases...</p>}
          {!loading && upcoming.length === 0 && (
            <p className="empty-state">
              No upcoming releases found for your tracked items.
            </p>
          )}
          {!loading &&
            upcoming.map((release, idx) => (
              <div key={`${release.id}-${idx}`} className="upcoming-card">
                {release.image && (
                  <img
                    src={release.image.small_url || release.image.thumb_url}
                    alt={release.name}
                    className="upcoming-img"
                  />
                )}
                <div className="upcoming-info">
                  <h3>
                    {release.name || release.volume?.name}
                    {release.issueNumber && ` #${release.issueNumber}`}
                  </h3>
                  {release.deck && (
                    <p className="upcoming-deck">{release.deck}</p>
                  )}
                  <p className="upcoming-from">
                    From: {release.trackedItemName}
                  </p>
                </div>
                <div className={`release-date ${getDateClass(release)}`}>
                  <span className="date-label">
                    {release.isUpcoming ? "Releases" : "Released"}
                  </span>
                  <span className="date-value">{getDateLabel(release)}</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default ReleaseTracker;
