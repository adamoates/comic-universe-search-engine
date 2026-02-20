import { useState } from "react";
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>Comic Universe Search Engine</h1>
        <p className="subtitle">Powered by Comic Vine</p>
      </header>

      <main>
        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-controls">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${type === "character" ? "characters" : "comics"}...`}
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
          </div>
        </form>

        {error && <p className="error">{error}</p>}

        {selected && (
          <div className="detail-panel">
            <button className="back-btn" onClick={() => setSelected(null)}>
              Back to results
            </button>
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
            Search for your favorite characters or comics above.
          </p>
        )}
      </main>

      <footer className="App-footer">
        Data provided by{" "}
        <a href="https://comicvine.gamespot.com/" target="_blank" rel="noopener noreferrer">
          Comic Vine
        </a>
      </footer>
    </div>
  );
}

export default App;
