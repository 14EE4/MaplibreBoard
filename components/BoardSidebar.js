import React from 'react'

export default function BoardSidebar({ boardMeta, resolvedBoardId, metaText, loading, createBoardAndOpen }) {
  return (
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
  )
}
