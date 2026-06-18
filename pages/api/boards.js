const { query } = require('../../lib/db')

export default async function handler(req, res) {
  const { method } = req

  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress
  const userAgent = req.headers['user-agent'] || 'Unknown'
  const timestamp = new Date().toISOString()

  try {
    if (method === 'GET') {
      // support optional query params for direct lookups
      const { id, grid_x, grid_y } = req.query || {}
      if (id) {
        const result = await query('SELECT id, name, grid_x, grid_y, posts_count, center_lng, center_lat FROM boards WHERE id = $1', [Number(id)])
        const r = result.rows[0]
        if (!r) return res.status(404).json({ error: 'not found' })
        return res.status(200).json({ id: r.id, name: r.name, x: r.grid_x, y: r.grid_y, lng: r.center_lng, lat: r.center_lat, count: r.posts_count || 0 })
      }
      if (grid_x != null && grid_y != null) {
        const result = await query('SELECT id, name, grid_x, grid_y, posts_count, center_lng, center_lat FROM boards WHERE grid_x = $1 AND grid_y = $2', [Number(grid_x), Number(grid_y)])
        const r = result.rows[0]
        if (!r) return res.status(404).json({ error: 'not found' })
        return res.status(200).json({ id: r.id, name: r.name, x: r.grid_x, y: r.grid_y, lng: r.center_lng, lat: r.center_lat, count: r.posts_count || 0 })
      }
      // default: return list minimal fields
      const result = await query('SELECT id, name, grid_x, grid_y, posts_count, center_lng, center_lat FROM boards ORDER BY id')
      const rows = (result.rows || []).map(r => ({ id: r.id, name: r.name, x: r.grid_x, y: r.grid_y, lng: r.center_lng, lat: r.center_lat, count: r.posts_count || 0 }))
      return res.status(200).json(rows)
    }

    if (method === 'POST') {
      // accept optional grid and center fields so clients can create boards tied to a grid
      const { name, grid_x, grid_y, center_lng, center_lat } = req.body || {}
      
      console.log(`[${timestamp}] [API LOG] [POST] /api/boards - 새 게시판 생성 요청 들어옴 (IP: ${ip}, 이름: ${name}, 좌표: (${grid_x}, ${grid_y}), UA: ${userAgent})`)

      const insertSql = `INSERT INTO boards(name, grid_x, grid_y, center_lng, center_lat)
        VALUES($1,$2,$3,$4,$5) RETURNING id, name, grid_x, grid_y, center_lng, center_lat`
      const params = [name || `board-${Date.now()}`,
        grid_x != null ? Number(grid_x) : null,
        grid_y != null ? Number(grid_y) : null,
        center_lng != null ? Number(center_lng) : null,
        center_lat != null ? Number(center_lat) : null
      ]
      const result = await query(insertSql, params)
      
      const successTimestamp = new Date().toISOString()
      console.log(`[${successTimestamp}] [API LOG] [201 Created] 새 게시판 생성 완료 (IP: ${ip}, 보드 ID: ${result.rows[0].id}, 이름: ${result.rows[0].name})`)
      return res.status(201).json(result.rows[0])
    }

    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${method} Not Allowed`)
  } catch (err) {
    const errorTimestamp = new Date().toISOString()
    console.error(`[${errorTimestamp}] [API ERROR] boards API error`, err)
    res.status(500).json({ error: 'internal_error' })
  }
}
