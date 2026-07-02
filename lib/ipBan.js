const { query } = require('./db')

async function isIPBanned(ip) {
  if (!ip) return { banned: false }
  try {
    const result = await query('SELECT reason FROM ip_bans WHERE ip = $1', [ip])
    if (result && result.rowCount > 0) {
      return { banned: true, reason: result.rows[0].reason || '사유가 기재되지 않았습니다.' }
    }
  } catch (err) {
    console.error('IP 차단 여부 확인 중 오류 발생:', err)
  }
  return { banned: false }
}

async function checkIPBanMiddleware(req, res) {
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress
  const banStatus = await isIPBanned(ip)
  if (banStatus.banned) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [API LOG] [403 Forbidden] 차단된 IP의 API 요청 거절 (IP: ${ip}, 경로: ${req.url}, 사유: ${banStatus.reason})`)
    res.status(403).json({ error: 'Banned', banned: true, reason: banStatus.reason })
    return true
  }
  return false
}

module.exports = {
  isIPBanned,
  checkIPBanMiddleware
}
