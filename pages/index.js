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

        {/* Links Banner Section */}
        <section className="promo-section">
          <h2>Related Projects & Profile</h2>
          <div className="promo-grid">
            <a 
              href="https://github.com/14EE4" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="promo-card"
            >
              <div className="promo-icon">🐙</div>
              <div className="promo-info">
                <h4>개발자 공식 GitHub</h4>
                <p>개발자의 깃허브 프로필 및 오픈소스 프로젝트 확인하기</p>
              </div>
              <span className="arrow">→</span>
            </a>

            <a 
              href="https://14ee4.github.io/minesweeper/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="promo-card"
            >
              <div className="promo-icon">🎮</div>
              <div className="promo-info">
                <h4>지뢰찾기 웹 프리미엄 에디션</h4>
                <p>배포 및 운영 중인 프리미엄 지뢰찾기 게임 바로가기</p>
              </div>
              <span className="arrow">→</span>
            </a>

            <a 
              href="https://text-image-generator-one.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="promo-card"
            >
              <div className="promo-icon">🔤</div>
              <div className="promo-info">
                <h4>픽셀 텍스트 → 이미지 변환기</h4>
                <p>픽셀 폰트 스프라이트를 사용하여 텍스트를 투명 배경 PNG로 변환</p>
              </div>
              <span className="arrow">→</span>
            </a>
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

