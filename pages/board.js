import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Board() {
  const router = useRouter()
  const { id, grid_x, grid_y } = router.query

  useEffect(()=>{
    // quick debug logs to help track down `p(...) is not a function` errors
    try {
      console.log('Board component init', { id, grid_x, grid_y, routerType: typeof router, routerReplace: router && typeof router.replace === 'function' })
    } catch(e) { console.warn('Board init log failed', e) }

    function onError(e) {
      console.error('Global error captured in board page:', e)
    }
    function onUnhandledRejection(e) {
      console.error('Unhandled promise rejection on board page:', e)
    }
    window.addEventListener && window.addEventListener('error', onError)
    window.addEventListener && window.addEventListener('unhandledrejection', onUnhandledRejection)
    return ()=>{
      window.removeEventListener && window.removeEventListener('error', onError)
      window.removeEventListener && window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [id, grid_x, grid_y, router])

  const [resolvedBoardId, setResolvedBoardId] = useState(null)
  const [boardMeta, setBoardMeta] = useState(null)
  const [metaText, setMetaText] = useState('로드 중...')
  const [posts, setPosts] = useState([])
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [postPassword, setPostPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState({}) // { postId: { editing: true, value: '...' } }
  const [imagePreview, setImagePreview] = useState(null)
  const [lightboxImage, setLightboxImage] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 첨부할 수 있습니다.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    const fileInput = document.getElementById('imageInput')
    if (fileInput) fileInput.value = ''
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

  const formatTime = (ts) => {
    if (!ts) return ''
    try { return new Date(ts).toLocaleString() } catch (e) { return ts }
  }

  const loadPosts = useCallback(async (boardId) => {
    if (!boardId) return
    setLoading(true)
    try {
      // use centralized posts API which accepts a board_id query param
      // cache bust + no-store to avoid stale list right after 작성
      const url = `/api/posts?board_id=${encodeURIComponent(boardId)}&t=${Date.now()}`
      const res = await fetch(url, { cache: 'no-store' })
      const list = await res.json()
      setPosts(Array.isArray(list) ? list : [])
      setMetaText('')
    } catch (err) {
      console.error('posts fetch failed', err)
      setMetaText('게시글을 불러오지 못했습니다. 콘솔 확인')
    } finally { setLoading(false) }
  }, [])

  const loadBoardById = useCallback((boardId) => {
    setResolvedBoardId(boardId)
    setMetaText('보드 로드 중...')
    // query server for single board by id (server supports ?id=)
    ;(async function(){
      try {
        const res = await fetch(`/api/boards?id=${encodeURIComponent(boardId)}`)
        if (res.status === 200) {
          const obj = await res.json()
          setBoardMeta(obj)
          setMetaText('')
          loadPosts(boardId)
        } else if (res.status === 404) {
          setBoardMeta(null)
          setMetaText(`보드를 찾을 수 없습니다 (id:${boardId})`)
        } else {
          const body = await res.text().catch(()=>null)
          console.warn('board id fetch unexpected', res.status, body)
          setBoardMeta(null)
          setMetaText('보드 메타를 불러오지 못했습니다. 콘솔 확인')
        }
      } catch (err) {
        console.warn('board meta load failed', err)
        setBoardMeta(null)
        setMetaText('보드 메타를 불러오지 못했습니다. 콘솔 확인')
      }
    })()
  }, [loadPosts])

  const loadBoardByGrid = useCallback(async (gx, gy) => {
    setMetaText('격자 보드 조회 중...')
    try {
      const res = await fetch(`/api/boards?grid_x=${encodeURIComponent(gx)}&grid_y=${encodeURIComponent(gy)}`)
      if (res.status === 200) {
        const obj = await res.json()
        setResolvedBoardId(obj.id)
        setBoardMeta(obj)
        setMetaText(`grid: ${gx},${gy}`)
        loadPosts(obj.id)
      } else if (res.status === 404) {
        setMetaText(`해당 격자의 게시판을 찾을 수 없습니다 (grid:${gx},${gy}).`)
        setResolvedBoardId(null)
        setBoardMeta(null)
      } else {
        const body = await res.text().catch(()=>null)
        console.warn('board grid fetch unexpected', res.status, body)
        setMetaText('보드 메타를 불러오지 못했습니다. 콘솔 확인')
      }
    } catch (err) {
      console.error('boards fetch failed', err)
      setMetaText('보드 목록을 불러오지 못했습니다. 콘솔 확인')
    }
  }, [loadPosts])

  useEffect(() => {
    // entry: on query change
    if (id) loadBoardById(id)
    else if (grid_x != null && grid_y != null) loadBoardByGrid(grid_x, grid_y)
    else setMetaText('URL에 ?id=BOARD_ID 또는 ?grid_x=NUM&grid_y=NUM 를 추가하세요.')
  }, [id, grid_x, grid_y, loadBoardById, loadBoardByGrid])

  async function submitPost() {
    if (!resolvedBoardId) { alert('게시판이 선택되지 않았습니다. URL에 id 또는 grid_x/grid_y를 지정하세요.'); return }
    const authorVal = (author || null)
    const contentVal = (content || '').trim()
    const pw = (postPassword || '').trim()
    if (!contentVal) { alert('내용을 입력하세요.'); return }

    setLoading(true)
    try {
      let finalImageUrl = null

      // If an image is selected, upload it first
      if (imagePreview) {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imagePreview })
        })
        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json().catch(() => ({}))
          throw new Error(uploadErr.error || '이미지 업로드에 실패했습니다.')
        }
        const uploadData = await uploadRes.json()
        finalImageUrl = uploadData.url
      }

      const payload = { author: authorVal, content: contentVal }
      if (pw) payload.password = pw
      if (finalImageUrl) payload.image_url = finalImageUrl

      // use central posts API: provide board_id in body
      const fullPayload = { ...payload, board_id: Number(resolvedBoardId) }
      const res = await fetch(`/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullPayload)
      })

      const text = await res.text()
      let body = null
      try { body = text ? JSON.parse(text) : null } catch (e) { body = { error: text } }

      if (!res.ok) {
        console.error('post failed', res.status, body)
        const msg = (body && body.error) ? `작성 실패: ${body.error}` : `작성 실패 (HTTP ${res.status})`
        alert(msg)
        return
      }

      // 성공 처리
      console.log('post success', body)
      setContent('')
      setPostPassword('')
      setImagePreview(null)
      const fileInput = document.getElementById('imageInput')
      if (fileInput) fileInput.value = ''

      try {
        // 새 글 작성 후 전체 페이지 새로고침으로 최신 상태 반영
        window.location.reload()
      } catch (e) {
        loadPosts(resolvedBoardId)
      }
    } catch (err) {
      console.error('post failed', err)
      alert(err.message || '작성 실패. 콘솔을 확인하세요.')
    } finally {
      setLoading(false)
    }
  }

  async function createBoardAndOpen(name) {
    try {
      setLoading(true)
      const body = { name: name || `board-${Date.now()}` }
      // include grid center if available in query
      if (grid_x != null && grid_y != null) {
        const size = 5 // default grid size used elsewhere (best-effort)
        body.grid_x = Number(grid_x)
        body.grid_y = Number(grid_y)
        body.center_lng = Number(grid_x) * size - 180 + size/2
        body.center_lat = Number(grid_y) * size - 90 + size/2
      }
      const res = await fetch('/api/boards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json()
      if (!res.ok) throw j
      // navigate to new board
      const newId = j && j.id ? j.id : null
      if (newId) {
        // if grid coordinates were provided in the query, prefer navigating to the grid form
        if (grid_x != null && grid_y != null) {
          const qgx = encodeURIComponent(grid_x)
          const qgy = encodeURIComponent(grid_y)
          try {
            if (router && typeof router.replace === 'function') {
              router.replace(`/board?grid_x=${qgx}&grid_y=${qgy}`)
            } else {
              window.location.href = `/board?grid_x=${qgx}&grid_y=${qgy}`
            }
          } catch (navErr) {
            console.warn('router replace failed, falling back', navErr)
            window.location.href = `/board?grid_x=${qgx}&grid_y=${qgy}`
          }
        } else {
          // fallback to id-based navigation if no grid coords available
          try {
            if (router && typeof router.replace === 'function') {
              router.replace(`/board?id=${encodeURIComponent(newId)}`)
            } else {
              window.location.href = `/board?id=${encodeURIComponent(newId)}`
            }
          } catch (navErr) {
            console.warn('router replace failed, falling back', navErr)
            window.location.href = `/board?id=${encodeURIComponent(newId)}`
          }
        }
      } else {
        // fallback: reload current
        window.location.reload()
      }
    } catch (err) {
      console.error('create board failed', err)
      alert((err && err.error) ? err.error : '보드 생성 실패')
    } finally {
      setLoading(false)
    }
  }

  async function verifyAndEdit(postId) {
    const pw = (document.getElementById(`pwd-${postId}`)?.value || '').trim()
    if (!pw) { alert('수정을 위해 비밀번호를 입력하세요.'); return }
    try {
      const res = await fetch(`/api/posts/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: postId, password: pw }) })
      if (!res.ok) {
        const j = await res.json().catch(()=>({})); throw j
      }
      // enter edit mode
      const post = posts.find(p=>p.id===postId)
      setEditing(e => ({ ...e, [postId]: { editing: true, value: post ? (post.content||'') : '' } }))
    } catch (err) { console.error('verify failed', err); alert((err && err.error) ? err.error : '비밀번호가 일치하지 않습니다.') }
  }

  async function saveEdit(postId) {
    const pw = (document.getElementById(`pwd-${postId}`)?.value || '').trim()
    if (!pw) { alert('수정을 위해 비밀번호를 입력하세요.'); return }
    const newContent = (editing[postId] && editing[postId].value || '').trim()
    if (!newContent) { alert('내용을 입력하세요.'); return }
    try {
      const res = await fetch(`/api/posts`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: postId, password: pw, content: newContent, author: (author || null) }) })
      if (!res.ok) {
        const j = await res.json().catch(()=>({})); throw j
      }
      setEditing(e => { const copy = { ...e }; delete copy[postId]; return copy })
      loadPosts(resolvedBoardId)
    } catch (err) { console.error('update failed', err); alert((err && err.error) ? err.error : '수정 실패(비밀번호 확인)') }
  }

  async function deletePost(postId) {
    const pw = (document.getElementById(`pwd-${postId}`)?.value || '').trim()
    if (!pw) { alert('삭제를 위해 비밀번호를 입력하세요.'); return }
    if (!confirm('정말로 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/posts?id=${encodeURIComponent(postId)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
      if (!res.ok) {
        const j = await res.json().catch(()=>({})); throw j
      }
      loadPosts(resolvedBoardId)
    } catch (err) { console.error('delete failed', err); alert((err && err.error) ? err.error : '삭제 실패(비밀번호 확인)') }
  }

  return (
    <>
      <Head>
        <title>{boardMeta ? `${boardMeta.name} - MaplibreBoard` : '게시판'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <main className="board-container">
        {/* Header Navigation */}
        <header className="board-header">
          <div className="header-back">
            <button onClick={() => window.location.href = '/map'} className="btn btn-secondary btn-sm">
              ← 지도 보기
            </button>
            <button onClick={() => window.location.href = '/'} className="btn btn-secondary btn-sm ml-2">
              메인으로
            </button>
          </div>
          <div className="header-brand">
            <h1>격자 게시판</h1>
          </div>
        </header>

        <div className="board-layout">
          {/* Left Column: Board Metadata */}
          <aside className="board-sidebar">
            <div className="sidebar-card">
              <h2>게시판 정보</h2>
              <div className="meta-info-text">{metaText}</div>
              
              {boardMeta ? (
                <div className="meta-details">
                  <div className="meta-row">
                    <span className="meta-label">보드 ID</span>
                    <span className="meta-val">{resolvedBoardId || boardMeta.id || '(알 수 없음)'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">보드 이름</span>
                    <span className="meta-val highlight-text">{boardMeta.name || '(이름 없음)'}</span>
                  </div>
                  {((boardMeta.grid_x != null) || (boardMeta.x != null)) && (
                    <div className="meta-row">
                      <span className="meta-label">격자 좌표</span>
                      <span className="meta-val">({(boardMeta.grid_x != null) ? boardMeta.grid_x : boardMeta.x}, {(boardMeta.grid_y != null) ? boardMeta.grid_y : boardMeta.y})</span>
                    </div>
                  )}
                  {((boardMeta.posts_count != null) || (boardMeta.count != null)) && (
                    <div className="meta-row">
                      <span className="meta-label">게시물 수</span>
                      <span className="meta-val badge-count">{(boardMeta.posts_count != null) ? boardMeta.posts_count : boardMeta.count}개</span>
                    </div>
                  )}
                  {((boardMeta.center_lng != null) || (boardMeta.lng != null)) && (
                    <div className="meta-row">
                      <span className="meta-label">중심 좌표</span>
                      <span className="meta-val">
                        {((boardMeta.center_lng != null) ? boardMeta.center_lng : boardMeta.lng).toFixed(4)}, {((boardMeta.center_lat != null) ? boardMeta.center_lat : boardMeta.lat).toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                !loading && (
                  <div className="empty-board-setup">
                    <p>현재 격자에 활성화된 게시판 보드가 없거나 아직 데이터베이스에 등록되어 있지 않습니다.</p>
                    <div className="setup-buttons">
                      <button onClick={() => createBoardAndOpen()} className="btn btn-primary btn-sm btn-full mb-2">
                        기본 보드 생성 및 열기
                      </button>
                      <button 
                        onClick={() => {
                          const name = (typeof window !== 'undefined' && typeof window.prompt === 'function') 
                            ? window.prompt('생성할 보드 이름을 입력하세요', '새 보드') 
                            : null
                          createBoardAndOpen(name)
                        }} 
                        className="btn btn-secondary btn-sm btn-full"
                      >
                        이름 직접 지정하여 생성
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="info-helper-box">
              <p>💡 <strong>안내:</strong> 격자별 좌표(X, Y) 쿼리 파라미터를 통해 페이지로 다이렉트 접근이 가능합니다.</p>
              <code>예: /board?grid_x=61&grid_y=25</code>
            </div>
          </aside>

          {/* Right Column: Feed and Writing Form */}
          <section className="board-main-content">
            {boardMeta && (
              <>
                {/* Write Post Card */}
                <div className="write-card">
                  <h3>새 글 작성</h3>
                  <div className="write-form">
                    <input 
                      id="author" 
                      placeholder="작성자 닉네임 (선택)" 
                      value={author} 
                      onChange={e => setAuthor(e.target.value)} 
                      className="input-field" 
                    />
                    <textarea 
                      id="content" 
                      placeholder="따뜻한 한 마디를 적어보세요... (Ctrl+Enter로 즉시 전송)" 
                      value={content} 
                      onChange={e => setContent(e.target.value)} 
                      onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submitPost(); } }}
                      className="textarea-field"
                    />

                    {/* Image Upload Area */}
                    <div className="upload-wrapper">
                      <label htmlFor="imageInput" className="btn btn-secondary btn-sm upload-btn">
                        📷 사진 첨부하기
                      </label>
                      <input id="imageInput" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                      
                      {imagePreview && (
                        <div className="image-preview-box">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imagePreview} alt="업로드 미리보기" className="preview-img" />
                          <button onClick={handleRemoveImage} className="remove-preview-btn" title="사진 제거">
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="form-footer">
                      <div className="pwd-input-group">
                        <input 
                          id="postPassword" 
                          type="password"
                          placeholder="수정용 비밀번호 (선택)" 
                          maxLength={4} 
                          value={postPassword} 
                          onChange={e => setPostPassword(e.target.value)} 
                          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submitPost(); } }}
                          className="input-field pwd-field" 
                        />
                        <span className="pwd-helper">* 입력 시 추후 수정/삭제 가능</span>
                      </div>
                      
                      <button id="submitPost" onClick={submitPost} disabled={loading} className="btn btn-primary">
                        {loading ? '전송 중...' : '게시글 등록'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Posts Timeline List */}
                <div className="posts-timeline">
                  <h3>최신 게시글 피드</h3>
                  
                  {loading && <div className="timeline-state">불러오는 중...</div>}
                  {!loading && posts.length === 0 && (
                    <div className="empty-timeline">
                      <p>아직 등록된 게시물이 없습니다. 첫 번째 글을 작성해 보세요!</p>
                    </div>
                  )}

                  <div className="posts-list">
                    {posts.map(p => (
                      <div key={p.id} className="post-card">
                        <div className="post-header">
                          <span className="post-author">{p.author ? escapeHtml(p.author) : '익명'}</span>
                          <span className="post-date">{p.createdAt ? formatTime(p.createdAt) : ''}</span>
                        </div>

                        <div className="post-body">
                          {editing[p.id] && editing[p.id].editing ? (
                            <textarea 
                              className="textarea-field edit-textarea"
                              value={editing[p.id].value} 
                              onChange={ev => setEditing(prev => ({ ...prev, [p.id]: { editing: true, value: ev.target.value } }))} 
                              onKeyDown={ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); saveEdit(p.id); } }} 
                            />
                          ) : (
                            <>
                              <p className="post-text" dangerouslySetInnerHTML={{ __html: escapeHtml(p.content || '').replace(/\n/g, '<br>') }} />
                              {p.image_url && (
                                <div className="post-image-container">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img 
                                    src={p.image_url} 
                                    alt="첨부 이미지" 
                                    onClick={() => setLightboxImage(p.image_url)}
                                    className="post-image"
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="post-actions-panel">
                          <input 
                            id={`pwd-${p.id}`} 
                            type="password" 
                            placeholder="비밀번호" 
                            maxLength={4} 
                            className="input-field pwd-action-field"
                            onKeyDown={ev => { 
                              if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { 
                                ev.preventDefault(); 
                                if (editing[p.id] && editing[p.id].editing) { saveEdit(p.id); } else { verifyAndEdit(p.id); } 
                              } 
                            }} 
                          />
                          
                          {editing[p.id] && editing[p.id].editing ? (
                            <div className="action-buttons">
                              <button onClick={() => saveEdit(p.id)} className="btn btn-primary btn-sm mr-2">저장</button>
                              <button onClick={() => setEditing(e => { const c = { ...e }; delete c[p.id]; return c })} className="btn btn-secondary btn-sm">취소</button>
                            </div>
                          ) : (
                            <div className="action-buttons">
                              <button onClick={() => verifyAndEdit(p.id)} className="btn btn-secondary btn-sm mr-2">수정</button>
                              <button onClick={() => deletePost(p.id)} className="btn btn-danger-outline btn-sm">삭제</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* 라이트박스 모달 뷰어 */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="lightbox-overlay"
        >
          <div className="lightbox-wrapper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={lightboxImage} 
              alt="확대 이미지" 
              className="lightbox-img"
            />
            <button 
              onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
              className="lightbox-close-btn"
            >
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
        
        .board-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px;
        }

        .board-header {
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
          background: linear-gradient(135deg, #60a5fa, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Two-column layout */
        .board-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 32px;
        }

        @media (max-width: 900px) {
          .board-layout {
            grid-template-columns: 1fr;
          }
        }

        /* Sidebar Styling */
        .sidebar-card {
          background: rgba(17, 24, 39, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
        }

        .sidebar-card h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 20px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 12px;
        }

        .meta-info-text {
          color: #9ca3af;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .meta-details {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }

        .meta-label {
          color: #9ca3af;
        }

        .meta-val {
          color: #f3f4f6;
          font-weight: 600;
        }

        .highlight-text {
          color: #60a5fa;
        }

        .badge-count {
          background: rgba(96, 165, 250, 0.1);
          color: #60a5fa;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .info-helper-box {
          background: rgba(245, 158, 11, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.15);
          border-radius: 12px;
          padding: 16px;
          font-size: 13px;
          color: #fcd34d;
        }

        .info-helper-box p {
          margin: 0 0 8px 0;
        }

        .info-helper-box code {
          background: rgba(0, 0, 0, 0.25);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #f59e0b;
        }

        /* Form & Content Area */
        .write-card {
          background: rgba(17, 24, 39, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 32px;
        }

        .write-card h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 20px 0;
        }

        .write-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-field {
          background: rgba(31, 41, 55, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #f3f4f6;
          padding: 12px 16px;
          font-size: 15px;
          font-family: inherit;
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .input-field:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
          background: rgba(31, 41, 55, 0.7);
        }

        .textarea-field {
          background: rgba(31, 41, 55, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #f3f4f6;
          padding: 14px 16px;
          font-size: 15px;
          font-family: inherit;
          min-height: 110px;
          resize: vertical;
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .textarea-field:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
          background: rgba(31, 41, 55, 0.7);
        }

        /* Upload Area */
        .upload-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 4px;
        }

        .upload-btn {
          cursor: pointer;
        }

        .image-preview-box {
          position: relative;
          display: inline-block;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          overflow: hidden;
          background: #111827;
        }

        .preview-img {
          max-width: 160px;
          max-height: 110px;
          display: block;
          object-fit: cover;
        }

        .remove-preview-btn {
          position: absolute;
          top: 6px;
          right: 6px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          transition: background-color 0.2s;
        }

        .remove-preview-btn:hover {
          background: #ef4444;
        }

        .form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
        }

        .pwd-input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pwd-field {
          width: 190px !important;
          padding: 8px 12px;
          font-size: 13px;
        }

        .pwd-helper {
          color: #6b7280;
          font-size: 11px;
        }

        /* Timeline / Cards feed */
        .posts-timeline {
          background: rgba(17, 24, 39, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          padding: 28px;
        }

        .posts-timeline h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 20px 0;
        }

        .timeline-state {
          text-align: center;
          padding: 32px;
          color: #9ca3af;
        }

        .empty-timeline {
          text-align: center;
          padding: 60px 24px;
          color: #9ca3af;
          border: 1px dashed rgba(255, 255, 255, 0.08);
          border-radius: 12px;
        }

        .posts-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .post-card {
          background: rgba(31, 41, 55, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: border-color 0.2s;
        }

        .post-card:hover {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 8px;
        }

        .post-author {
          font-weight: 600;
          color: #60a5fa;
        }

        .post-date {
          color: #6b7280;
        }

        .post-body {
          font-size: 15px;
          line-height: 1.5;
          color: #e5e7eb;
        }

        .post-text {
          margin: 0;
          word-break: break-all;
        }

        .post-image-container {
          margin-top: 12px;
          display: inline-block;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: #111827;
        }

        .post-image {
          max-width: 100%;
          max-height: 260px;
          object-fit: contain;
          display: block;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .post-image:hover {
          transform: scale(1.01);
        }

        /* Post Editing and Action buttons */
        .edit-textarea {
          font-size: 14px;
          min-height: 90px;
        }

        .post-actions-panel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          padding-top: 12px;
        }

        .pwd-action-field {
          width: 120px !important;
          padding: 6px 10px;
          font-size: 12px;
        }

        .action-buttons {
          display: flex;
        }

        /* Buttons styles (Global match) */
        .btn {
          font-family: inherit;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 6px;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
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

        .btn-full {
          width: 100%;
        }

        .empty-board-setup {
          font-size: 13px;
          color: #9ca3af;
          line-height: 1.5;
        }

        .setup-buttons {
          margin-top: 16px;
        }

        .mb-2 {
          margin-bottom: 8px;
        }

        .ml-2 {
          margin-left: 8px;
        }
        
        .mr-2 {
          margin-right: 8px;
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
