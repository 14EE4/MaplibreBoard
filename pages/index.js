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
    </>
  )
}

