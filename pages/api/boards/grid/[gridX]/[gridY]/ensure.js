const { query, pool } = require('../../../../../../lib/db')

export default async function handler(req, res) {
  const { method } = req
  const { gridX, gridY } = req.query
  if (method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${method} Not Allowed`)
  }

  try {
    const body = req.body || {}
    const gx = Number(gridX)
    const gy = Number(gridY)
    if (Number.isNaN(gx) || Number.isNaN(gy)) return res.status(400).json({ error: 'invalid grid coordinates' })

    // check existing board
    const exists = await query('SELECT id, meta FROM boards WHERE grid_x = $1 AND grid_y = $2 LIMIT 1', [gx, gy])
    if (exists && exists.rowCount > 0) {
      return res.status(200).json({ id: exists.rows[0].id })
    }

    // not exists: create board record only (do not create a per-grid posts table)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const name = body.name || `grid_${gx}_${gy}`
      // Insert into boards; meta can be provided by caller or left null
      const insert = await client.query(
        'INSERT INTO boards(name, grid_x, grid_y, center_lng, center_lat, meta) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
        [name, gx, gy, body.center_lng || null, body.center_lat || null, body.meta || null]
      )
      const id = insert.rows[0].id
      await client.query('COMMIT')
      return res.status(201).json({ id })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    const errorTimestamp = new Date().toISOString()
    console.error(`[${errorTimestamp}] [API ERROR] ensure board error`, err)
    res.status(500).json({ error: 'internal_error' })
  }
}
