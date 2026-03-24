import { useState, useEffect } from "react";
import ReleaseTracker from "./components/ReleaseTracker";
import NotificationBell from "./components/NotificationBell";
import "./App.css";

const MARVEL_TYPES = ["character", "comic", "series"];

function PowerBar({ label, value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="power-bar-row">
      <span className="power-label">{label}</span>
      <div className="power-bar-track">
        <div className="power-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="power-value">{pct}</span>
    </div>
  );
}

function App() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("character");
  const [source, setSource] = useState("comicvine");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [enrichment, setEnrichment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [view, setView] = useState("search");
  const [trackedItems, setTrackedItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchTracked();
    fetchNotifications();
  }, []);

  // Reset type when switching to Marvel if current type is unsupported
  const handleSourceChange = (newSource) => {
    setSource(newSource);
    setResults([]);
    setSelected(null);
    setEnrichment(null);
    if (newSource === "marvel" && !MARVEL_TYPES.includes(type)) {
      setType("character");
    }
  };

  const fetchTracked = async () => {
    try {
      const res = await fetch("/api/releases/tracked");
      const data = await res.json();
      setTrackedItems(data.tracked || []);
    } catch (err) {
      console.error("Failed to fetch tracked items:", err.message);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/releases/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err.message);
    }
  };

  const search = async (pageNum = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    setEnrichment(null);

    try {
      let url;
      if (source === "marvel") {
        url = `/api/marvel/search?query=${encodeURIComponent(query)}&type=${type}&page=${pageNum}`;
      } else {
        url = `/api/search?query=${encodeURIComponent(query)}&type=${type}&page=${pageNum}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
      setTotal(data.total || 0);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrichment = async (name) => {
    setEnrichLoading(true);
    try {
      const res = await fetch(`/api/enrich/character/${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setEnrichment(data);
      }
    } catch {
      // enrichment is optional — silently ignore failures
    } finally {
      setEnrichLoading(false);
    }
  };

  const fetchDetail = async (item) => {
    setLoading(true);
    setEnrichment(null);

    const itemSource = item.source || source;
    let endpoint;

    if (itemSource === "marvel") {
      if (type === "character") endpoint = `/api/marvel/characters/${item.id}`;
      else if (type === "comic") endpoint = `/api/marvel/comics/${item.id}`;
      else {
        // Series has no detail endpoint — show the card data as-is
        setSelected({ ...item, _noDetail: true });
        setLoading(false);
        return;
      }
    } else {
      endpoint =
        type === "character"
          ? `/api/characters/${item.id}`
          : `/api/issues/${item.id}`;
    }

    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelected(data);

      // Fetch enrichment for characters
      if (type === "character") {
        fetchEnrichment(data.name || item.name);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    search(1);
  };

  const stripHtml = (html) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const trackItem = async (item, resourceType) => {
    try {
      const res = await fetch("/api/releases/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comicVineId: String(item.id),
          resourceType,
          name: item.name || item.volume?.name || "Unknown",
          image: item.image?.small_url || item.image?.thumb_url || null,
          publisher: item.publisher?.name || null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchTracked();
    } catch (err) {
      setError(err.message);
    }
  };

  const untrackItem = async (id) => {
    try {
      await fetch(`/api/releases/track/${id}`, { method: "DELETE" });
      fetchTracked();
    } catch (err) {
      setError(err.message);
    }
  };

  const isTracked = (comicVineId, resourceType) => {
    return trackedItems.some(
      (t) => t.comicVineId === String(comicVineId) && t.resourceType === resourceType
    );
  };

  const getTrackableType = () => {
    if (source === "marvel") return null; // Marvel items not trackable via Comic Vine tracker
    if (type === "volume" || type === "character" || type === "story_arc") return type;
    return null;
  };

  const marvelSearch = source === "marvel";

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div>
            <h1>Comic Universe Search Engine</h1>
            <p className="subtitle">
              {marvelSearch ? "Powered by Marvel" : "Powered by Comic Vine"}
            </p>
          </div>
          <div className="header-actions">
            <NotificationBell
              notifications={notifications}
              unread={unreadCount}
              onRefresh={fetchNotifications}
            />
          </div>
        </div>
      </header>

      <nav className="main-nav">
        <button
          className={`nav-btn ${view === "search" ? "active" : ""}`}
          onClick={() => setView("search")}
        >
          Search
        </button>
        <button
          className={`nav-btn ${view === "tracker" ? "active" : ""}`}
          onClick={() => setView("tracker")}
        >
          Release Tracker
          {trackedItems.length > 0 && (
            <span className="nav-badge">{trackedItems.length}</span>
          )}
        </button>
      </nav>

      <main>
        {view === "search" && (
          <>
            <form className="search-form" onSubmit={handleSubmit}>
              {/* Source toggle */}
              <div className="source-toggle">
                <button
                  type="button"
                  className={`source-btn ${source === "comicvine" ? "active" : ""}`}
                  onClick={() => handleSourceChange("comicvine")}
                >
                  Comic Vine
                </button>
                <button
                  type="button"
                  className={`source-btn marvel ${source === "marvel" ? "active" : ""}`}
                  onClick={() => handleSourceChange("marvel")}
                >
                  Marvel
                </button>
              </div>

              <div className="search-controls">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${
                    type === "character" ? "characters"
                    : type === "issue" || type === "comic" ? "comics"
                    : type === "volume" ? "volumes"
                    : type === "series" ? "series"
                    : "story arcs"
                  }...`}
                  className="search-input"
                />
                <button type="submit" className="search-btn" disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>

              {/* Type toggle — different options per source */}
              <div className="type-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${type === "character" ? "active" : ""}`}
                  onClick={() => setType("character")}
                >
                  Characters
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${type === (marvelSearch ? "comic" : "issue") ? "active" : ""}`}
                  onClick={() => setType(marvelSearch ? "comic" : "issue")}
                >
                  Comics
                </button>
                {marvelSearch ? (
                  <button
                    type="button"
                    className={`toggle-btn ${type === "series" ? "active" : ""}`}
                    onClick={() => setType("series")}
                  >
                    Series
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`toggle-btn ${type === "volume" ? "active" : ""}`}
                      onClick={() => setType("volume")}
                    >
                      Volumes
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${type === "story_arc" ? "active" : ""}`}
                      onClick={() => setType("story_arc")}
                    >
                      Story Arcs
                    </button>
                  </>
                )}
              </div>
            </form>

            {error && <p className="error">{error}</p>}

            {selected && (
              <div className="detail-panel">
                <div className="detail-actions">
                  <button className="back-btn" onClick={() => { setSelected(null); setEnrichment(null); }}>
                    Back to results
                  </button>
                  {getTrackableType() && (
                    <button
                      className={`track-btn ${isTracked(selected.id, getTrackableType()) ? "tracked" : ""}`}
                      onClick={() =>
                        isTracked(selected.id, getTrackableType())
                          ? untrackItem(
                              trackedItems.find(
                                (t) =>
                                  t.comicVineId === String(selected.id) &&
                                  t.resourceType === getTrackableType()
                              )?.id
                            )
                          : trackItem(selected, getTrackableType())
                      }
                    >
                      {isTracked(selected.id, getTrackableType())
                        ? "Tracking"
                        : "Track Releases"}
                    </button>
                  )}
                </div>

                <div className="detail-content">
                  {selected.image && (
                    <img
                      src={selected.image.medium_url}
                      alt={selected.name}
                      className="detail-img"
                    />
                  )}
                  <div className="detail-info">
                    <h2>{selected.name || selected.volume?.name}</h2>

                    {selected.real_name && (
                      <p className="real-name">{selected.real_name}</p>
                    )}
                    {selected.aliases && (
                      <p className="aliases">
                        Also known as: {selected.aliases.split("\n").slice(0, 3).join(", ")}
                      </p>
                    )}
                    {selected.issue_number && (
                      <p className="issue-num">Issue #{selected.issue_number}</p>
                    )}
                    {selected.store_date && (
                      <p className="release-info">Store Date: {selected.store_date}</p>
                    )}
                    {selected.cover_date && (
                      <p className="release-info">Cover Date: {selected.cover_date}</p>
                    )}
                    {selected.cover_price && (
                      <p className="meta-info">Cover Price: {selected.cover_price}</p>
                    )}
                    {selected.page_count && (
                      <p className="meta-info">Pages: {selected.page_count}</p>
                    )}
                    {selected.deck && <p className="deck">{selected.deck}</p>}
                    {selected.description && (
                      <div className="description">
                        {stripHtml(selected.description).slice(0, 1000)}
                        {stripHtml(selected.description).length > 1000 && "..."}
                      </div>
                    )}
                    {selected.publisher && (
                      <p className="publisher">Publisher: {selected.publisher.name}</p>
                    )}
                    {selected.first_appeared_in_issue && (
                      <p className="first-appearance">
                        First appearance: {selected.first_appeared_in_issue.name}
                      </p>
                    )}

                    {/* Creators (issue person_credits) */}
                    {selected.person_credits?.length > 0 && (
                      <div className="creators">
                        <h4>Creators</h4>
                        <div className="creators-list">
                          {selected.person_credits.map((c) => (
                            <span key={`${c.name}-${c.role}`} className="creator-tag">
                              <strong>{c.role}:</strong> {c.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Powers (character) */}
                    {selected.powers?.length > 0 && (
                      <div className="powers">
                        <h4>Powers</h4>
                        <div className="tag-list">
                          {selected.powers.map((p) => (
                            <span key={p.id || p.name} className="tag">{p.name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Teams (character) */}
                    {selected.teams?.length > 0 && (
                      <div className="teams">
                        <h4>Teams</h4>
                        <div className="tag-list">
                          {selected.teams.slice(0, 8).map((t) => (
                            <span key={t.id || t.name} className="tag tag-team">{t.name}</span>
                          ))}
                          {selected.teams.length > 8 && (
                            <span className="tag-more">+{selected.teams.length - 8} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Power Stats from SuperHero enrichment */}
                    {(enrichLoading || enrichment?.powerstats) && (
                      <div className="powerstats">
                        <h4>Power Stats</h4>
                        {enrichLoading ? (
                          <p className="loading-text">Loading stats...</p>
                        ) : (
                          <>
                            <div className="powerstats-bars">
                              {Object.entries(enrichment.powerstats).map(([key, val]) => (
                                <PowerBar key={key} label={key} value={val} />
                              ))}
                            </div>
                            {enrichment.biography?.fullName && enrichment.biography.fullName !== selected.name && (
                              <p className="enrich-note">
                                Stats shown for: <em>{enrichment.biography.fullName}</em>
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Marvel attribution */}
                {(selected.source === "marvel" || marvelSearch) && (
                  <p className="marvel-attribution">
                    Data provided by Marvel. © 2025 MARVEL
                  </p>
                )}
              </div>
            )}

            {!selected && results.length > 0 && (
              <>
                <p className="result-count">
                  {total} result{total !== 1 ? "s" : ""} found
                </p>
                <div className="results-grid">
                  {results.map((item) => (
                    <div
                      key={item.id}
                      className="result-card"
                      onClick={() => fetchDetail(item)}
                    >
                      {item.image && (
                        <img
                          src={item.image.small_url}
                          alt={item.name}
                          className="card-img"
                        />
                      )}
                      <div className="card-info">
                        <h3>{item.name || item.volume?.name}</h3>
                        {item.issue_number && <span>#{item.issue_number}</span>}
                        {item.deck && (
                          <p className="card-deck">{item.deck.slice(0, 120)}</p>
                        )}
                      </div>
                      {getTrackableType() && (
                        <button
                          className={`card-track-btn ${isTracked(item.id, getTrackableType()) ? "tracked" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isTracked(item.id, getTrackableType())) {
                              const tracked = trackedItems.find(
                                (t) =>
                                  t.comicVineId === String(item.id) &&
                                  t.resourceType === getTrackableType()
                              );
                              if (tracked) untrackItem(tracked.id);
                            } else {
                              trackItem(item, getTrackableType());
                            }
                          }}
                        >
                          {isTracked(item.id, getTrackableType()) ? "Tracking" : "Track"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {total > 20 && (
                  <div className="pagination">
                    <button disabled={page <= 1} onClick={() => search(page - 1)}>
                      Prev
                    </button>
                    <span>
                      Page {page} of {Math.ceil(total / 20)}
                    </span>
                    <button
                      disabled={page >= Math.ceil(total / 20)}
                      onClick={() => search(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}

            {!selected && !loading && results.length === 0 && !error && (
              <p className="placeholder">
                Search for your favorite characters, comics, volumes, or story arcs above.
              </p>
            )}
          </>
        )}

        {view === "tracker" && (
          <ReleaseTracker
            trackedItems={trackedItems}
            onUntrack={untrackItem}
            onRefresh={() => {
              fetchTracked();
              fetchNotifications();
            }}
          />
        )}
      </main>

      <footer className="App-footer">
        {marvelSearch ? (
          <span>Data provided by Marvel. © 2025 MARVEL</span>
        ) : (
          <>
            Data provided by{" "}
            <a
              href="https://comicvine.gamespot.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Comic Vine
            </a>
          </>
        )}
      </footer>
    </div>
  );
}

export default App;
