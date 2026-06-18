import React, { useEffect, useRef } from 'react'

export default function WriteForm({
  author,
  setAuthor,
  rememberNickname,
  setRememberNickname,
  content,
  setContent,
  postPassword,
  setPostPassword,
  imagePreview,
  imageError,
  loading,
  handleFileChange,
  handleRemoveImage,
  submitPost,
  handlePaste
}) {
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])

  return (
    <div className="write-card">
      <h3>새 글 작성</h3>
      <div className="write-form">
        <div className="author-container">
          <input 
            id="author" 
            placeholder="작성자 닉네임 (선택 - 최대 20자)" 
            maxLength={20}
            value={author} 
            onChange={e => setAuthor(e.target.value)} 
            className="input-field" 
          />
          <label className="remember-nickname-label">
            <input 
              type="checkbox" 
              checked={rememberNickname}
              onChange={e => setRememberNickname(e.target.checked)}
              className="checkbox-field"
            />
            닉네임 기억하기
          </label>
        </div>
        <div className="textarea-container" style={{ position: 'relative' }}>
          <textarea 
            id="content" 
            ref={textareaRef}
            placeholder="따뜻한 한 마디를 적어보세요... (Ctrl+Enter로 즉시 전송)" 
            value={content} 
            maxLength={1000}
            onChange={e => setContent(e.target.value)} 
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submitPost(); } }}
            onPaste={handlePaste}
            className="textarea-field"
            style={{ paddingBottom: '30px' }}
          />
          <div className={`char-counter ${content.length >= 850 ? 'warning' : ''} ${content.length >= 1000 ? 'danger' : ''}`}>
            {content.length} / 1000
          </div>
        </div>

        {/* Image Upload Area */}
        <div className="upload-wrapper" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
            <button 
              type="button" 
              onClick={() => document.getElementById('imageInput')?.click()}
              disabled={loading}
              className="btn btn-secondary btn-sm upload-btn"
            >
              📷 사진 첨부하기
            </button>
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
          {imageError && (
            <div className="upload-error-msg" style={{ color: '#ef4444', fontSize: '13px', margin: '4px 0 0 0' }}>
              ⚠️ {imageError}
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
  )
}
