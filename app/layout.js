import "./globals.css";

export const metadata = {
  title: "Business Odisha — News Poster Generator",
  description: "Auto-generate stunning news posters for Odisha business and industry news. Powered by AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="header-brand">
            <img src="/logo.jpg" alt="Business Odisha Logo" />
            <div>
              <h1>Business Odisha</h1>
              <p>AI-Powered News Poster Generator</p>
            </div>
          </div>
          <nav className="nav-links">
            <a href="/" className="nav-link">Home</a>
            <a href="/history" className="nav-link">History</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
