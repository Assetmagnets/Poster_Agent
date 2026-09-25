'use client';

import { useState, useEffect } from 'react';
import PosterCard from './components/PosterCard';

export default function Home() {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Load history on mount
  useEffect(() => {
    async function loadData() {
      let localPosters = [];
      try {
        const saved = localStorage.getItem('posterHistory');
        if (saved) {
          localPosters = JSON.parse(saved);
          setPosters(localPosters);
        }
      } catch (e) {
        console.error('Failed to load local history', e);
      }

      try {
        const res = await fetch('/api/history');
        const data = await res.json();
        if (data.success && data.posters) {
          setPosters(prev => {
            const all = [...prev, ...data.posters];
            const unique = [];
            const ids = new Set();
            for (const p of all) {
              if (!ids.has(p.id)) {
                unique.push(p);
                ids.add(p.id);
              }
            }
            unique.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
            return unique;
          });
        }
      } catch (e) {
        console.error('Failed to load db history', e);
      }
    }
    loadData();
  }, []);

  async function handleGenerate() {
    if (loading) return;
    setLoading(true);
    setStatus({ type: 'info', message: '🔍 Fetching live news and generating AI posters... This may take up to 30 seconds.' });

    try {
      const res = await fetch('/api/generate');
      const data = await res.json();

      if (data.success && data.posters && data.posters.length > 0) {
        const updatedPosters = [...data.posters, ...posters];
        
        // Remove duplicates again just in case
        const unique = [];
        const ids = new Set();
        for (const p of updatedPosters) {
          if (!ids.has(p.id)) {
            unique.push(p);
            ids.add(p.id);
          }
        }
        
        setPosters(unique);
        
        // Save to localStorage history
        try {
          localStorage.setItem('posterHistory', JSON.stringify(unique.slice(0, 50))); // Keep last 50
        } catch (e) {
          console.error('Failed to save history', e);
        }

        setStatus({ type: 'success', message: `✅ Generated ${data.posters.length} new poster(s) from live Odisha news!` });
      } else if (data.success && data.posters?.length === 0) {
        setStatus({ type: 'info', message: '📰 No new relevant business news found right now. Try again later.' });
      } else {
        setStatus({ type: 'error', message: `❌ Error: ${data.error || 'Unknown error'}` });
      }
    } catch (err) {
      setStatus({ type: 'error', message: `❌ Failed to connect: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  
  const recentPosters = posters.filter(p => {
    const pDate = new Date(p.createdAt || p.date);
    return (now - pDate) <= ONE_DAY_MS;
  });

  const historyPosters = posters.filter(p => {
    const pDate = new Date(p.createdAt || p.date);
    return (now - pDate) > ONE_DAY_MS;
  });

  function handleDeletePoster(id) {
    setPosters(prev => prev.filter(p => p.id !== id));
    // Also remove from localStorage if it's there
    try {
      const saved = localStorage.getItem('posterHistory');
      if (saved) {
        const local = JSON.parse(saved);
        const updated = local.filter(p => p.id !== id);
        localStorage.setItem('posterHistory', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Failed to update local storage after delete', e);
    }
  }

  return (
    <>
      <div style={{ padding: '20px 40px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Generating...
            </>
          ) : (
            '⚡ Generate New Posters'
          )}
        </button>
      </div>

      {/* Status */}
      {status && (
        <div className={`status-banner ${status.type}`}>
          {status.message}
        </div>
      )}

      {/* Main Content */}
      <main className="container">
        {posters.length > 0 ? (
          <>
            {recentPosters.length > 0 && (
              <>
                <div className="section-title">
                  Recent Posters (Last 24 Hours) — {recentPosters.length} total
                </div>
                <div className="poster-grid">
                  {recentPosters.map((poster) => (
                    <PosterCard key={poster.id} poster={poster} onDelete={handleDeletePoster} />
                  ))}
                </div>
              </>
            )}

            {historyPosters.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: recentPosters.length > 0 ? '40px' : '0' }}>
                  History — {historyPosters.length} total
                </div>
                <div className="poster-grid">
                  {historyPosters.map((poster) => (
                    <PosterCard key={poster.id} poster={poster} onDelete={handleDeletePoster} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h2>No posters yet</h2>
            <p>Click the "Generate New Posters" button above to fetch live Odisha business news and create stunning AI-powered posters.</p>
            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={loading}
              style={{ margin: '0 auto' }}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Generating...
                </>
              ) : (
                '⚡ Generate My First Posters'
              )}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
