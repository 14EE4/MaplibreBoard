import React from 'react'

export default function Lightbox({ imageUrl, onClose }) {
  if (!imageUrl) return null
  return (
    <div onClick={onClose} className="lightbox-overlay">
      <div className="lightbox-wrapper" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Enlarged image" className="lightbox-img" />
        <button onClick={onClose} className="lightbox-close-btn">
          ✕
        </button>
      </div>
    </div>
  )
}
