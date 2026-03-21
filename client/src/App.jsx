import { useState, useEffect } from "react";
import ReleaseTracker from "./components/ReleaseTracker";
import NotificationBell from "./components/NotificationBell";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("character");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
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

    try {
      const res = await fetch(
        `/api/search?query=${encodeURIComponent(query)}&type=${type}&page=${pageNum}`
      );
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

  const fetchDetail = async (item) => {
    setLoading(true);
    const endpoint =
      type === "character"
        ? `/api/characters/${item.id}`
        : `/api/issues/${item.id}`;

    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelected(data);
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
    if (type === "volume" || type === "character" || type === "story_arc") {
      return type;
    }
    return null;
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div>
            <h1>Comic Universe Search Engine</h1>
            <p className="subtitle">Powered by Comic Vine</p>
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
              <div className="search-controls">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${type === "character" ? "characters" : type === "volume" ? "volumes" : type === "story_arc" ? "story arcs" : "comics"}...`}
                  className="search-input"
                />
                <button type="submit" className="search-btn" disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
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
                  className={`toggle-btn ${type === "issue" ? "active" : ""}`}
                  onClick={() => setType("issue")}
                >
                  Comics
                </button>
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
              </div>
            </form>

            {error && <p className="error">{error}</p>}

            {selected && (
              <div className="detail-panel">
                <div className="detail-actions">
                  <button className="back-btn" onClick={() => setSelected(null)}>
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
                    {selected.issue_number && (
                      <p className="issue-num">Issue #{selected.issue_number}</p>
                    )}
                    {selected.store_date && (
                      <p className="release-info">
                        Store Date: {selected.store_date}
                      </p>
                    )}
                    {selected.cover_date && (
                      <p className="release-info">
                        Cover Date: {selected.cover_date}
                      </p>
                    )}
                    {selected.deck && <p className="deck">{selected.deck}</p>}
                    {selected.description && (
                      <div className="description">
                        {stripHtml(selected.description).slice(0, 1000)}
                        {stripHtml(selected.description).length > 1000 && "..."}
                      </div>
                    )}
                    {selected.publisher && (
                      <p className="publisher">
                        Publisher: {selected.publisher.name}
                      </p>
                    )}
                    {selected.first_appeared_in_issue && (
                      <p className="first-appearance">
                        First appearance: {selected.first_appeared_in_issue.name}
                      </p>
                    )}
                  </div>
                </div>
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
                    <button
                      disabled={page <= 1}
                      onClick={() => search(page - 1)}
                    >
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
        Data provided by{" "}
        <a
          href="https://comicvine.gamespot.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Comic Vine
        </a>
      </footer>
    </div>
  );
}

export default App;
