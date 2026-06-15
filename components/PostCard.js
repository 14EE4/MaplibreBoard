import React from 'react'
import { escapeHtml, formatTime } from '../lib/utils'

export default function PostCard({
  post,
  editing,
  setEditing,
  setLightboxImage,
  verifyAndEdit,
  saveEdit,
  deletePost
}) {
  const isEditing = editing[post.id]?.editing

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-header-left">
          <span className="post-number">No. {post.id}</span>
          <span className="post-author">{post.author ? escapeHtml(post.author) : '익명'}</span>
        </div>
        <span className="post-date">{post.created_at ? formatTime(post.created_at) : ''}</span>
      </div>

      <div className="post-body">
        {isEditing ? (
          <textarea 
            className="textarea-field edit-textarea"
            value={editing[post.id].value} 
            onChange={ev => setEditing(prev => ({ ...prev, [post.id]: { editing: true, value: ev.target.value } }))} 
            onKeyDown={ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); saveEdit(post.id); } }} 
          />
        ) : (
          <>
            <p className="post-text" dangerouslySetInnerHTML={{ __html: escapeHtml(post.content || '').replace(/\n/g, '<br>') }} />
            {post.image_url && (
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
          </>
        )}
      </div>

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
    </div>
  )
}
