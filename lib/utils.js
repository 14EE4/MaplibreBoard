export const escapeHtml = (str) => {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const formatTime = (ts) => {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString()
  } catch (e) {
    return ts
  }
}
