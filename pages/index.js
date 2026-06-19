import Head from 'next/head'

export default function IndexPage() {
  return (
    <>
      <Head>
        <title>MaplibreBoard - Interactive Map Board</title>
        <link rel="icon" href="/icon.png" />
        <link rel="shortcut icon" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />
        <meta name="theme-color" content="#0b0f19" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <main className="landing-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="logo-badge">Next.js + MapLibre + Prisma</div>
          <h1 className="hero-title">MaplibreBoard</h1>
          <p className="hero-subtitle">
            Create your own grid boards on an interactive map and record your stories.
            A self-hosted map board service powered by a local PostgreSQL database.
          </p>

          <div className="button-group">
            <button onClick={() => window.location.href = '/map'} className="button primary">
              View Map (Raster Map)
            </button>
            <button onClick={() => window.location.href = '/all'} className="button secondary">
              View All Feed
            </button>
            <button onClick={() => window.location.href = '/admin'} className="button secondary">
              Go to Admin Page
            </button>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="features-section">
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>Interactive Map</h3>
            <p>
              Switch between MapLibre GL JS, OpenStreetMap, and Esri Satellite maps to visualize grid activity with real-time heatmap colors.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Grid Board & Posting</h3>
            <p>
              Clicking specific coordinates automatically creates a dedicated board. Post images (with Lightbox support) and control posts securely using passwords.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Admin Moderation</h3>
            <p>
              Manage uploaded resources securely with a 3-step moderation system ensuring referential integrity and path traversal protection.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <p>© 2026 MaplibreBoard. Self-Hosted Map Board System.</p>
        </footer>
      </main>
    </>
  )
}

