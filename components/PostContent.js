import React from 'react'

export default function PostContent({ content, onCitationClick, onCitationHover }) {
  if (!content) return null

  // Split content by citation patterns: >>digits or @digits
  const parts = content.split(/(>>\d+|@\d+)/g)

  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^(>>|@)(\d+)$/)
        if (match) {
          const type = match[1]
          const targetId = match[2]
          return (
            <a
              key={index}
              href={`#post-${targetId}`}
              className="citation-link"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (onCitationClick) {
                  onCitationClick(targetId)
                }
              }}
              onMouseEnter={(e) => onCitationHover && onCitationHover(e, targetId)}
              onMouseLeave={() => onCitationHover && onCitationHover(null)}
            >
              {type}{targetId}
            </a>
          )
        }

        // Handle newlines within normal text segments
        const lines = part.split('\n')
        return lines.map((line, lineIdx) => (
          <React.Fragment key={`${index}-${lineIdx}`}>
            {line}
            {lineIdx < lines.length - 1 && <br />}
          </React.Fragment>
        ))
      })}
    </>
  )
}
