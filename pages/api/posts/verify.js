const { query } = require('../../../lib/db')
const crypto = require('crypto')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
  try {
    const { id, password } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    const hashed = password ? crypto.createHash('sha256').update(String(password), 'utf8').digest('hex') : null
    const result = await query('SELECT password FROM posts WHERE id = $1', [Number(id)])
    if (!result || result.rowCount === 0) return res.status(404).json({ error: 'not found' })
    const stored = result.rows[0].password
    if ((stored == null && hashed == null) || (stored != null && stored === hashed)) {
      return res.status(200).json({ ok: true })
    }
    return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })
  } catch (err) {
    console.error('[API ERROR] posts verify error', err)
    return res.status(500).json({ error: 'internal_error' })
  }
}
