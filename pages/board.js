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
    <main style={{ padding: 16, fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <Head>
        <title>게시판</title>
      </Head>
      <h1 id="title">게시판</h1>
      <div id="boardMeta" style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>{metaText}</div>
      {!boardMeta && !loading && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 6, color: '#444' }}>보드가 존재하지 않거나 데이터베이스에 연결되어 있지 않습니다.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={()=>createBoardAndOpen()}>새 보드 생성 및 이동</button>
            <button onClick={()=>{
              const name = (typeof window !== 'undefined' && typeof window.prompt === 'function') ? window.prompt('생성할 보드 이름을 입력하세요','새 보드') : null
              createBoardAndOpen(name)
            }}>이름 지정하여 생성</button>
          </div>
        </div>
      )}
      {boardMeta && (
        <div style={{ marginBottom: 12, padding: 8, border: '1px solid #eee', borderRadius: 6 }}>
          <div><strong>보드 ID:</strong> {resolvedBoardId || boardMeta.id || '(알 수 없음)'}</div>
          <div><strong>이름:</strong> {boardMeta.name || '(이름 없음)'}</div>
          {((boardMeta.grid_x != null) || (boardMeta.x != null)) && ((boardMeta.grid_y != null) || (boardMeta.y != null)) && <div><strong>그리드:</strong> {(boardMeta.grid_x != null) ? boardMeta.grid_x : boardMeta.x}, {(boardMeta.grid_y != null) ? boardMeta.grid_y : boardMeta.y}</div>}
          {((boardMeta.posts_count != null) || (boardMeta.count != null)) && <div><strong>게시물 수:</strong> {(boardMeta.posts_count != null) ? boardMeta.posts_count : boardMeta.count}</div>}
          {((boardMeta.center_lng != null) || (boardMeta.lng != null)) && ((boardMeta.center_lat != null) || (boardMeta.lat != null)) && <div><strong>중심 좌표:</strong> {(boardMeta.center_lng != null) ? boardMeta.center_lng : boardMeta.lng}, {(boardMeta.center_lat != null) ? boardMeta.center_lat : boardMeta.lat}</div>}
        </div>
      )}

      <div style={{ background: '#fffbdd', border: '1px solid #ffe58f', padding: 8, borderRadius: 4, marginBottom: 12 }}>
        이 페이지는 클라이언트에서 격자 좌표 또는 보드 ID로 게시글을 불러옵니다.
        URL 예시: <code>/board?grid_x=0&grid_y=0</code>, <code>/board?id=1</code>
      </div>

      <section id="newPost">
        <h3>새 글 작성</h3>
        <input id="author" placeholder="작성자 (선택)" style={{ width: '100%', padding: 6, boxSizing: 'border-box', marginBottom: 6 }} value={author} onChange={e=>setAuthor(e.target.value)} />
        <textarea id="content" placeholder="내용을 입력하세요..." style={{ width: '100%', height: 100 }} value={content} onChange={e=>setContent(e.target.value)} onKeyDown={e=>{ if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submitPost(); } }} />
        
        {/* 파일 첨부 영역 */}
        <div style={{ marginTop: 6, marginBottom: 8 }}>
          <label htmlFor="imageInput" style={{ display: 'inline-block', padding: '6px 12px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
            📷 사진 첨부
          </label>
          <input id="imageInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          
          {imagePreview && (
            <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
              <img src={imagePreview} alt="미리보기" style={{ maxWidth: 200, maxHeight: 150, borderRadius: 6, border: '1px solid #ddd' }} />
              <button onClick={handleRemoveImage} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>
                ✕
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input id="postPassword" placeholder="4자리 비밀번호 (선택)" maxLength={4} style={{ width: 180, padding: 6, boxSizing: 'border-box' }} value={postPassword} onChange={e=>setPostPassword(e.target.value)} onKeyDown={e=>{ if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submitPost(); } }} />
          <small style={{ color: '#666' }}>* 비밀번호를 설정하면 해당 비밀번호로 수정/삭제 가능</small>
        </div>
        <div style={{ marginTop: 8 }}>
          <button id="submitPost" onClick={submitPost} disabled={loading}>{loading ? '전송 중...' : '전송'}</button>
          <span style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>Ctrl+Enter로 전송</span>
        </div>
      </section>

      <div id="posts" style={{ marginTop: 12 }}>
        {loading && <div className="meta">로딩 중...</div>}
        {!loading && (!posts || posts.length === 0) && <div className="meta">게시글이 없습니다.</div>}
        {posts.map(p => (
          <div key={p.id} style={{ border: '1px solid #ddd', padding: 8, borderRadius: 6, marginBottom: 8 }}>
            <div dangerouslySetInnerHTML={{ __html: (p.author ? `<strong>${escapeHtml(p.author)}</strong>` : '<strong>익명</strong>') + ' <span style="color:#888;font-size:12px">' + (p.createdAt ? formatTime(p.createdAt) : '') + '</span>' }} />
            <div style={{ marginTop: 6 }}>
              {editing[p.id] && editing[p.id].editing ? (
                <textarea style={{ width: '100%', height: 120 }} value={editing[p.id].value} onChange={ev=>setEditing(prev=>({ ...prev, [p.id]: { editing: true, value: ev.target.value } }))} onKeyDown={ev=>{ if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); saveEdit(p.id); } }} />
              ) : (
                <>
                  <div className="post-content" dangerouslySetInnerHTML={{ __html: escapeHtml(p.content || '').replace(/\n/g, '<br>') }} />
                  {p.image_url && (
                    <div style={{ marginTop: 8 }}>
                      <img 
                        src={p.image_url} 
                        alt="첨부 이미지" 
                        onClick={() => setLightboxImage(p.image_url)}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: 300, 
                          borderRadius: 6, 
                          cursor: 'pointer', 
                          border: '1px solid #eee',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }} 
                        className="post-image"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              <input id={`pwd-${p.id}`} type="password" placeholder="비밀번호" maxLength={4} style={{ marginRight: 8, padding: 6, width: 120 }} onKeyDown={ev=>{ if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); if (editing[p.id] && editing[p.id].editing) { saveEdit(p.id); } else { verifyAndEdit(p.id); } } }} />
              {editing[p.id] && editing[p.id].editing ? (
                <>
                  <button onClick={()=>saveEdit(p.id)}>저장</button>
                  <button onClick={()=>setEditing(e=>{ const c={...e}; delete c[p.id]; return c })} style={{ marginLeft: 6 }}>취소</button>
                </>
              ) : (
                <>
                  <button onClick={()=>verifyAndEdit(p.id)} style={{ marginRight: 6 }}>수정</button>
                  <button onClick={()=>deletePost(p.id)}>삭제</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 라이트박스 모달 뷰어 */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <img 
              src={lightboxImage} 
              alt="확대 이미지" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '90vh', 
                borderRadius: 8, 
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                display: 'block',
                margin: 'auto'
              }} 
            />
            <button 
              onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
              style={{
                position: 'absolute',
                top: -40,
                right: 0,
                background: 'transparent',
                color: '#fff',
                border: 'none',
                fontSize: 32,
                cursor: 'pointer',
                fontWeight: '300',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .post-image:hover {
          transform: scale(1.015);
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
      `}</style>

      <p><a href="/map">← Back</a></p>
    </main>
  )
}
