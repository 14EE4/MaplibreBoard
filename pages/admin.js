import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { formatTime } from '../lib/utils'

export default function Admin() {
  const router = useRouter()
  const [boards, setBoards] = useState([])
  const [authorized, setAuthorized] = useState(false)
  const [inputPw, setInputPw] = useState('')
  const [error, setError] = useState('')

  // New states for moderation
  const [activeTab, setActiveTab] = useState('boards') // 'boards', 'moderation', 'posts', 'logs', 'ip_bans'
  const [bannedIps, setBannedIps] = useState([])
  const [loadingBans, setLoadingBans] = useState(false)
  const [banInputIp, setBanInputIp] = useState('')
  const [banInputReason, setBanInputReason] = useState('')

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
    } else if (tabParam === 'logs') {
      setActiveTab('logs')
    } else if (tabParam === 'ip_bans') {
      setActiveTab('ip_bans')
    }
  }, [])

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
    let newTabParam = 'boards'
    if (tab === 'moderation') newTabParam = 'censorship'
    else if (tab === 'posts') newTabParam = 'posts'
    else if (tab === 'logs') newTabParam = 'logs'
    else if (tab === 'ip_bans') newTabParam = 'ip_bans'
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
  const [logs, setLogs] = useState({ out: '', err: '' })
  const [loadingLogs, setLoadingLogs] = useState(false)

  const stdoutRef = useRef(null)
  const stderrRef = useRef(null)

  useEffect(() => {
    if (activeTab === 'logs') {
      if (stdoutRef.current) {
        stdoutRef.current.scrollTop = stdoutRef.current.scrollHeight;
      }
      if (stderrRef.current) {
        stderrRef.current.scrollTop = stderrRef.current.scrollHeight;
      }
    }
  }, [logs, activeTab])

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
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setBoards(Array.isArray(data) ? data : []))
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
  useEffect(() => {
    if (!authorized || activeTab !== 'logs') return
    fetchLogs()
  }, [authorized, activeTab])

  useEffect(() => {
    if (!authorized || activeTab !== 'ip_bans') return
    fetchBannedIps()
  }, [authorized, activeTab])

  async function fetchBannedIps() {
    setLoadingBans(true)
    setModerationError('')
    try {
      const res = await fetch(`/api/admin/ip-bans?auth=${encodeURIComponent(inputPw)}`)
      if (res.ok) {
        const data = await res.json()
        setBannedIps(data)
      } else {
        const err = await res.json()
        setModerationError(err.error || 'Failed to load banned IPs.')
      }
    } catch (err) {
      console.error(err)
      setModerationError('Failed to communicate with server.')
    } finally {
      setLoadingBans(false)
    }
  }

  async function handleBanIp(ip, postId, reason) {
    setModerationError('')
    try {
      const res = await fetch(`/api/admin/ip-bans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auth: inputPw,
          ip,
          postId,
          reason
        })
      })
      if (res.ok) {
        alert('IP 차단이 완료되었습니다.')
        setBanInputIp('')
        setBanInputReason('')
        fetchBannedIps()
        if (activeTab === 'posts') {
          fetchPosts()
        }
      } else {
        const err = await res.json()
        alert(err.error || 'IP 차단에 실패했습니다.')
      }
    } catch (err) {
      console.error(err)
      alert('서버와 통신에 실패했습니다.')
    }
  }

  async function handleUnbanIp(ipToUnban) {
    if (!confirm(`${ipToUnban} 차단을 해제하시겠습니까?`)) return
    setModerationError('')
    try {
      const res = await fetch(`/api/admin/ip-bans?auth=${encodeURIComponent(inputPw)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip: ipToUnban })
      })
      if (res.ok) {
        alert('차단이 해제되었습니다.')
        fetchBannedIps()
      } else {
        const err = await res.json()
        alert(err.error || '차단 해제에 실패했습니다.')
      }
    } catch (err) {
      console.error(err)
      alert('서버와 통신에 실패했습니다.')
    }
  }

  async function fetchLogs() {
    setLoadingLogs(true)
    setModerationError('')
    try {
      const res = await fetch(`/api/admin/logs?auth=${encodeURIComponent(inputPw)}`)
      if (res.ok) {
        const data = await res.json()
        setLogs({ out: data.out, err: data.err })
      } else {
        const err = await res.json()
        setModerationError(err.error || 'Failed to load PM2 logs.')
      }
    } catch (err) {
      console.error(err)
      setModerationError('Failed to communicate with server.')
    } finally {
      setLoadingLogs(false)
    }
  }

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
        setModerationError(err.error || 'Failed to load posts.')
      }
    } catch (err) {
      console.error(err)
      setModerationError('Failed to communicate with server.')
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
        setModerationError(err.error || 'Failed to load images.')
      }
    } catch (err) {
      console.error(err)
      setModerationError('Failed to communicate with server.')
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
        try {
          const errData = await res.json()
          setError(errData.error || 'Incorrect password.')
        } catch (e) {
          setError('Incorrect password.')
        }
      }
    } catch (err) {
      console.error(err)
      setError('Failed to communicate with server.')
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
    setLogs({ out: '', err: '' })
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
        setModerationError(err.error || 'Failed to delete.')
      }
    } catch (err) {
      console.error(err)
      setModerationError('An error occurred while communicating with server.')
    } finally {
      setPendingAction(null)
    }
  }

  if (!authorized) {
    return (
      <>
        <Head>
          <title>Admin Login - MaplibreBoard</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
        </Head>
        <main className="login-container">
          <div className="login-card">
            <h1>MaplibreBoard Admin</h1>
            <p className="subtitle">Please enter admin password.</p>
            <form onSubmit={submitPw}>
              <input
                type="password"
                placeholder="Password"
                value={inputPw}
                onChange={(e) => setInputPw(e.target.value)}
                className="input-field"
                required
              />
              <button type="submit" className="btn btn-primary btn-block" title="관리자 인증">🔒</button>
            </form>
            <div style={{ marginTop: '16px' }}>
              <a href="/" className="btn btn-secondary btn-sm btn-full" title="Home">🏠</a>
            </div>
            {error && <p className="error-msg">{error}</p>}
          </div>
        </main>

      </>
    )
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - MaplibreBoard</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <main className="dashboard-container">
        {/* Navigation Header */}
        <header className="dashboard-header">
          <div className="header-brand">
            <h1>MaplibreBoard Admin</h1>
          </div>
          <div className="header-actions">
            <a href="/" className="btn btn-secondary mr-2" title="Home">🏠</a>
            <button onClick={logout} className="btn btn-danger-outline">Logout</button>
          </div>
        </header>

        {/* Dashboard Tabs */}
        <nav className="dashboard-tabs">
          <button
            onClick={() => handleTabChange('boards')}
            className={`tab-btn ${activeTab === 'boards' ? 'active' : ''}`}
          >
            Boards ({boards.length})
          </button>
          <button
            onClick={() => handleTabChange('moderation')}
            className={`tab-btn ${activeTab === 'moderation' ? 'active' : ''}`}
          >
            Images
          </button>
          <button
            onClick={() => handleTabChange('posts')}
            className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          >
            Posts & IPs
          </button>
          <button
            onClick={() => handleTabChange('logs')}
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          >
            Logs
          </button>
          <button
            onClick={() => handleTabChange('ip_bans')}
            className={`tab-btn ${activeTab === 'ip_bans' ? 'active' : ''}`}
          >
            IP Bans ({bannedIps.length})
          </button>
        </nav>

        <div className="dashboard-content">
          {moderationError && <div className="alert-error">{moderationError}</div>}

          {/* Tab 1: Boards List */}
          {activeTab === 'boards' && (
            <section className="card-section">
              <div className="section-header">
                <h2>Boards</h2>
                <Link href="/board" className="btn btn-primary btn-sm">Open New Board</Link>
              </div>
              {boards.length === 0 ? (
                <div className="empty-state">
                <p>No boards created yet. Click on the map to create a new board.</p>
                </div>
              ) : (
                <div className="boards-grid">
                  {boards.map((b) => (
                    <div key={b.id} className="board-card">
                      <div className="board-info">
                        <h3>{b.name || `Board ${b.id}`}</h3>
                        <p className="board-coords">Coordinates: ({b.x}, {b.y})</p>
                      </div>
                      <div className="board-meta">
                        <span className="post-count-badge">{b.count || 0} posts</span>
                        <Link href={`/board?id=${b.id}`} className="btn btn-secondary btn-sm">
                          Go
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
                <h2>Uploaded Images & Moderation</h2>
                <button onClick={fetchImages} className="btn btn-secondary btn-sm" disabled={loadingImages}>
                  Refresh
                </button>
              </div>

              {loadingImages ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading images from server...</p>
                </div>
              ) : images.length === 0 ? (
                <div className="empty-state">
                  <p>No uploaded images.</p>
                </div>
              ) : (
                <div className="gallery-grid">
                  {images.map((img) => (
                    <div key={img.fileName} className="gallery-card">
                      <div className="image-wrapper">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.fileName} className="gallery-img" />
                        <span className={`status-badge ${img.isOrphaned ? 'badge-orphan' : 'badge-linked'}`}>
                          {img.isOrphaned ? 'Orphaned (No Post)' : 'Linked to Post'}
                        </span>
                      </div>

                      <div className="gallery-details">
                        <p className="file-name" title={img.fileName}>{img.fileName}</p>

                        {!img.isOrphaned ? (
                          <div className="associated-posts">
                            {img.posts.map((post) => (
                              <div key={post.id} className="post-detail-box">
                                <p className="post-author">Author: <strong>{post.author || 'Anonymous'}</strong></p>
                                <p className="post-body">{post.content}</p>
                                <div className="post-footer">
                                  <a 
                                    href={`/board?id=${post.boardId}#post-${post.id}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="post-link"
                                  >
                                    Go to post #{post.id} (New Tab)
                                  </a>
                                  <span className="post-date">{post.created_at ? formatTime(post.created_at) : 'No Record'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="orphan-desc">No database posts use this image. It can be safely deleted to free disk space.</p>
                        )}

                        <div className="action-buttons-group">
                          {!img.isOrphaned ? (
                            <>
                              <button
                                onClick={() => setPendingAction({ fileName: img.fileName, action: 'clear-image-only', postInfo: img.posts[0] })}
                                className="btn btn-warning btn-sm btn-full"
                              >
                                Delete Image Only
                              </button>
                              <button
                                onClick={() => setPendingAction({ fileName: img.fileName, action: 'delete-post', postInfo: img.posts[0] })}
                                className="btn btn-danger btn-sm btn-full"
                              >
                                Delete Entire Post
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setPendingAction({ fileName: img.fileName, action: 'delete-file' })}
                              className="btn btn-danger btn-sm btn-full"
                            >
                              Permanently Delete File
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
                <h2>All Posts & Author IP List</h2>
                <button onClick={fetchPosts} className="btn btn-secondary btn-sm" disabled={loadingPosts}>
                  Refresh
                </button>
              </div>

              {loadingPosts ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading posts from server...</p>
                </div>
              ) : allPosts.length === 0 ? (
                <div className="empty-state">
                  <p>No posts registered.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Board Name</th>
                        <th>Author</th>
                        <th>Content</th>
                        <th>Author IP</th>
                        <th>Device / Browser</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPosts.map((post) => (
                        <tr key={post.id}>
                          <td>
                            <a
                              href={`/board?id=${post.board_id}#post-${post.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-link"
                            >
                              #{post.id}
                            </a>
                          </td>
                          <td>
                            <a
                              href={`/board?id=${post.board_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-link"
                            >
                              {post.board_name || 'Unnamed'}
                              {post.board_x !== null && post.board_y !== null ? ` (${post.board_x}, ${post.board_y})` : ''}
                            </a>
                          </td>
                          <td><strong>{post.author || 'Anonymous'}</strong></td>
                          <td className="table-post-content" title={post.content}>
                            {post.content}
                          <td>
                            <code className="ip-badge">{post.ip || 'No Record'}</code>
                            {post.ip && (
                              <button
                                onClick={() => {
                                  const customReason = prompt(`차단 사유를 기입하세요 (해당 글의 일부 내용이 자동으로 첨부됩니다):\n\n글 내용: "${post.content ? post.content.substring(0, 30) + '...' : ''}"`)
                                  if (customReason === null) return;
                                  handleBanIp(null, post.id, customReason)
                                }}
                                className="btn btn-danger-outline btn-xs"
                                style={{ padding: '2px 6px', fontSize: '11px', marginLeft: '6px', cursor: 'pointer' }}
                                title="Ban writer's IP"
                              >
                                🚫 Ban
                              </button>
                            )}
                            {post.location && (
                              <span className="location-badge">{post.location}</span>
                            )}
                          </td>

                            {post.os && post.browser ? (
                              <span className="ua-badge">{post.os} / {post.browser}</span>
                            ) : (
                              <code className="ip-badge">No Record</code>
                            )}
                          </td>
                          <td>{post.created_at ? formatTime(post.created_at) : 'No Record'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Tab 4: PM2 System Logs */}
          {activeTab === 'logs' && (
            <section className="card-section">
              <div className="section-header">
                <h2>Real-time PM2 Server Logs (Last 200 lines)</h2>
                <button onClick={fetchLogs} className="btn btn-secondary btn-sm" disabled={loadingLogs}>
                  Refresh
                </button>
              </div>

              {loadingLogs ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Reading logs from server...</p>
                </div>
              ) : (
                <div className="logs-container">
                  <div className="log-viewer-box">
                    <div className="log-viewer-header">
                      <div className="log-viewer-title title-stdout">Standard Output Logs (Stdout)</div>
                    </div>
                    <pre ref={stdoutRef} className="log-viewer-content">
                      {logs.out || 'Logs are empty or no records exist.'}
                    </pre>
                  </div>

                  <div className="log-viewer-box">
                    <div className="log-viewer-header">
                      <div className="log-viewer-title title-stderr">Error Output Logs (Stderr)</div>
                    </div>
                    <pre ref={stderrRef} className="log-viewer-content">
                      {logs.err || 'Error logs are empty or no records exist.'}
                    </pre>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Tab 5: IP Bans Management */}
          {activeTab === 'ip_bans' && (
            <section className="card-section">
              <div className="section-header">
                <h2>IP Ban Management</h2>
                <button onClick={fetchBannedIps} className="btn btn-secondary btn-sm" disabled={loadingBans}>
                  Refresh
                </button>
              </div>

              {/* Manual IP Ban Form */}
              <div className="ban-form-container" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Direct IP Ban</h3>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (!banInputIp.trim()) {
                    alert('IP 주소를 입력하세요.')
                    return
                  }
                  handleBanIp(banInputIp.trim(), null, banInputReason.trim())
                }} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#9ca3af' }}>IP Address</label>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.0.1"
                      value={banInputIp}
                      onChange={(e) => setBanInputIp(e.target.value)}
                      className="form-control"
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '6px 12px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '200px' }}>
                    <label style={{ fontSize: '12px', color: '#9ca3af' }}>Ban Reason</label>
                    <input
                      type="text"
                      placeholder="Reason for ban"
                      value={banInputReason}
                      onChange={(e) => setBanInputReason(e.target.value)}
                      className="form-control"
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '6px 12px' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-danger" style={{ height: '38px', padding: '0 16px', borderRadius: '4px' }}>🚫 Ban IP</button>
                </form>
              </div>

              {/* Banned IP List */}
              {loadingBans ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading banned IPs...</p>
                </div>
              ) : bannedIps.length === 0 ? (
                <div className="empty-state">
                  <p>No banned IPs found.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>IP Address</th>
                        <th>Reason</th>
                        <th>Banned At</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bannedIps.map((ban) => (
                        <tr key={ban.id}>
                          <td><code className="ip-badge" style={{ fontSize: '13px' }}>{ban.ip}</code></td>
                          <td style={{ color: '#e5e7eb' }}>{ban.reason}</td>
                          <td style={{ color: '#9ca3af' }}>{ban.created_at ? formatTime(ban.created_at) : 'No Record'}</td>
                          <td>
                            <button
                              onClick={() => handleUnbanIp(ban.ip)}
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#f3f4f6', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                            >
                              Unban
                            </button>
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
            <h3>Are you sure you want to delete?</h3>
            <div className="modal-body">
              <p>Filename: <code className="modal-filename">{pendingAction.fileName}</code></p>
              <div className="warning-box">
                {pendingAction.action === 'delete-post' && (
                  <p className="danger-text">⚠️ <strong>[Delete Entire Post]</strong> Selected. Database record and the image file on server disk will be permanently deleted.</p>
                )}
                {pendingAction.action === 'clear-image-only' && (
                  <p className="warning-text">⚠️ <strong>[Delete Image Only]</strong> Selected. The post text will remain, but the image will be permanently removed.</p>
                )}
                {pendingAction.action === 'delete-file' && (
                  <p className="danger-text">⚠️ <strong>[Permanently Delete File]</strong> Selected. The orphaned file will be permanently removed from server disk.</p>
                )}
              </div>
              {pendingAction.postInfo && (
                <div className="modal-post-preview">
                  <p><strong>Author:</strong> {pendingAction.postInfo.author || 'Anonymous'}</p>
                  <p className="post-content-preview">"{pendingAction.postInfo.content}"</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setPendingAction(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleConfirmDelete} className="btn btn-danger">Confirm & Delete</button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}

