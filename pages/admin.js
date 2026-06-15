import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Admin() {
  const [boards, setBoards] = useState([])
  const [authorized, setAuthorized] = useState(false)
  const [inputPw, setInputPw] = useState('')
  const [error, setError] = useState('')

  // New states for moderation
  const [activeTab, setActiveTab] = useState('boards') // 'boards' or 'moderation'
  const [images, setImages] = useState([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) // { fileName, action, postInfo }
  const [moderationError, setModerationError] = useState('')

  useEffect(() => {
    // Check session flags
    try {
      const ok = sessionStorage.getItem('admin-authed')
      const storedPw = sessionStorage.getItem('admin-pw')
      if (ok === '1' && storedPw) {
        fetch('/api/admin/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: storedPw }),
        })
          .then((res) => {
            if (res.ok) {
              setAuthorized(true)
              setInputPw(storedPw)
            } else {
              logout()
            }
          })
          .catch(() => {
            logout()
          })
      }
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!authorized) return
    fetch('/api/boards')
      .then((r) => r.json())
      .then(setBoards)
      .catch(() => setBoards([]))
  }, [authorized])

  useEffect(() => {
    if (!authorized || activeTab !== 'moderation') return
    fetchImages()
  }, [authorized, activeTab])

  async function fetchImages() {
    setLoadingImages(true)
    setModerationError('')
    try {
      const res = await fetch(`/api/admin/images?auth=${encodeURIComponent(inputPw)}`)
      if (res.ok) {
        const data = await res.json()
        setImages(data)
      } else {
        const err = await res.json()
        setModerationError(err.error || '이미지 목록을 불러오지 못했습니다.')
      }
    } catch (err) {
      console.error(err)
      setModerationError('서버 통신에 실패했습니다.')
    } finally {
      setLoadingImages(false)
    }
  }

  async function submitPw(e) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: inputPw }),
      })
      if (res.ok) {
        try {
          sessionStorage.setItem('admin-authed', '1')
          sessionStorage.setItem('admin-pw', inputPw)
        } catch (e) { }
        setAuthorized(true)
      } else {
        setError('비밀번호가 틀렸습니다.')
      }
    } catch (err) {
      console.error(err)
      setError('서버 통신에 실패했습니다.')
    }
  }

  function logout() {
    try {
      sessionStorage.removeItem('admin-authed')
      sessionStorage.removeItem('admin-pw')
    } catch (e) { }
    setAuthorized(false)
    setInputPw('')
    setBoards([])
    setImages([])
    setActiveTab('boards')
  }

  async function handleConfirmDelete() {
    if (!pendingAction) return
    const { fileName, action } = pendingAction
    setModerationError('')

    try {
      const res = await fetch('/api/admin/images', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth: inputPw,
          fileName,
          action,
        }),
      })

      if (res.ok) {
        // Refresh image list
        fetchImages()
        // If a post was deleted, refresh boards counts
        if (action === 'delete-post') {
          fetch('/api/boards')
            .then((r) => r.json())
            .then(setBoards)
        }
      } else {
        const err = await res.json()
        setModerationError(err.error || '삭제 작업에 실패했습니다.')
      }
    } catch (err) {
      console.error(err)
      setModerationError('서버와 통신하는 중 오류가 발생했습니다.')
    } finally {
      setPendingAction(null)
    }
  }

  if (!authorized) {
    return (
      <>
        <Head>
          <title>관리자 로그인 - MaplibreBoard</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
        </Head>
        <main className="login-container">
          <div className="login-card">
            <h1>MaplibreBoard Admin</h1>
            <p className="subtitle">관리자 비밀번호를 입력해 주세요.</p>
            <form onSubmit={submitPw}>
              <input
                type="password"
                placeholder="비밀번호"
                value={inputPw}
                onChange={(e) => setInputPw(e.target.value)}
                className="input-field"
                required
              />
              <button type="submit" className="btn btn-primary btn-block">로그인</button>
            </form>
            {error && <p className="error-msg">{error}</p>}
          </div>
        </main>

        <style jsx global>{`
          body {
            background-color: #0b0f19;
            color: #f3f4f6;
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
          }
          .login-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
          }
          .login-card {
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 40px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            text-align: center;
          }
          .login-card h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 8px 0;
            background: linear-gradient(135deg, #60a5fa, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .subtitle {
            color: #9ca3af;
            font-size: 14px;
            margin: 0 0 32px 0;
          }
          .input-field {
            width: 100%;
            box-sizing: border-box;
            background: rgba(31, 41, 55, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #f3f4f6;
            padding: 14px 16px;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 20px;
            transition: all 0.2s ease;
          }
          .input-field:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
            background: rgba(31, 41, 55, 0.8);
          }
          .btn {
            font-family: inherit;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
          }
          .btn-primary {
            background: #3b82f6;
            color: white;
          }
          .btn-primary:hover {
            background: #2563eb;
            box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
            transform: translateY(-1px);
          }
          .btn-primary:active {
            transform: translateY(0);
          }
          .btn-block {
            width: 100%;
          }
          .error-msg {
            color: #f87171;
            font-size: 14px;
            margin-top: 16px;
            font-weight: 500;
          }
        `}</style>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>관리자 대시보드 - MaplibreBoard</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <main className="dashboard-container">
        {/* Navigation Header */}
        <header className="dashboard-header">
          <div className="header-brand">
            <h1>MaplibreBoard Admin</h1>
            <span className="badge-status">WSL Local Server</span>
          </div>
          <div className="header-actions">
            <Link href="/" className="btn btn-secondary mr-2">인덱스 페이지로 이동</Link>
            <button onClick={logout} className="btn btn-danger-outline">로그아웃</button>
          </div>
        </header>

        {/* Dashboard Tabs */}
        <nav className="dashboard-tabs">
          <button
            onClick={() => setActiveTab('boards')}
            className={`tab-btn ${activeTab === 'boards' ? 'active' : ''}`}
          >
            게시판 목록 ({boards.length})
          </button>
          <button
            onClick={() => setActiveTab('moderation')}
            className={`tab-btn ${activeTab === 'moderation' ? 'active' : ''}`}
          >
            이미지 검열 및 관리
          </button>
        </nav>

        {/* Main Content Area */}
        <div className="dashboard-content">
          {moderationError && <div className="alert-error">{moderationError}</div>}

          {/* Tab 1: Boards List */}
          {activeTab === 'boards' && (
            <section className="card-section">
              <div className="section-header">
                <h2>생성된 게시판 목록</h2>
                <Link href="/board" className="btn btn-primary btn-sm">새 게시판 열기</Link>
              </div>
              {boards.length === 0 ? (
                <div className="empty-state">
                  <p>생성된 게시판이 없습니다. 지도를 클릭해 새 보드를 생성해 보세요.</p>
                </div>
              ) : (
                <div className="boards-grid">
                  {boards.map((b) => (
                    <div key={b.id} className="board-card">
                      <div className="board-info">
                        <h3>{b.name || `보드 ${b.id}`}</h3>
                        <p className="board-coords">좌표: ({b.x}, {b.y})</p>
                      </div>
                      <div className="board-meta">
                        <span className="post-count-badge">글 {b.count || 0}개</span>
                        <Link href={`/board?id=${b.id}`} className="btn btn-secondary btn-sm">
                          이동하기
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Tab 2: Image Moderation Gallery */}
          {activeTab === 'moderation' && (
            <section className="card-section">
              <div className="section-header">
                <h2>업로드 이미지 목록 및 검열</h2>
                <button onClick={fetchImages} className="btn btn-secondary btn-sm" disabled={loadingImages}>
                  새로고침
                </button>
              </div>

              {loadingImages ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>서버에서 이미지를 불러오는 중...</p>
                </div>
              ) : images.length === 0 ? (
                <div className="empty-state">
                  <p>업로드된 이미지 파일이 없습니다.</p>
                </div>
              ) : (
                <div className="gallery-grid">
                  {images.map((img) => (
                    <div key={img.fileName} className="gallery-card">
                      <div className="image-wrapper">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.fileName} className="gallery-img" />
                        <span className={`status-badge ${img.isOrphaned ? 'badge-orphan' : 'badge-linked'}`}>
                          {img.isOrphaned ? '연결 없음 (Orphaned)' : '게시글 연결됨'}
                        </span>
                      </div>

                      <div className="gallery-details">
                        <p className="file-name" title={img.fileName}>{img.fileName}</p>

                        {!img.isOrphaned ? (
                          <div className="associated-posts">
                            {img.posts.map((post) => (
                              <div key={post.id} className="post-detail-box">
                                <p className="post-author">작성자: <strong>{post.author || '익명'}</strong></p>
                                <p className="post-body">{post.content}</p>
                                <div className="post-footer">
                                  <a 
                                    href={`/board?id=${post.boardId}#post-${post.id}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="post-link"
                                  >
                                    글 #{post.id} 바로가기 (새 탭)
                                  </a>
                                  <span className="post-date">{new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="orphan-desc">DB에 해당 이미지를 사용하는 게시글이 없습니다. 디스크 용량 정리를 위해 안전하게 파일 삭제가 가능합니다.</p>
                        )}

                        <div className="action-buttons-group">
                          {!img.isOrphaned ? (
                            <>
                              <button
                                onClick={() => setPendingAction({ fileName: img.fileName, action: 'clear-image-only', postInfo: img.posts[0] })}
                                className="btn btn-warning btn-sm btn-full"
                              >
                                이미지 파일만 삭제
                              </button>
                              <button
                                onClick={() => setPendingAction({ fileName: img.fileName, action: 'delete-post', postInfo: img.posts[0] })}
                                className="btn btn-danger btn-sm btn-full"
                              >
                                전체 게시글 삭제
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setPendingAction({ fileName: img.fileName, action: 'delete-file' })}
                              className="btn btn-danger btn-sm btn-full"
                            >
                              파일 완전 삭제
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Custom Moderation Confirm Modal */}
      {pendingAction && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>정말 삭제하시겠습니까?</h3>
            <div className="modal-body">
              <p>파일명: <code className="modal-filename">{pendingAction.fileName}</code></p>
              <div className="warning-box">
                {pendingAction.action === 'delete-post' && (
                  <p className="danger-text">⚠️ <strong>[전체 게시글 삭제]</strong>를 선택하셨습니다. DB에서 게시글 데이터가 완전히 삭제되고, 서버 디스크에서도 이미지 파일이 영구 삭제됩니다.</p>
                )}
                {pendingAction.action === 'clear-image-only' && (
                  <p className="warning-text">⚠️ <strong>[이미지 파일만 삭제]</strong>를 선택하셨습니다. 해당 게시글의 텍스트 내용은 그대로 유지되지만, 첨부된 이미지는 완전히 지워집니다.</p>
                )}
                {pendingAction.action === 'delete-file' && (
                  <p className="danger-text">⚠️ <strong>[파일 완전 삭제]</strong>를 선택하셨습니다. 연결이 유실된 이미지가 서버 디스크에서 영구히 지워집니다.</p>
                )}
              </div>
              {pendingAction.postInfo && (
                <div className="modal-post-preview">
                  <p><strong>작성자:</strong> {pendingAction.postInfo.author || '익명'}</p>
                  <p className="post-content-preview">"{pendingAction.postInfo.content}"</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setPendingAction(null)} className="btn btn-secondary">취소</button>
              <button onClick={handleConfirmDelete} className="btn btn-danger">확인 및 삭제</button>
            </div>
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
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 24px;
        }
        .header-brand h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }
        .badge-status {
          display: inline-block;
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 99px;
          padding: 2px 10px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 6px;
        }
        .dashboard-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 32px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 1px;
        }
        .tab-btn {
          background: none;
          border: none;
          color: #9ca3af;
          font-family: inherit;
          font-size: 16px;
          font-weight: 600;
          padding: 12px 24px;
          cursor: pointer;
          position: relative;
          transition: color 0.2s ease;
        }
        .tab-btn:hover {
          color: #f3f4f6;
        }
        .tab-btn.active {
          color: #3b82f6;
        }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #3b82f6;
        }
        .card-section {
          background: rgba(17, 24, 39, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .section-header h2 {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        .empty-state {
          text-align: center;
          padding: 60px 24px;
          color: #9ca3af;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }
        .boards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .board-card {
          background: rgba(31, 41, 55, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 140px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .board-card:hover {
          transform: translateY(-2px);
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        .board-info h3 {
          margin: 0 0 6px 0;
          font-size: 18px;
          font-weight: 600;
        }
        .board-coords {
          color: #9ca3af;
          font-size: 13px;
          margin: 0;
        }
        .board-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
        }
        .post-count-badge {
          font-size: 13px;
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 500;
        }
        
        /* Gallery Style */
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 28px;
        }
        .gallery-card {
          background: rgba(31, 41, 55, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: border-color 0.2s ease;
        }
        .gallery-card:hover {
          border-color: rgba(255, 255, 255, 0.1);
        }
        .image-wrapper {
          position: relative;
          height: 200px;
          overflow: hidden;
          background: #111827;
        }
        .gallery-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }
        .gallery-card:hover .gallery-img {
          transform: scale(1.02);
        }
        .status-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
        }
        .badge-orphan {
          background: #ef4444;
          color: white;
        }
        .badge-linked {
          background: #10b981;
          color: white;
        }
        .gallery-details {
          padding: 20px;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .file-name {
          font-size: 13px;
          color: #9ca3af;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0 0 16px 0;
          font-family: monospace;
          background: rgba(0, 0, 0, 0.15);
          padding: 4px 8px;
          border-radius: 4px;
        }
        .associated-posts {
          margin-bottom: 20px;
        }
        .post-detail-box {
          border-left: 3px solid #3b82f6;
          padding-left: 12px;
          margin-bottom: 12px;
        }
        .post-author {
          font-size: 13px;
          margin: 0 0 6px 0;
          color: #e5e7eb;
        }
        .post-body {
          font-size: 14px;
          color: #d1d5db;
          margin: 0 0 10px 0;
          line-height: 1.4;
          word-break: break-all;
        }
        .post-footer {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .post-link {
          color: #60a5fa;
          text-decoration: none;
        }
        .post-link:hover {
          text-decoration: underline;
        }
        .post-date {
          color: #6b7280;
        }
        .orphan-desc {
          font-size: 13px;
          color: #d1d5db;
          line-height: 1.5;
          margin: 0 0 20px 0;
        }
        .action-buttons-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .btn-full {
          width: 100%;
        }

        /* Buttons & Utilities */
        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
          border-radius: 6px;
        }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }
        .btn-danger {
          background: #ef4444;
          color: white;
        }
        .btn-danger:hover {
          background: #dc2626;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        .btn-danger-outline {
          background: none;
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
        }
        .btn-danger-outline:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: white;
        }
        .btn-warning {
          background: #f59e0b;
          color: white;
        }
        .btn-warning:hover {
          background: #d97706;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }
        .mr-2 {
          margin-right: 8px;
        }
        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 24px;
          font-size: 14px;
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          color: #9ca3af;
        }
        .spinner {
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Custom Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }
        .modal-box {
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 28px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          animation: modalSlideIn 0.2s ease-out;
        }
        @keyframes modalSlideIn {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-box h3 {
          margin: 0 0 16px 0;
          font-size: 20px;
          font-weight: 700;
          color: white;
        }
        .modal-filename {
          font-family: monospace;
          background: rgba(0, 0, 0, 0.3);
          padding: 3px 6px;
          border-radius: 4px;
          color: #60a5fa;
        }
        .warning-box {
          margin: 16px 0;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
        }
        .danger-text {
          background: rgba(239, 68, 68, 0.1);
          border-left: 4px solid #ef4444;
          padding: 10px;
          color: #fca5a5;
          margin: 0;
        }
        .warning-text {
          background: rgba(245, 158, 11, 0.1);
          border-left: 4px solid #f59e0b;
          padding: 10px;
          color: #fcd34d;
          margin: 0;
        }
        .modal-post-preview {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 12px;
          font-size: 13px;
          color: #9ca3af;
        }
        .post-content-preview {
          font-style: italic;
          color: #d1d5db;
          margin: 6px 0 0 0;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
      `}</style>
    </>
  )
}

