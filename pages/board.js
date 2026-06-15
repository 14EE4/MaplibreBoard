import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { loadHeic2Any, compressImage } from '../lib/imageUtils'
import { escapeHtml, formatTime } from '../lib/utils'
import BoardSidebar from '../components/BoardSidebar'
import WriteForm from '../components/WriteForm'
import PostCard from '../components/PostCard'
import Lightbox from '../components/Lightbox'

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
  const [imageError, setImageError] = useState(null)



  const handleFileChange = async (e) => {
    let file = e.target.files[0]
    if (!file) return

    setImageError(null)
    setLoading(true)
    setMetaText('이미지 처리 중...')

    try {
      const fileName = file.name.toLowerCase()
      const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif'

      if (isHeic) {
        try {
          const heic2any = await loadHeic2Any()
          const converted = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8
          })
          const blob = Array.isArray(converted) ? converted[0] : converted
          file = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
        } catch (err) {
          console.error('HEIC conversion failed', err)
          setImageError('HEIC 이미지 변환에 실패했습니다. (다른 형식의 이미지를 사용해 주세요)')
          setLoading(false)
          setMetaText('')
          return
        }
      }

      if (!file.type.startsWith('image/')) {
        setImageError('이미지 파일만 첨부할 수 있습니다.')
        setLoading(false)
        setMetaText('')
        return
      }

      // Compress and resize
      const compressedDataUrl = await compressImage(file)
      setImagePreview(compressedDataUrl)
      setMetaText('')
    } catch (err) {
      console.error('Image compression failed', err)
      setImageError(err.message || '이미지 처리 중 오류가 발생했습니다.')
      setMetaText('')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setImageError(null)
    const fileInput = document.getElementById('imageInput')
    if (fileInput) fileInput.value = ''
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
      setImageError(null)
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
          {/* Left Column: Board Sidebar */}
          <BoardSidebar
            boardMeta={boardMeta}
            resolvedBoardId={resolvedBoardId}
            metaText={metaText}
            loading={loading}
            createBoardAndOpen={createBoardAndOpen}
          />

          {/* Right Column: Feed and Writing Form */}
          <section className="board-main-content">
            {boardMeta && (
              <>
                {/* Write Post Card */}
                <WriteForm
                  author={author}
                  setAuthor={setAuthor}
                  content={content}
                  setContent={setContent}
                  postPassword={postPassword}
                  setPostPassword={setPostPassword}
                  imagePreview={imagePreview}
                  imageError={imageError}
                  loading={loading}
                  handleFileChange={handleFileChange}
                  handleRemoveImage={handleRemoveImage}
                  submitPost={submitPost}
                />

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
                      <PostCard
                        key={p.id}
                        post={p}
                        editing={editing}
                        setEditing={setEditing}
                        setLightboxImage={setLightboxImage}
                        verifyAndEdit={verifyAndEdit}
                        saveEdit={saveEdit}
                        deletePost={deletePost}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* 라이트박스 모달 뷰어 */}
      <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
    </>
  )
}
