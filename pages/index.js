import Head from 'next/head'

export default function IndexPage() {
  return (
    <>
      <Head>
        <title>MaplibreBoard - 인터랙티브 지도 게시판</title>
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
            인터랙티브 지도 위에 나만의 격자 보드를 세우고 이야기를 기록해 보세요.
            로컬 PostgreSQL 데이터베이스를 연동한 독립형 지도 게시판 서비스입니다.
          </p>

          <div className="button-group">
            <button onClick={() => window.location.href = '/map'} className="button primary">
              지도 보기 (Raster Map)
            </button>
            <button onClick={() => window.location.href = '/all'} className="button secondary">
              전체 글 피드 보기 (All Feed)
            </button>
            <button onClick={() => window.location.href = '/admin'} className="button secondary">
              관리자 페이지로 이동
            </button>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="features-section">
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>인터랙티브 지도</h3>
            <p>
              MapLibre GL JS와 OpenStreetMap, Esri 위성 지도를 자유롭게 넘나들며 격자별 활성화 척도를 실시간 히트맵 컬러로 시각화합니다.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>그리드 보드 및 글 작성</h3>
            <p>
              지도상 특정 좌표 클릭 시 전용 보드가 즉시 자동 개설되며, 이미지 파일 첨부(Lightbox 보기 지원) 및 보안 패스워드를 통한 정밀 제어가 가능합니다.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>정밀 관리자 검열</h3>
            <p>
              데이터 참조 무결성이 보장된 3단계 검열 시스템과 디스크 경로 이탈 방지(Path Traversal 방지) 알고리즘으로 업로드된 리소스를 투명하게 관리합니다.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <p>© 2026 MaplibreBoard. Self-Hosted Map Board System.</p>
        </footer>
      </main>

      <style jsx global>{`
        body {
          background-color: #0b0f19;
          color: #f3f4f6;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        
        .landing-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 80px 24px 40px 24px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          box-sizing: border-box;
        }

        /* Hero styling */
        .hero-section {
          text-align: center;
          margin-bottom: 80px;
          animation: fadeInUp 0.8s ease-out;
        }
        
        .logo-badge {
          display: inline-block;
          font-size: 13px;
          font-weight: 600;
          color: #60a5fa;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          padding: 6px 16px;
          border-radius: 99px;
          margin-bottom: 24px;
          letter-spacing: 0.5px;
        }

        .hero-title {
          font-size: 56px;
          font-weight: 700;
          margin: 0 0 20px 0;
          background: linear-gradient(135deg, #ffffff 30%, #93c5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -1px;
        }

        .hero-subtitle {
          font-size: 18px;
          color: #9ca3af;
          max-width: 680px;
          margin: 0 auto 40px auto;
          line-height: 1.6;
        }

        .button-group {
          display: flex;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .button {
          font-family: inherit;
          padding: 14px 32px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .button.primary {
          background: #3b82f6;
          color: #ffffff;
        }

        .button.primary:hover {
          background: #2563eb;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
          transform: translateY(-2px);
        }

        .button.secondary {
          background: rgba(255, 255, 255, 0.05);
          color: #f3f4f6;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .button.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }
        
        .button:active {
          transform: translateY(0);
        }

        /* Features Section */
        .features-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
          margin-bottom: 80px;
          animation: fadeInUp 1s ease-out;
        }

        .feature-card {
          background: rgba(17, 24, 39, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 36px 28px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(59, 130, 246, 0.25);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .feature-icon {
          font-size: 36px;
          margin-bottom: 20px;
        }

        .feature-card h3 {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #ffffff;
        }

        .feature-card p {
          font-size: 14px;
          color: #9ca3af;
          line-height: 1.6;
          margin: 0;
        }

        /* Footer styling */
        .landing-footer {
          margin-top: auto;
          text-align: center;
          padding-top: 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .landing-footer p {
          color: #4b5563;
          font-size: 13px;
          margin: 0;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 600px) {
          .hero-title {
            font-size: 36px;
          }
          .landing-container {
            padding: 48px 16px 24px 16px;
          }
          .hero-subtitle {
            font-size: 15px;
            margin-bottom: 24px;
          }
          .button-group {
            flex-direction: column;
            width: 100%;
            gap: 12px;
          }
          .button {
            width: 100%;
            padding: 12px 24px;
            font-size: 15px;
          }
        }
      `}</style>
    </>
  )
}

