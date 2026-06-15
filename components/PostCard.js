import React, { useEffect, useRef } from 'react'
import { escapeHtml, formatTime } from '../lib/utils'
import PostContent from './PostContent'

export default function PostCard({
  post,
  editing,
  setEditing,
  setLightboxImage,
  verifyAndEdit,
  saveEdit,
  deletePost,
  onCitationClick,
  onCitationHover,
  onPostNumberClick,
  backlinks = []
}) {
  const isEditing = editing[post.id]?.editing
  const editValue = editing[post.id]?.value
  const textareaRef = useRef(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [isEditing, editValue])

  return (
    <div id={`post-${post.id}`} className="post-card">
      <div className="post-header">
        <div className="post-header-left">
          <span 
            className="post-number"
            style={{ cursor: 'pointer' }}
            title="클릭하여 답장 인용"
            onClick={() => onPostNumberClick && onPostNumberClick(post.id)}
          >
            No. {post.id}
          </span>
          <span className="post-author">{post.author ? escapeHtml(post.author) : '익명'}</span>
        </div>
        <span className="post-date">{post.created_at ? formatTime(post.created_at) : ''}</span>
      </div>

      <div className="post-body">
        {isEditing ? (
          <div className="textarea-container" style={{ position: 'relative' }}>
            <textarea 
              className="textarea-field edit-textarea"
              ref={textareaRef}
              value={editing[post.id].value} 
              maxLength={1000}
              onChange={ev => setEditing(prev => ({ ...prev, [post.id]: { editing: true, value: ev.target.value } }))} 
              onKeyDown={ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); saveEdit(post.id); } }} 
              style={{ paddingBottom: '30px' }}
            />
            <div className={`char-counter ${(editing[post.id].value || '').length >= 850 ? 'warning' : ''} ${(editing[post.id].value || '').length >= 1000 ? 'danger' : ''}`}>
              {(editing[post.id].value || '').length} / 1000
            </div>
          </div>
        ) : (
          <>
            <p className={`post-text ${post.content === '(이 글은 삭제되었습니다)' ? 'deleted-post-text' : ''}`}>
              <PostContent 
                content={post.content} 
                onCitationClick={onCitationClick} 
                onCitationHover={onCitationHover} 
              />
            </p>
            {post.image_url && post.image_url !== 'censored' && (
              <div className="post-image-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={post.image_url} 
                  alt="첨부 이미지" 
                  onClick={() => setLightboxImage(post.image_url)}
                  className="post-image"
                />
              </div>
            )}
            {post.image_url === 'censored' && (
              <div className="censored-image-box">
                🚫 이미지 검열됨
              </div>
            )}
            
            {backlinks && backlinks.length > 0 && (
              <div className="post-backlinks">
                <span className="backlink-label">↳ 인용한 글:</span>
                {backlinks.map((bl) => (
                  <a
                    key={bl.id}
                    href={`#post-${bl.id}`}
                    className="backlink-link"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (onCitationClick) onCitationClick(bl.id)
                    }}
                    onMouseEnter={(e) => onCitationHover && onCitationHover(e, bl.id)}
                    onMouseLeave={() => onCitationHover && onCitationHover(null)}
                  >
                    &gt;&gt;{bl.id}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {post.content !== '(이 글은 삭제되었습니다)' && (
        <div className="post-actions-panel">
          <input 
            id={`pwd-${post.id}`} 
            type="password" 
            placeholder="비밀번호" 
            maxLength={4} 
            className="input-field pwd-action-field"
            onKeyDown={ev => { 
              if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { 
                ev.preventDefault(); 
                if (isEditing) { saveEdit(post.id); } else { verifyAndEdit(post.id); } 
              } 
            }} 
          />
          
          {isEditing ? (
            <div className="action-buttons">
              <button onClick={() => saveEdit(post.id)} className="btn btn-primary btn-sm mr-2">저장</button>
              <button onClick={() => setEditing(e => { const copy = { ...e }; delete copy[post.id]; return copy })} className="btn btn-secondary btn-sm">취소</button>
            </div>
          ) : (
            <div className="action-buttons">
              <button onClick={() => verifyAndEdit(post.id)} className="btn btn-secondary btn-sm mr-2">수정</button>
              <button onClick={() => deletePost(post.id)} className="btn btn-danger-outline btn-sm">삭제</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
