import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";

function WatchlistManager() {
  const [entries, setEntries] = useState([]);
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("watchlist");
  const [form, setForm] = useState({
    entityType: "character",
    name: "",
    comicVineId: "",
    production: "",
    productionType: "movie",
    confidence: "rumored",
    notes: "",
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  useEffect(() => {
    if (activeTab === "hits") fetchHits();
  }, [activeTab]);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/watchlist");
      setEntries(data.entries || []);
    } catch (err) {
      console.error("Failed to fetch watchlist:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHits = async () => {
    try {
      const data = await apiGet("/watchlist/hits");
      setHits(data.hits || []);
    } catch (err) {
      console.error("Failed to fetch hits:", err.message);
    }
  };

  const addEntry = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    try {
      const body = {
        ...form,
        comicVineId: form.comicVineId ? Number(form.comicVineId) : undefined,
      };
      const data = await apiPost("/watchlist", body);
      if (data.error) throw new Error(data.error);
      setShowForm(false);
      setForm({
        entityType: "character",
        name: "",
        comicVineId: "",
        production: "",
        productionType: "movie",
        confidence: "rumored",
        notes: "",
      });
      fetchWatchlist();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateConfidence = async (id, confidence) => {
    try {
      await apiPut(`/watchlist/${id}`, { confidence });
      fetchWatchlist();
    } catch (err) {
      console.error("Failed to update:", err.message);
    }
  };

  const deleteEntry = async (id) => {
    try {
      await apiDelete(`/watchlist/${id}`);
      fetchWatchlist();
    } catch (err) {
      console.error("Failed to delete:", err.message);
    }
  };

  const confidenceClass = (c) => {
    if (c === "confirmed") return "confidence-confirmed";
    if (c === "rumored") return "confidence-rumored";
    return "confidence-speculation";
  };

  return (
    <div className="watchlist-manager">
      <div className="watchlist-header">
        <div className="tracker-tabs">
          <button
            className={`tracker-tab ${activeTab === "watchlist" ? "active" : ""}`}
            onClick={() => setActiveTab("watchlist")}
          >
            Watchlist ({entries.length})
          </button>
          <button
            className={`tracker-tab ${activeTab === "hits" ? "active" : ""}`}
            onClick={() => setActiveTab("hits")}
          >
            Recent Hits
          </button>
        </div>
        <button
          className="scan-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add Entry"}
        </button>
      </div>

      {showForm && (
        <form className="watchlist-form" onSubmit={addEntry}>
          <div className="form-row">
            <select
              value={form.entityType}
              onChange={(e) => setForm({ ...form, entityType: e.target.value })}
              className="filter-select"
            >
              <option value="character">Character</option>
              <option value="team">Team</option>
              <option value="property">Property</option>
            </select>
            <input
              type="text"
              placeholder="Name (e.g., Doctor Doom)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="auth-input"
              required
            />
          </div>
          <div className="form-row">
            <input
              type="text"
              placeholder="Production (e.g., Avengers: Doomsday)"
              value={form.production}
              onChange={(e) => setForm({ ...form, production: e.target.value })}
              className="auth-input"
            />
            <select
              value={form.productionType}
              onChange={(e) => setForm({ ...form, productionType: e.target.value })}
              className="filter-select"
            >
              <option value="movie">Movie</option>
              <option value="tv_series">TV Series</option>
              <option value="animated">Animated</option>
            </select>
            <select
              value={form.confidence}
              onChange={(e) => setForm({ ...form, confidence: e.target.value })}
              className="filter-select"
            >
              <option value="confirmed">Confirmed</option>
              <option value="rumored">Rumored</option>
              <option value="speculation">Speculation</option>
            </select>
          </div>
          <div className="form-row">
            <input
              type="text"
              placeholder="Comic Vine ID (optional)"
              value={form.comicVineId}
              onChange={(e) => setForm({ ...form, comicVineId: e.target.value })}
              className="auth-input"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="auth-input"
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-btn">
            Add to Watchlist
          </button>
        </form>
      )}

      {activeTab === "watchlist" && (
        <div className="watchlist-list">
          {loading && <p className="loading-text">Loading watchlist...</p>}
          {!loading && entries.length === 0 && (
            <div className="empty-state">
              <p>No watchlist entries yet.</p>
              <p>
                Add characters or properties heading to movies/TV to boost their
                issues in the weekly scan.
              </p>
            </div>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="watchlist-card">
              <div className="watchlist-card-info">
                <h3>{entry.name}</h3>
                <div className="watchlist-meta">
                  <span className="resource-type-badge">{entry.entityType}</span>
                  <span className={`confidence-badge ${confidenceClass(entry.confidence)}`}>
                    {entry.confidence}
                  </span>
                </div>
                {entry.production && (
                  <p className="watchlist-production">
                    {entry.production}
                    {entry.productionType && ` (${entry.productionType})`}
                  </p>
                )}
                {entry.notes && (
                  <p className="watchlist-notes">{entry.notes}</p>
                )}
              </div>
              <div className="watchlist-card-actions">
                <select
                  value={entry.confidence}
                  onChange={(e) => updateConfidence(entry.id, e.target.value)}
                  className="filter-select"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="rumored">Rumored</option>
                  <option value="speculation">Speculation</option>
                </select>
                <button
                  className="untrack-btn"
                  onClick={() => deleteEntry(entry.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "hits" && (
        <div className="watchlist-hits">
          {hits.length === 0 && (
            <div className="empty-state">
              <p>No recent hits found for your watchlist entries.</p>
            </div>
          )}
          {hits.map((hit) => (
            <div key={hit.id} className="upcoming-card">
              {hit.thumbnailUrl && (
                <img
                  src={hit.thumbnailUrl}
                  alt={hit.name}
                  className="upcoming-img"
                />
              )}
              <div className="upcoming-info">
                <h3>
                  {hit.volumeName || hit.name}
                  {hit.issueNumber && ` #${hit.issueNumber}`}
                </h3>
                <p className="upcoming-from">{hit.publisher}</p>
              </div>
              <div className="release-date date-upcoming">
                <span className="date-label">Score</span>
                <span className="date-value">{hit.totalScore}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WatchlistManager;
