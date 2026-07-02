const { query } = require('../../../lib/db')

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is not defined');
}

export default async function handler(req, res) {
  const { method } = req
  const forwarded = req.headers['x-forwarded-for']
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress
  const timestamp = new Date().toISOString()

  // Authenticate Admin
  const auth = req.headers['authorization'] || req.query.auth || (req.body && req.body.auth);
  if (auth !== ADMIN_PASSWORD) {
    console.log(`[${timestamp}] [API LOG] [401 Unauthorized] 어드민 IP 밴 API 접근 실패 - 인증 오류 (IP: ${clientIp})`);
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    if (method === 'GET') {
      const result = await query('SELECT id, ip, reason, created_at FROM ip_bans ORDER BY created_at DESC')
      const bans = (result.rows || []).map(b => ({
        id: b.id.toString(),
        ip: b.ip,
        reason: b.reason,
        created_at: b.created_at
      }))
      return res.status(200).json(bans)
    }

    if (method === 'POST') {
      const { ip, postId, reason } = req.body || {}
      let ipToBan = ip
      let fullReason = reason || ''

      if (postId) {
        // Ban via post ID
        const postRes = await query('SELECT ip, content FROM posts WHERE id = $1', [Number(postId)])
        if (!postRes || postRes.rowCount === 0) {
          return res.status(404).json({ error: 'Post not found' })
        }
        const post = postRes.rows[0]
        ipToBan = post.ip
        if (!ipToBan) {
          return res.status(400).json({ error: 'This post has no IP recorded' })
        }
        const snippet = post.content ? (post.content.length > 60 ? post.content.substring(0, 60) + '...' : post.content) : '(내용 없음)'
        fullReason = `쓴 글: "${snippet}"` + (reason ? ` | 사유: ${reason}` : '')
      }

      if (!ipToBan) {
        return res.status(400).json({ error: 'IP address is required' })
      }

      // Upsert into ip_bans
      const insertSql = `
        INSERT INTO ip_bans (ip, reason)
        VALUES ($1, $2)
        ON CONFLICT (ip)
        DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()
        RETURNING *
      `
      const banResult = await query(insertSql, [ipToBan, fullReason])
      console.log(`[${timestamp}] [API LOG] [201 Created] IP 차단 등록 완료 (IP: ${ipToBan}, 사유: ${fullReason})`)
      return res.status(201).json({ success: true, ban: banResult.rows[0] })
    }

    if (method === 'DELETE') {
      const { ip } = req.body || req.query || {}
      if (!ip) {
        return res.status(400).json({ error: 'IP to unban is required' })
      }
      await query('DELETE FROM ip_bans WHERE ip = $1', [ip])
      console.log(`[${timestamp}] [API LOG] [200 OK] IP 차단 해제 완료 (IP: ${ip})`)
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    res.status(405).end(`Method ${method} Not Allowed`)
  } catch (err) {
    console.error(`[${timestamp}] [API ERROR] IP Bans API error`, err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
