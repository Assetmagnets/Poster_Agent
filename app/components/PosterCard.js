'use client';

import { useRef, useState } from 'react';

export default function PosterCard({ poster, onDelete }) {
  const posterRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dateStr = new Date(poster.date).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  async function handleDownload() {
    if (!posterRef.current || downloading) return;
    setDownloading(true);

    try {
      const html2canvas = (await import('html2canvas-pro')).default;

      const canvas = await html2canvas(posterRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#020c1b',
        width: posterRef.current.offsetWidth,
        height: posterRef.current.offsetHeight,
      });

      const link = document.createElement('a');
      link.download = `poster-${poster.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (confirm('Are you sure you want to delete this poster?')) {
      setDeleting(true);
      try {
        const res = await fetch(`/api/poster/${poster.id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        
        if (data.success) {
          if (onDelete) {
            onDelete(poster.id);
          }
        } else {
          alert('Failed to delete poster.');
        }
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Delete failed. Please try again.');
      } finally {
        setDeleting(false);
      }
    }
  }

  return (
    <div className="poster-card">
      {/* This div is what html2canvas captures */}
      <div className="poster-visual" ref={posterRef}>
        <div className="poster-hero-wrapper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="poster-hero-img"
            src={poster.imageUrl}
            alt=""
            crossOrigin="anonymous"
          />
        </div>
        <div className="poster-hero-gradient"></div>

        <div className="poster-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Business Odisha" />
        </div>

        <div className="poster-content">
          <div className="poster-category">BUSINESS NEWS</div>
          <h2 className="poster-headline">{poster.headline}</h2>
          <p className="poster-summary">{poster.summary}</p>
        </div>

        <div className="poster-footer">
          <span>Source: {poster.source} · {dateStr}</span>
          <span>For information only. Not investment advice.</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="card-actions">
        <button
          className="download-btn"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <>
              <span className="spinner"></span>
              Rendering...
            </>
          ) : (
            <>
              ⬇ Download Poster
            </>
          )}
        </button>
        <button 
          className="share-btn" 
          onClick={handleDelete} 
          title="Delete Poster"
          disabled={deleting}
          style={{ background: '#f87171', color: 'white' }}
        >
          {deleting ? '...' : '🗑️'}
        </button>
      </div>
    </div>
  );
}
