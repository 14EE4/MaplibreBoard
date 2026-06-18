const { query } = require('../../../lib/db')
const crypto = require('crypto')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress
  const userAgent = req.headers['user-agent'] || 'Unknown'
  const timestamp = new Date().toISOString()

  try {
    const { id, password } = req.body
    if (!id) {
      console.log(`[${timestamp}] [API LOG] [400 Bad Request] 게시글 권한 검증 실패 - ID 누락 (IP: ${ip})`)
      return res.status(400).json({ error: 'id required' })
    }

    console.log(`[${timestamp}] [API LOG] [POST] /api/posts/verify - 게시글 권한 검증 요청 들어옴 (IP: ${ip}, 대상 글: ${id}, UA: ${userAgent})`)

    const hashed = password ? crypto.createHash('sha256').update(String(password), 'utf8').digest('hex') : null
    const result = await query('SELECT password FROM posts WHERE id = $1', [Number(id)])
    if (!result || result.rowCount === 0) {
      console.log(`[${timestamp}] [API LOG] [404 Not Found] 게시글 권한 검증 실패 - 존재하지 않는 글 (IP: ${ip}, 대상 글: ${id})`)
      return res.status(404).json({ error: 'not found' })
    }
    const stored = result.rows[0].password
    if ((stored == null && hashed == null) || (stored != null && stored === hashed)) {
      const successTimestamp = new Date().toISOString()
      console.log(`[${successTimestamp}] [API LOG] [200 OK] 게시글 권한 검증 성공 (IP: ${ip}, 대상 글: ${id})`)
      return res.status(200).json({ ok: true })
    }

    const failTimestamp = new Date().toISOString()
    console.log(`[${failTimestamp}] [API LOG] [403 Forbidden] 게시글 권한 검증 실패 - 비밀번호 불일치 (IP: ${ip}, 대상 글: ${id})`)
    return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })
  } catch (err) {
    const errorTimestamp = new Date().toISOString()
    console.error(`[${errorTimestamp}] [API ERROR] posts verify error`, err)
    return res.status(500).json({ error: 'internal_error' })
  }
}
