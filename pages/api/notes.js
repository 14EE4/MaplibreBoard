const { query } = require('../../lib/db')

export default async function handler(req, res) {
  const { method } = req

  try {
    if (method === 'GET') {
      const result = await query('SELECT id, lng, lat, content, created_at FROM notes ORDER BY id')
      return res.status(200).json(result.rows)
    }

    if (method === 'POST') {
      const { lng, lat, content } = req.body
      const result = await query('INSERT INTO notes(lng, lat, content) VALUES($1, $2, $3) RETURNING id, lng, lat, content, created_at', [lng, lat, content])
      return res.status(201).json(result.rows[0])
    }

    if (method === 'PUT') {
      const { id, lng, lat, content } = req.body
      const result = await query('UPDATE notes SET lng=$1, lat=$2, content=$3 WHERE id=$4 RETURNING id, lng, lat, content, created_at', [lng, lat, content, id])
      if (result.rowCount === 0) return res.status(404).json({ error: 'not found' })
      return res.status(200).json(result.rows[0])
    }

    if (method === 'DELETE') {
      const { id } = req.query
      const result = await query('DELETE FROM notes WHERE id=$1 RETURNING id, lng, lat, content, created_at', [Number(id)])
      if (result.rowCount === 0) return res.status(404).json({ error: 'not found' })
      return res.status(200).json(result.rows[0])
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${method} Not Allowed`)
  } catch (err) {
    console.error('[API ERROR] notes API error', err)
    res.status(500).json({ error: 'internal_error' })
  }
}
