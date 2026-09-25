'use client';

import { useState, useEffect } from 'react';
import PosterCard from '@/app/components/PosterCard';

export default function HistoryPage() {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/history');
        const data = await res.json();
        
        if (data.success) {
          setPosters(data.posters || []);
        } else {
          setError(data.error);
        }
      } catch (e) {
        console.error('Failed to load history from DB', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <main className="container empty-state">
        <span className="spinner" style={{ display: 'inline-block', marginBottom: '20px' }}></span>
        <h2>Loading Global History...</h2>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container empty-state">
        <h2 style={{ color: '#f87171' }}>Error loading history</h2>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 24px 0' }}>
        <div className="section-title" style={{ margin: 0 }}>
          Global History — {posters.length} Posters Saved
        </div>
      </div>

      {posters.length > 0 ? (
        <div className="poster-grid">
          {posters.map((poster) => (
            <PosterCard 
              key={poster.id} 
              poster={poster} 
              onDelete={(id) => setPosters(prev => prev.filter(p => p.id !== id))} 
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Your History is Empty</h2>
          <p>Any posters you generate on the Home page will be automatically saved here in your browser.</p>
          <a href="/" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            color: '#0a0e1a',
            padding: '12px 28px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 700
          }}>
            Go to Home Page
          </a>
        </div>
      )}
    </main>
  );
}
