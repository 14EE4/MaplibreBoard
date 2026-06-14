const { query, pool } = require('../../lib/db')
const crypto = require('crypto')

// Posts API (unified posts table)
// GET /api/posts?board_id=1  => list posts for board (if board_id provided) or all posts
// POST /api/posts  => create { board_id, author, content, password }
// PUT /api/posts   => update { id, author, content, password }
// DELETE /api/posts?id=ID => delete

export default async function handler(req, res) {
  const { method } = req
  try {
    if (method === 'GET') {
      const { board_id } = req.query
      if (board_id) {
        const result = await query('SELECT * FROM posts WHERE board_id = $1 ORDER BY created_at DESC', [Number(board_id)])
        return res.status(200).json(result.rows)
      }
      const result = await query(`
        SELECT p.*, b.name as board_name, b.grid_x as board_x, b.grid_y as board_y
        FROM posts p
        LEFT JOIN boards b ON p.board_id = b.id
        ORDER BY p.created_at DESC
      `)
      return res.status(200).json(result.rows)
    }

    if (method === 'POST') {
      const { board_id, author, content, password, image_url } = req.body
      if (!board_id || !content) return res.status(400).json({ error: 'board_id and content required' })

      // hash password (SHA-256 hex) to be compatible with backend service
      const hashed = password ? crypto.createHash('sha256').update(String(password), 'utf8').digest('hex') : null

      // transaction: insert post and increment boards.posts_count
      const client = await (await pool).connect()
      try {
        await client.query('BEGIN')
        const insertSql = 'INSERT INTO posts (board_id, author, content, password, image_url) VALUES($1,$2,$3,$4,$5) RETURNING *'
        const insert = await client.query(insertSql, [board_id, author || null, content, hashed, image_url || null])
        await client.query('UPDATE boards SET posts_count = posts_count + 1 WHERE id = $1', [board_id])
        await client.query('COMMIT')
        return res.status(201).json(insert.rows[0])
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }

    if (method === 'PUT') {
      const { id, author, content, password } = req.body
      if (!id || !content) return res.status(400).json({ error: 'id and content required' })
      const hashed = password ? crypto.createHash('sha256').update(String(password), 'utf8').digest('hex') : null

      // Verify existing post password before updating to prevent unauthorized edits
      const existing = await query('SELECT password FROM posts WHERE id = $1', [Number(id)])
      if (!existing || existing.rowCount === 0) return res.status(404).json({ error: 'not found' })
      const stored = existing.rows[0].password
      if (!((stored == null && hashed == null) || (stored != null && stored === hashed))) {
        return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })
      }

      const result = await query('UPDATE posts SET author=$1, content=$2, password=$3, updated_at=now() WHERE id=$4 RETURNING *', [author || null, content, hashed, id])
      if (!result || result.rowCount === 0) return res.status(404).json({ error: 'not found' })
      return res.status(200).json(result.rows[0])
    }

    if (method === 'DELETE') {
      // accept id either in query or in JSON body; require password verification
      const body = req.body || {}
      const id = req.query.id || body.id
      const password = body.password || null
      if (!id) return res.status(400).json({ error: 'id required' })

      const hashed = password ? crypto.createHash('sha256').update(String(password), 'utf8').digest('hex') : null

      const existing = await query('SELECT password, board_id FROM posts WHERE id = $1', [Number(id)])
      if (!existing || existing.rowCount === 0) return res.status(404).json({ error: 'not found' })
      const stored = existing.rows[0].password
      if (!((stored == null && hashed == null) || (stored != null && stored === hashed))) {
        return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })
      }

      // transaction: delete post and decrement boards.posts_count
      const client = await (await require('../../lib/db').pool).connect()
      try {
        await client.query('BEGIN')
        const del = await client.query('DELETE FROM posts WHERE id=$1 RETURNING *', [Number(id)])
        if (del.rowCount === 0) {
          await client.query('ROLLBACK')
          return res.status(404).json({ error: 'not found' })
        }
        const boardId = del.rows[0].board_id
        await client.query('UPDATE boards SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = $1', [boardId])
        await client.query('COMMIT')
        return res.status(200).json(del.rows[0])
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${method} Not Allowed`)
  } catch (err) {
    console.error('posts API error', err)
    res.status(500).json({ error: 'internal_error' })
  }
}
