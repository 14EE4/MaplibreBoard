import { useEffect, useState } from 'react'
import Head from 'next/head'

export default function AllFeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [lightboxImage, setLightboxImage] = useState(null)

  useEffect(() => {
    async function fetchAllPosts() {
      try {
        const res = await fetch(`/api/posts?t=${Date.now()}`)
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const data = await res.json()
        setPosts(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to fetch posts', err)
        setErrorMsg('게시글 목록을 불러오는 데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchAllPosts()
  }, [])

  const formatTime = (ts) => {
    if (!ts) return ''
    try {
      return new Date(ts).toLocaleString()
    } catch (e) {
      return ts
    }
  }

  const escapeHtml = (str) => {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  return (
    <>
      <Head>
        <title>전체 피드 - MaplibreBoard</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <main className="feed-container">
        {/* Header */}
        <header className="feed-header">
          <button onClick={() => window.location.href = '/'} className="btn-back">
            ← 메인으로
          </button>
          <div className="header-title-wrapper">
            <h1 className="feed-title">전체 글 피드</h1>
            <p className="feed-subtitle">모든 격자 게시판의 소식을 한눈에 확인하세요</p>
          </div>
        </header>

        {/* Content area */}
        {loading ? (
          <div className="status-container">
            <div className="loading-spinner"></div>
            <p className="status-text">게시글을 불러오는 중입니다...</p>
          </div>
        ) : errorMsg ? (
          <div className="status-container error">
            <p className="status-text">{errorMsg}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="status-container empty">
            <p className="status-text">등록된 게시글이 없습니다.</p>
          </div>
        ) : (
          <div className="feed-grid">
            {posts.map((post) => (
              <div
                key={post.id}
                className="feed-card"
                onClick={() => {
                  if (post.board_id) {
                    window.location.href = `/board?id=${post.board_id}`
                  }
                }}
              >
                <div className="card-header">
                  <span className="board-badge">
                    📍 {post.board_name || '이름 없음'} 
                    {post.board_x !== null && post.board_y !== null ? ` (${post.board_x}, ${post.board_y})` : ''}
                  </span>
                  <span className="post-date">{post.created_at ? formatTime(post.created_at) : ''}</span>
                </div>

                <div className="card-body">
                  <p className="post-author">
                    작성자: <span className="author-name">{post.author ? escapeHtml(post.author) : '익명'}</span>
                  </p>
                  <p 
                    className="post-content"
                    dangerouslySetInnerHTML={{ 
                      __html: escapeHtml(post.content || '').replace(/\n/g, '<br>') 
                    }}
                  />
                  {post.image_url && (
                    <div className="image-container">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.image_url}
                        alt="첨부 이미지"
                        className="post-thumbnail"
                        onClick={(e) => {
                          e.stopPropagation() // Prevent clicking the card
                          setLightboxImage(post.image_url)
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="card-footer">
                  <span className="click-helper">해당 게시판으로 이동 →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-wrapper" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxImage} alt="Enlarged view" className="lightbox-img" />
            <button className="lightbox-close-btn" onClick={() => setLightboxImage(null)}>
              ✕
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        body {
          background-color: #0b0f19;
          color: #f3f4f6;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
        }

        .feed-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 24px;
        }

        .feed-header {
          display: flex;
          align-items: center;
          margin-bottom: 48px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 24px;
          gap: 24px;
        }

        .btn-back {
          font-family: inherit;
          background: rgba(255, 255, 255, 0.08);
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn-back:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .header-title-wrapper {
          display: flex;
          flex-direction: column;
        }

        .feed-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 6px 0;
          background: linear-gradient(135deg, #60a5fa, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .feed-subtitle {
          font-size: 14px;
          color: #9ca3af;
          margin: 0;
        }

        /* Feed Grid Layout */
        .feed-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        /* Card Styling */
        .feed-card {
          background: rgba(17, 24, 39, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .feed-card:hover {
          transform: translateY(-4px);
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
          background: rgba(17, 24, 39, 0.6);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          font-size: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 12px;
        }

        .board-badge {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 600;
        }

        .post-date {
          color: #6b7280;
        }

        .card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .post-author {
          font-size: 13px;
          color: #9ca3af;
          margin: 0;
        }

        .author-name {
          font-weight: 600;
          color: #e5e7eb;
        }

        .post-content {
          font-size: 15px;
          line-height: 1.6;
          color: #d1d5db;
          margin: 0;
          word-break: break-all;
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .image-container {
          margin-top: 8px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: #111827;
          max-height: 180px;
        }

        .post-thumbnail {
          width: 100%;
          height: 180px;
          object-fit: cover;
          display: block;
          transition: transform 0.2s ease;
        }

        .post-thumbnail:hover {
          transform: scale(1.03);
        }

        .card-footer {
          margin-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          padding-top: 12px;
          font-size: 13px;
          color: #60a5fa;
          font-weight: 600;
          text-align: right;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .feed-card:hover .card-footer {
          opacity: 1;
        }

        /* Status UI (Loading, Error, Empty) */
        .status-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          background: rgba(17, 24, 39, 0.2);
          border: 1px dashed rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          text-align: center;
        }

        .status-text {
          font-size: 16px;
          color: #9ca3af;
          margin: 16px 0 0 0;
        }

        .loading-spinner {
          border: 3px solid rgba(255, 255, 255, 0.05);
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Lightbox styles */
        .lightbox-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }

        .lightbox-wrapper {
          position: relative;
          max-width: 90%;
          max-height: 90%;
        }

        .lightbox-img {
          max-width: 100%;
          max-height: 90vh;
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          display: block;
          margin: auto;
        }

        .lightbox-close-btn {
          position: absolute;
          top: -44px;
          right: 0;
          background: transparent;
          color: #fff;
          border: none;
          font-size: 32px;
          cursor: pointer;
          font-weight: 300;
          transition: color 0.2s;
        }

        .lightbox-close-btn:hover {
          color: #ef4444;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}
