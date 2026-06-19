import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { loadHeic2Any, compressImage } from '../lib/imageUtils'
import { escapeHtml, formatTime } from '../lib/utils'
import BoardSidebar from '../components/BoardSidebar'
import WriteForm from '../components/WriteForm'
import PostCard from '../components/PostCard'
import Lightbox from '../components/Lightbox'
import PostPreview from '../components/PostPreview'

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
  const [metaText, setMetaText] = useState('Loading...')
  const [posts, setPosts] = useState([])
  const [author, setAuthor] = useState('')
  const [rememberNickname, setRememberNickname] = useState(false)
  const [content, setContent] = useState('')
  const [postPassword, setPostPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Load saved nickname from localStorage on mount
  useEffect(() => {
    try {
      const savedNickname = localStorage.getItem('saved_nickname')
      if (savedNickname) {
        setAuthor(savedNickname)
        setRememberNickname(true)
      }
    } catch (e) {
      console.warn('LocalStorage access failed:', e)
    }
  }, [])
  const [editing, setEditing] = useState({}) // { postId: { editing: true, value: '...' } }
  const [imagePreview, setImagePreview] = useState(null)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [imageError, setImageError] = useState(null)

  const [showScrollTop, setShowScrollTop] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '' })

  const toastTimeoutRef = useRef(null)
  const hasScrolledRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Preview popover states
  const [previewPost, setPreviewPost] = useState(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const hoverTimeoutRef = useRef(null)

  // Memoize backlinks map: targetPostId -> array of citing posts info
  const backlinksMap = useMemo(() => {
    const map = {}
    posts.forEach(p => {
      if (!p.content) return
      const matches = p.content.match(/(?:>>|@)\d+/g)
      if (matches) {
        const uniqueTargets = [...new Set(matches.map(m => m.replace(/^>>|^@/, '')))]
        uniqueTargets.forEach(targetId => {
          if (!map[targetId]) map[targetId] = []
          map[targetId].push({ id: p.id, author: p.author, board_id: p.board_id })
        })
      }
    })
    return map
  }, [posts])

  // Citation Click: scroll to post, highlight, or fetch & redirect if other board
  const handleCitationClick = useCallback((targetId) => {
    const element = document.getElementById(`post-${targetId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('highlight-flash')
      setTimeout(() => {
        element.classList.remove('highlight-flash')
      }, 2000)
    } else {
      fetch(`/api/posts?id=${targetId}`)
        .then(res => {
          if (!res.ok) throw new Error('This post does not exist.')
          return res.json()
        })
        .then(post => {
          if (post.board_id) {
            window.location.href = `/board?id=${post.board_id}#post-${post.id}`
          }
        })
        .catch(err => {
          alert(err.message)
        })
    }
  }, [])

  // Citation Hover: show floating popover preview card
  const handleCitationHover = useCallback((e, targetId) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    if (!e) {
      hoverTimeoutRef.current = setTimeout(() => {
        setPreviewPost(null)
        setPreviewError(null)
        setPreviewLoading(false)
      }, 100)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2))
    const y = rect.top + window.scrollY

    setPreviewPosition({ x, y })
    setPreviewLoading(true)
    setPreviewError(null)

    const foundPost = posts.find(p => String(p.id) === String(targetId))
    if (foundPost) {
      setPreviewPost(foundPost)
      setPreviewLoading(false)
    } else {
      fetch(`/api/posts?id=${targetId}`)
        .then(res => {
          if (!res.ok) throw new Error('Post not found.')
          return res.json()
        })
        .then(data => {
          setPreviewPost(data)
          setPreviewLoading(false)
        })
        .catch(err => {
          setPreviewError(err.message || 'An error occurred while loading the post.')
          setPreviewLoading(false)
        })
    }
  }, [posts])

  // Click post number to auto-insert reference text into textarea
  const handlePostNumberClick = useCallback((postId) => {
    setContent(prev => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed}\n>>${postId} ` : `>>${postId} `
    })
    setTimeout(() => {
      document.getElementById('content')?.focus()
    }, 50)
  }, [])

  const showToast = useCallback((msg) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToast({ show: true, message: msg })
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '' })
    }, 3000)
  }, [])

  const handleShareClick = useCallback((postId, boardId) => {
    if (!boardId) return
    const postUrl = `${window.location.origin}/board?id=${boardId}#post-${postId}`
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(postUrl)
        .then(() => {
          showToast('Post link copied to clipboard.')
        })
        .catch(err => {
          console.error('Failed to copy text using clipboard API: ', err)
          fallbackCopyText(postUrl)
        })
    } else {
      fallbackCopyText(postUrl)
    }
  }, [showToast])

  const fallbackCopyText = useCallback((text) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      showToast('Post link copied to clipboard.')
    } catch (err) {
      console.error('Fallback copy failed', err)
      alert('Failed to copy post link.')
    }
    document.body.removeChild(textArea)
  }, [showToast])

  // Auto scroll and highlight if hash contains post ID on load
  useEffect(() => {
    if (hasScrolledRef.current) return

    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash && hash.startsWith('#post-')) {
        const postId = hash.replace('#post-', '')
        setTimeout(() => {
          const element = document.getElementById(`post-${postId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.classList.add('highlight-flash')
            setTimeout(() => {
              element.classList.remove('highlight-flash')
            }, 2000)
          }
        }, 300)
      }
    }

    if (posts.length > 0) {
      handleHashChange()
      hasScrolledRef.current = true
    }
  }, [posts])



  const processAndSetFile = async (file) => {
    if (!file) return

    setImageError(null)
    setLoading(true)
    setMetaText('Processing image...')

    try {
      const fileName = (file.name || 'clipboard-image.png').toLowerCase()
      const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif'

      let fileToProcess = file
      if (isHeic) {
        try {
          const heic2any = await loadHeic2Any()
          const converted = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8
          })
          const blob = Array.isArray(converted) ? converted[0] : converted
          fileToProcess = new File([blob], fileName.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
        } catch (err) {
          console.error('HEIC conversion failed', err)
          setImageError('Failed to convert HEIC image. Please use another image format.')
          setLoading(false)
          setMetaText('')
          return
        }
      }

      if (!fileToProcess.type.startsWith('image/')) {
        setImageError('Only image files can be attached.')
        setLoading(false)
        setMetaText('')
        return
      }

      // Compress and resize
      const compressedDataUrl = await compressImage(fileToProcess)
      setImagePreview(compressedDataUrl)
      setMetaText('')
    } catch (err) {
      console.error('Image compression failed', err)
      setImageError(err.message || 'An error occurred while processing the image.')
      setMetaText('')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      await processAndSetFile(file)
    }
  }

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault() // prevent pasting file representation as text
          await processAndSetFile(file)
          break
        }
      }
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
      setMetaText('Failed to load posts. Check console.')
    } finally { setLoading(false) }
  }, [])

  const loadBoardById = useCallback((boardId) => {
    setResolvedBoardId(boardId)
    setMetaText('Loading board...')
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
          // 존재하지 않는 보드 ID로의 접속 차단 및 기본 보드(id=1) 리다이렉트
          alert(`This board (ID: ${boardId}) does not exist. Redirecting to default board.`)
          try {
            router.replace('/board?id=1')
          } catch (e) {
            window.location.href = '/board?id=1'
          }
          return
        } else {
          const body = await res.text().catch(()=>null)
          console.warn('board id fetch unexpected', res.status, body)
          setBoardMeta(null)
          setMetaText('Failed to load board metadata. Check console.')
        }
      } catch (err) {
        console.warn('board meta load failed', err)
        setBoardMeta(null)
        setMetaText('Failed to load board metadata. Check console.')
      }
    })()
  }, [loadPosts])

  const loadBoardByGrid = useCallback(async (gx, gy) => {
    setMetaText('Searching grid board...')
    try {
      const res = await fetch(`/api/boards?grid_x=${encodeURIComponent(gx)}&grid_y=${encodeURIComponent(gy)}`)
      if (res.status === 200) {
        const obj = await res.json()
        setResolvedBoardId(obj.id)
        setBoardMeta(obj)
        setMetaText(`grid: ${gx},${gy}`)
        loadPosts(obj.id)
      } else if (res.status === 404) {
        setMetaText(`No board found at this grid (grid:${gx},${gy}).`)
        setResolvedBoardId(null)
        setBoardMeta(null)
      } else {
        const body = await res.text().catch(()=>null)
        console.warn('board grid fetch unexpected', res.status, body)
        setMetaText('Failed to load board metadata. Check console.')
      }
    } catch (err) {
      console.error('boards fetch failed', err)
      setMetaText('Failed to load boards list. Check console.')
    }
  }, [loadPosts])

  useEffect(() => {
    // Next.js 라우터가 준비되어 쿼리 파라미터가 파싱될 때까지 대기
    if (router && !router.isReady) return

    // entry: on query change
    hasScrolledRef.current = false
    if (id) {
      loadBoardById(id)
    } else if (grid_x != null && grid_y != null) {
      loadBoardByGrid(grid_x, grid_y)
    } else {
      // 쿼리 매개변수가 없는 경우 일반 사용자는 차단 및 기본 보드(id=1)로 리다이렉트
      try {
        const isAuthed = sessionStorage.getItem('admin-authed') === '1'
        if (!isAuthed) {
          alert('Access denied. Please access the board page with proper grid coordinates or ID.')
          router.replace('/board?id=1')
        } else {
          setMetaText('Please add ?id=BOARD_ID or ?grid_x=NUM&grid_y=NUM to the URL.')
        }
      } catch (e) {
        router.replace('/board?id=1')
      }
    }
  }, [id, grid_x, grid_y, loadBoardById, loadBoardByGrid, router, router?.isReady])

  async function submitPost() {
    if (!resolvedBoardId) { alert('No board selected. Please specify id or grid_x/grid_y in URL.'); return }
    const authorVal = (author || null)
    const contentVal = (content || '').trim()
    const pw = (postPassword || '').trim()
    if (!contentVal) { alert('Please enter your message.'); return }

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
          throw new Error(uploadErr.error || 'Image upload failed.')
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
        const msg = (body && body.error) ? `Post failed: ${body.error}` : `Post failed (HTTP ${res.status})`
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
        if (rememberNickname && authorVal) {
          localStorage.setItem('saved_nickname', authorVal)
        } else {
          localStorage.removeItem('saved_nickname')
          setAuthor('')
        }
      } catch (e) {
        console.warn('LocalStorage interaction failed:', e)
      }

      try {
        if (router && typeof router.replace === 'function') {
          await router.replace({
            pathname: '/board',
            query: { id: resolvedBoardId }
          }, undefined, { shallow: true })
        } else {
          window.history.replaceState(null, '', `/board?id=${resolvedBoardId}`)
        }
      } catch (e) {
        window.history.replaceState(null, '', `/board?id=${resolvedBoardId}`)
      }
      loadPosts(resolvedBoardId)
    } catch (err) {
      console.error('post failed', err)
      alert(err.message || 'Post failed. Check console.')
    } finally {
      setLoading(false)
    }
  }

  async function createBoardAndOpen(name) {
    try {
      setLoading(true)
      const defaultName = (grid_x != null && grid_y != null)
        ? `grid_${grid_x}_${grid_y}`
        : `board-${Date.now()}`
      const body = { name: name || defaultName }

      // 격자 없는 일반 보드 생성을 위한 관리자 인증 토큰 주입
      try {
        const storedPw = sessionStorage.getItem('admin-pw')
        if (storedPw) {
          body.auth = storedPw
        }
      } catch (e) {
        console.warn('sessionStorage access failed', e)
      }

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
        // 즉시 상태 갱신하여 딜레이 및 라우팅 미작동 문제 해결
        setResolvedBoardId(newId)
        setBoardMeta({
          id: j.id,
          name: j.name || name || defaultName,
          grid_x: j.grid_x != null ? j.grid_x : (grid_x != null ? Number(grid_x) : null),
          grid_y: j.grid_y != null ? j.grid_y : (grid_y != null ? Number(grid_y) : null),
          center_lng: j.center_lng,
          center_lat: j.center_lat,
          posts_count: 0
        })
        setMetaText('')
        loadPosts(newId)

        // URL 갱신 (이미 쿼리가 동일하더라도 replace를 수행하여 일관성 유지)
        if (grid_x != null && grid_y != null) {
          const qgx = encodeURIComponent(grid_x)
          const qgy = encodeURIComponent(grid_y)
          try {
            if (router && typeof router.replace === 'function') {
              router.replace(`/board?grid_x=${qgx}&grid_y=${qgy}`, undefined, { shallow: true })
            } else {
              window.history.replaceState(null, '', `/board?grid_x=${qgx}&grid_y=${qgy}`)
            }
          } catch (navErr) {
            console.warn('router replace failed, falling back', navErr)
            window.location.href = `/board?grid_x=${qgx}&grid_y=${qgy}`
          }
        } else {
          try {
            if (router && typeof router.replace === 'function') {
              router.replace(`/board?id=${encodeURIComponent(newId)}`, undefined, { shallow: true })
            } else {
              window.history.replaceState(null, '', `/board?id=${encodeURIComponent(newId)}`)
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
      alert((err && err.error) ? err.error : 'Failed to create board.')
    } finally {
      setLoading(false)
    }
  }

  async function verifyAndEdit(postId) {
    const pw = (document.getElementById(`pwd-${postId}`)?.value || '').trim()
    if (!pw) { alert('Please enter your password to edit.'); return }
    try {
      const res = await fetch(`/api/posts/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: postId, password: pw }) })
      if (!res.ok) {
        const j = await res.json().catch(()=>({})); throw j
      }
      // enter edit mode
      const post = posts.find(p=>p.id===postId)
      setEditing(e => ({ ...e, [postId]: { editing: true, value: post ? (post.content||'') : '' } }))
    } catch (err) { console.error('verify failed', err); alert((err && err.error) ? err.error : 'Incorrect password.') }
  }

  async function saveEdit(postId) {
    const pw = (document.getElementById(`pwd-${postId}`)?.value || '').trim()
    if (!pw) { alert('Please enter your password to edit.'); return }
    const newContent = (editing[postId] && editing[postId].value || '').trim()
    if (!newContent) { alert('Please enter content.'); return }
    try {
      const res = await fetch(`/api/posts`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: postId, password: pw, content: newContent, author: (author || null) }) })
      if (!res.ok) {
        const j = await res.json().catch(()=>({})); throw j
      }
      setEditing(e => { const copy = { ...e }; delete copy[postId]; return copy })
      loadPosts(resolvedBoardId)
    } catch (err) { console.error('update failed', err); alert((err && err.error) ? err.error : 'Edit failed (check password)') }
  }

  async function deletePost(postId) {
    const pw = (document.getElementById(`pwd-${postId}`)?.value || '').trim()
    if (!pw) { alert('Please enter your password to delete.'); return }
    if (!confirm('Are you sure you want to delete this post?')) return
    try {
      const res = await fetch(`/api/posts?id=${encodeURIComponent(postId)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
      if (!res.ok) {
        const j = await res.json().catch(()=>({})); throw j
      }
      loadPosts(resolvedBoardId)
    } catch (err) { console.error('delete failed', err); alert((err && err.error) ? err.error : 'Delete failed (check password)') }
  }

  return (
    <>
      <Head>
        <title>{boardMeta ? `${boardMeta.name} - MaplibreBoard` : 'Board'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <main className="board-container">
        {/* Header Navigation */}
        <header className="board-header">
          <div className="header-back">
            <button onClick={() => window.location.href = '/map'} className="btn btn-secondary btn-sm">
              ← View Map
            </button>
            <button onClick={() => window.location.href = '/'} className="btn btn-secondary btn-sm ml-2" title="Home">
              🏠
            </button>
          </div>
          <div className="header-brand">
            <h1>Grid Board</h1>
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
            gridX={grid_x}
            gridY={grid_y}
          />

          {/* Right Column: Feed and Writing Form */}
          <section className="board-main-content">
            {boardMeta && (
              <>
                {/* Write Post Card */}
                <WriteForm
                  author={author}
                  setAuthor={setAuthor}
                  rememberNickname={rememberNickname}
                  setRememberNickname={setRememberNickname}
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
                  handlePaste={handlePaste}
                />

                {/* Posts Timeline List */}
                <div className="posts-timeline">
                  <h3>Latest Feed</h3>
                  
                  {loading && <div className="timeline-state">Loading...</div>}
                  {!loading && posts.length === 0 && (
                    <div className="empty-timeline">
                      <p>No posts yet. Write the first post!</p>
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
                        onCitationClick={handleCitationClick}
                        onCitationHover={handleCitationHover}
                        onPostNumberClick={handlePostNumberClick}
                        onShareClick={handleShareClick}
                        backlinks={backlinksMap[p.id]}
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

      {/* 글 미리보기 팝오버 */}
      <PostPreview 
        post={previewPost}
        position={previewPosition}
        loading={previewLoading}
        error={previewError}
      />

      {/* 맨 위로 이동 버튼 */}
      <button 
        onClick={scrollToTop} 
        className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
        aria-label="Scroll to top"
      >
        ▲
      </button>

      {/* 토스트 알림 */}
      <div className={`toast-container ${toast.show ? 'show' : ''}`}>
        <span className="toast-icon">✓</span>
        <span>{toast.message}</span>
      </div>
    </>
  )
}
