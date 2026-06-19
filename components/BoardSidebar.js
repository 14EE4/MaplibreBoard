import React from 'react'

export default function BoardSidebar({ boardMeta, resolvedBoardId, metaText, loading, createBoardAndOpen, gridX, gridY }) {
  return (
    <aside className="board-sidebar">
      <div className="sidebar-card">
        <h2>Board Info</h2>
        <div className="meta-info-text">{metaText}</div>
        
        {boardMeta ? (
          <div className="meta-details">
            <div className="meta-row">
              <span className="meta-label">Board ID</span>
              <span className="meta-val">{resolvedBoardId || boardMeta.id || '(Unknown)'}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Board Name</span>
              <span className="meta-val highlight-text">{boardMeta.name || '(Unnamed)'}</span>
            </div>
            {((boardMeta.grid_x != null) || (boardMeta.x != null)) && (
              <div className="meta-row">
                <span className="meta-label">Grid Coordinates</span>
                <span className="meta-val">({(boardMeta.grid_x != null) ? boardMeta.grid_x : boardMeta.x}, {(boardMeta.grid_y != null) ? boardMeta.grid_y : boardMeta.y})</span>
              </div>
            )}
            {((boardMeta.posts_count != null) || (boardMeta.count != null)) && (
              <div className="meta-row">
                <span className="meta-label">Posts</span>
                <span className="meta-val badge-count">{(boardMeta.posts_count != null) ? boardMeta.posts_count : boardMeta.count}</span>
              </div>
            )}
            {((boardMeta.center_lng != null) || (boardMeta.lng != null)) && (
              <div className="meta-row">
                <span className="meta-label">Center Coordinates</span>
                <span className="meta-val">
                  {((boardMeta.center_lng != null) ? boardMeta.center_lng : boardMeta.lng).toFixed(4)}, {((boardMeta.center_lat != null) ? boardMeta.center_lat : boardMeta.lat).toFixed(4)}
                </span>
              </div>
            )}
          </div>
        ) : (
          !loading && (
            <div className="empty-board-setup">
              <p>There is no active board at this grid position, or it has not been registered in the database yet.</p>
              <div className="setup-buttons">
                <button onClick={() => createBoardAndOpen()} className="btn btn-primary btn-sm btn-full mb-2">
                  Create & Open Default Board
                </button>
                <button 
                  onClick={() => {
                    const defaultName = (gridX != null && gridY != null) 
                      ? `grid_${gridX}_${gridY}` 
                      : 'New Board'
                    const name = (typeof window !== 'undefined' && typeof window.prompt === 'function') 
                      ? window.prompt('Enter a name for the new board', defaultName) 
                      : null
                    if (name === null) return
                    createBoardAndOpen(name)
                  }} 
                  className="btn btn-secondary btn-sm btn-full"
                >
                  Create with Custom Name
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <div className="info-helper-box">
        <p>💡 <strong>Info:</strong> You can access a grid board directly using the grid coordinates (X, Y) query parameters.</p>
        <code>e.g. /board?grid_x=61&grid_y=25</code>
      </div>

      <div className="info-helper-box privacy-notice-box">
        <p>🔒 <strong>Privacy & Log Notice:</strong></p>
        <p className="privacy-desc">
          While this service guarantees anonymity, your IP address and device info (User-Agent) are safely recorded at the time of writing, editing, or deleting posts to ensure system stability and combat spam/abuse. These logs are never shown to public users and can only be verified by the admin.
        </p>
      </div>
    </aside>
  )
}
