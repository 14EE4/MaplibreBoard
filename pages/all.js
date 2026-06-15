import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Head from 'next/head'
import { escapeHtml, formatTime } from '../lib/utils'
import PostContent from '../components/PostContent'
import PostPreview from '../components/PostPreview'

export default function AllFeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [lightboxImage, setLightboxImage] = useState(null)

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

  // Citation Click: scroll to post or redirect
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
          if (!res.ok) throw new Error('존재하지 않는 게시글입니다.')
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

  // Citation Hover
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
          if (!res.ok) throw new Error('게시글을 찾을 수 없습니다.')
          return res.json()
        })
        .then(data => {
          setPreviewPost(data)
          setPreviewLoading(false)
        })
        .catch(err => {
          setPreviewError(err.message || '게시글 조회 중 오류가 발생했습니다.')
          setPreviewLoading(false)
        })
    }
  }, [posts])

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
          showToast('글 주소가 클립보드에 복사되었습니다.')
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
      showToast('글 주소가 클립보드에 복사되었습니다.')
    } catch (err) {
      console.error('Fallback copy failed', err)
      alert('주소 복사에 실패했습니다.')
    }
    document.body.removeChild(textArea)
  }, [showToast])

  // Scroll to hash post if present
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
                id={`post-${post.id}`}
                className="feed-card"
                onClick={() => {
                  if (post.board_id) {
                    window.location.href = `/board?id=${post.board_id}`
                  }
                }}
              >
                <div className="card-header">
                  <div className="card-header-left">
                    <span className="post-number">No. {post.id}</span>
                    <span className="board-badge">
                      📍 {post.board_name || '이름 없음'} 
                      {post.board_x !== null && post.board_y !== null ? ` (${post.board_x}, ${post.board_y})` : ''}
                    </span>
                    <button 
                      className="btn-share-post"
                      title="글 주소 복사"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleShareClick(post.id, post.board_id)
                      }}
                    >
                      공유
                    </button>
                  </div>
                  <span className="post-date">{post.created_at ? formatTime(post.created_at) : ''}</span>
                </div>

                <div className="card-body">
                  <p className="post-author">
                    작성자: <span className="author-name">{post.author ? escapeHtml(post.author) : '익명'}</span>
                  </p>
                  <p className={`post-content ${post.content === '(이 글은 삭제되었습니다)' ? 'deleted-post-text' : ''}`}>
                    <PostContent
                      content={post.content}
                      onCitationClick={handleCitationClick}
                      onCitationHover={handleCitationHover}
                    />
                  </p>
                  
                  {backlinksMap[post.id] && backlinksMap[post.id].length > 0 && (
                    <div className="post-backlinks">
                      <span className="backlink-label">↳ 인용한 글:</span>
                      {backlinksMap[post.id].map((bl) => (
                        <a
                          key={bl.id}
                          href={`#post-${bl.id}`}
                          className="backlink-link"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleCitationClick(bl.id)
                          }}
                          onMouseEnter={(e) => handleCitationHover(e, bl.id)}
                          onMouseLeave={() => handleCitationHover(null)}
                        >
                          &gt;&gt;{bl.id}
                        </a>
                      ))}
                    </div>
                  )}
                  {post.image_url && post.image_url !== 'censored' && (
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
                  {post.image_url === 'censored' && (
                    <div className="censored-image-box" onClick={(e) => e.stopPropagation()}>
                      🚫 이미지 검열됨
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
        aria-label="맨 위로 이동"
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
