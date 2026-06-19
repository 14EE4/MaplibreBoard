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
      <h3>New Post</h3>
      <div className="write-form">
        <div className="author-container">
          <div style={{ position: 'relative', width: '100%' }}>
            <input 
              id="author" 
              placeholder="Nickname (Optional)" 
              maxLength={20}
              value={author} 
              onChange={e => setAuthor(e.target.value)} 
              className="input-field" 
              style={{ paddingRight: '60px' }}
            />
            <div className={`char-counter ${(author || '').length >= 15 ? 'warning' : ''} ${(author || '').length >= 20 ? 'danger' : ''}`}>
              {(author || '').length} / 20
            </div>
          </div>
          <label className="remember-nickname-label">
            <input 
              type="checkbox" 
              checked={rememberNickname}
              onChange={e => setRememberNickname(e.target.checked)}
              className="checkbox-field"
            />
            Remember Nickname
          </label>
        </div>
        <div className="textarea-container" style={{ position: 'relative' }}>
          <textarea 
            id="content" 
            ref={textareaRef}
            placeholder="Write a message... (Ctrl+Enter to submit)" 
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
              📷 Add Photo
            </button>
            <input id="imageInput" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            
            {imagePreview && (
              <div className="image-preview-box">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Upload preview" className="preview-img" />
                <button onClick={handleRemoveImage} className="remove-preview-btn" title="Remove Photo">
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
              placeholder="Password (Optional)" 
              maxLength={4} 
              value={postPassword} 
              onChange={e => setPostPassword(e.target.value)} 
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submitPost(); } }}
              className="input-field pwd-field" 
            />
            <span className="pwd-helper">* Set password to edit/delete</span>
          </div>
          
          <button id="submitPost" onClick={submitPost} disabled={loading} className="btn btn-primary" title="Post">
            {loading ? 'Submitting...' : '✏️'}
          </button>
        </div>
      </div>
    </div>
  )
}
