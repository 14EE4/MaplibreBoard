import React from 'react'
import { formatTime } from '../lib/utils'

export default function PostPreview({ post, position, loading, error }) {
  if (!post && !loading && !error) return null

  const style = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'translate(-50%, -100%)', // center horizontally and position above
    marginTop: '-8px',
    zIndex: 1000,
  }

  return (
    <div 
      className="post-preview-card" 
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {loading ? (
        <div className="preview-loading">Loading...</div>
      ) : error ? (
        <div className="preview-error">⚠️ {error}</div>
      ) : (
        <>
          <div className="preview-header">
            <span className="preview-number">No. {post.id}</span>
            <span className="preview-author">{post.author || 'Anonymous'}</span>
            <span className="preview-date">{post.created_at ? formatTime(post.created_at) : ''}</span>
          </div>
          <div className="preview-body">
            <p className="preview-text">
              {post.content}
            </p>
            {post.board_name && (
              <span className="preview-board-badge">
                📍 {post.board_name} {post.board_x !== null && post.board_y !== null ? `(${post.board_x}, ${post.board_y})` : ''}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
