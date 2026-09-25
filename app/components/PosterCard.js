'use client';

import { useRef, useState } from 'react';

export default function PosterCard({ poster, onDelete }) {
  const posterRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgRetry, setImgRetry] = useState(0); // 0=primary, 1=simple keywords, 2=gradient

  const dateStr = new Date(poster.date).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Build the image source based on retry level
  function getImageSrc() {
    if (imgRetry === 0) {
      return poster.imageUrl;
    }
    if (imgRetry === 1) {
      // Fallback: use simple keywords with Pollinations (much more reliable)
      const keywords = poster.searchKeywords
        || poster.headline.split(' ').slice(0, 3).join(' ');
      const encoded = encodeURIComponent(keywords);
      return `https://image.pollinations.ai/prompt/${encoded}?width=1080&height=720&nologo=true`;
    }
    // imgRetry >= 2: give up on external images, use CSS gradient
    return null;
  }

  function handleImageError() {
    if (imgRetry < 2) {
      setImgRetry(prev => prev + 1);
    }
  }

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

  const imgSrc = getImageSrc();
  const showGradient = imgSrc === null;

  return (
    <div className="poster-card">
      {/* This div is what html2canvas captures */}
      <div className="poster-visual" ref={posterRef}>
        <div className="poster-hero-wrapper">
          {showGradient ? (
            <div
              className="poster-hero-gradient-bg"
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0ea5e9 70%, #38bdf8 100%)',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              className="poster-hero-img"
              src={imgSrc}
              alt=""
              onError={handleImageError}
            />
          )}
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
