import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'

export default function Admin() {
  const router = useRouter()
  const [boards, setBoards] = useState([])
  const [authorized, setAuthorized] = useState(false)
  const [inputPw, setInputPw] = useState('')
  const [error, setError] = useState('')

  // New states for moderation
  const [activeTab, setActiveTab] = useState('boards') // 'boards' or 'moderation'

  useEffect(() => {
    // Parse query parameter to set initial active tab
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam === 'censorship') {
      setActiveTab('moderation')
    } else if (tabParam === 'boards') {
      setActiveTab('boards')
    } else if (tabParam === 'posts') {
      setActiveTab('posts')
    }
  }, [])

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
    let newTabParam = 'boards'
    if (tab === 'moderation') newTabParam = 'censorship'
    else if (tab === 'posts') newTabParam = 'posts'
    try {
      if (router && typeof router.push === 'function') {
        router.push({
          pathname: '/admin',
          query: { tab: newTabParam }
        }, undefined, { shallow: true })
      } else {
        window.history.pushState(null, '', `/admin?tab=${newTabParam}`)
      }
    } catch (e) {
      window.history.pushState(null, '', `/admin?tab=${newTabParam}`)
    }
  }, [router])
  const [images, setImages] = useState([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) // { fileName, action, postInfo }
  const [moderationError, setModerationError] = useState('')
  const [allPosts, setAllPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)

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

  useEffect(() => {
    if (!authorized || activeTab !== 'posts') return
    fetchPosts()
  }, [authorized, activeTab])

  async function fetchPosts() {
    setLoadingPosts(true)
    setModerationError('')
    try {
      const res = await fetch(`/api/admin/posts?auth=${encodeURIComponent(inputPw)}`)
      if (res.ok) {
        const data = await res.json()
        setAllPosts(data)
      } else {
        const err = await res.json()
        setModerationError(err.error || '게시글 목록을 불러오지 못했습니다.')
      }
    } catch (err) {
      console.error(err)
      setModerationError('서버 통신에 실패했습니다.')
    } finally {
      setLoadingPosts(false)
    }
  }

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
    setAllPosts([])
    handleTabChange('boards')
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
            onClick={() => handleTabChange('boards')}
            className={`tab-btn ${activeTab === 'boards' ? 'active' : ''}`}
          >
            게시판 목록 ({boards.length})
          </button>
          <button
            onClick={() => handleTabChange('moderation')}
            className={`tab-btn ${activeTab === 'moderation' ? 'active' : ''}`}
          >
            이미지 검열 및 관리
          </button>
          <button
            onClick={() => handleTabChange('posts')}
            className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          >
            전체 게시글 및 IP 관리
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

          {/* Tab 3: All Posts and IP List */}
          {activeTab === 'posts' && (
            <section className="card-section">
              <div className="section-header">
                <h2>전체 게시글 및 작성자 IP 목록</h2>
                <button onClick={fetchPosts} className="btn btn-secondary btn-sm" disabled={loadingPosts}>
                  새로고침
                </button>
              </div>

              {loadingPosts ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>서버에서 게시글을 불러오는 중...</p>
                </div>
              ) : allPosts.length === 0 ? (
                <div className="empty-state">
                  <p>등록된 게시글이 없습니다.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>글 번호</th>
                        <th>게시판 이름</th>
                        <th>작성자</th>
                        <th>내용</th>
                        <th>작성자 IP</th>
                        <th>기기 / 브라우저</th>
                        <th>작성 일시</th>
                        <th>링크</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPosts.map((post) => (
                        <tr key={post.id}>
                          <td>#{post.id}</td>
                          <td>
                            {post.board_name || '이름 없음'}
                            {post.board_x !== null && post.board_y !== null ? ` (${post.board_x}, ${post.board_y})` : ''}
                          </td>
                          <td><strong>{post.author || '익명'}</strong></td>
                          <td className="table-post-content" title={post.content}>
                            {post.content}
                          </td>
                          <td>
                            <code className="ip-badge">{post.ip || '기록 없음'}</code>
                          </td>
                          <td>
                            {post.os && post.browser ? (
                              <span className="ua-badge">{post.os} / {post.browser}</span>
                            ) : (
                              <code className="ip-badge">기록 없음</code>
                            )}
                          </td>
                          <td>{new Date(post.created_at).toLocaleString()}</td>
                          <td>
                            <a
                              href={`/board?id=${post.board_id}#post-${post.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-link"
                            >
                              바로가기
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

    </>
  )
}

