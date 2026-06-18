const { query, pool } = require('../../lib/db')
const crypto = require('crypto')
const geoip = require('geoip-lite')

function parseUA(ua) {
  if (!ua) return { os: 'Unknown', browser: 'Unknown' };
  
  let os = 'Unknown';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown';
  if (/Whale/i.test(ua)) browser = 'Whale';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Trident|MSIE/i.test(ua)) browser = 'IE';

  return { os, browser };
}

// Posts API (unified posts table)
// GET /api/posts?board_id=1  => list posts for board (if board_id provided) or all posts
// POST /api/posts  => create { board_id, author, content, password }
// PUT /api/posts   => update { id, author, content, password }
// DELETE /api/posts?id=ID => delete

export default async function handler(req, res) {
  const { method } = req
  try {
    if (method === 'GET') {
      const { board_id, id } = req.query
      if (id) {
        const result = await query(`
          SELECT p.id, p.board_id, p.author, p.content, p.image_url, p.created_at, p.updated_at,
                 b.name as board_name, b.grid_x as board_x, b.grid_y as board_y
          FROM posts p
          LEFT JOIN boards b ON p.board_id = b.id
          WHERE p.id = $1
        `, [Number(id)])
        if (!result || result.rowCount === 0) {
          return res.status(404).json({ error: 'Post not found' })
        }
        return res.status(200).json(result.rows[0])
      }
      if (board_id) {
        const result = await query(`
          SELECT id, board_id, author, content, image_url, created_at, updated_at
          FROM posts
          WHERE board_id = $1
          ORDER BY created_at DESC
        `, [Number(board_id)])
        return res.status(200).json(result.rows)
      }
      const result = await query(`
        SELECT p.id, p.board_id, p.author, p.content, p.image_url, p.created_at, p.updated_at,
               b.name as board_name, b.grid_x as board_x, b.grid_y as board_y
        FROM posts p
        LEFT JOIN boards b ON p.board_id = b.id
        ORDER BY p.created_at DESC
      `)
      return res.status(200).json(result.rows)
    }

    if (method === 'POST') {
      const { board_id, author, content, password, image_url } = req.body

      // Extract real client IP (Nginx proxy pass environments set x-forwarded-for)
      const forwarded = req.headers['x-forwarded-for']
      const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress
      const userAgent = req.headers['user-agent'] || 'Unknown'
      const { os, browser } = parseUA(userAgent)
      const timestamp = new Date().toISOString()
      const contentSnippet = content ? (content.length > 20 ? content.substring(0, 20) + '...' : content) : '';

      let location = null;
      if (ip) {
        const geo = geoip.lookup(ip);
        if (geo) {
          const country = geo.country || 'Unknown';
          const city = geo.city || 'Unknown';
          location = `${country} / ${city}`;
        } else if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('172.30.')) {
          location = 'Local';
        }
      }

      console.log(`[${timestamp}] [API LOG] [POST] /api/posts - 새 글 작성 요청 들어옴 (IP: ${ip}, 작성자: ${author || '익명'}, 내용 일부: "${contentSnippet}", UA: ${userAgent})`)

      if (!board_id || !content) {
        console.log(`[${timestamp}] [API LOG] [400 Bad Request] 글 작성 실패 - 필수값 누락 (IP: ${ip})`)
        return res.status(400).json({ error: 'board_id and content required' })
      }
      if (author && author.length > 20) {
        console.log(`[${timestamp}] [API LOG] [400 Bad Request] 글 작성 실패 - 닉네임 길이 초과 (IP: ${ip})`)
        return res.status(400).json({ error: '닉네임은 최대 20자까지 입력 가능합니다.' })
      }
      if (content && content.length > 1000) {
        console.log(`[${timestamp}] [API LOG] [400 Bad Request] 글 작성 실패 - 내용 길이 초과 (IP: ${ip})`)
        return res.status(400).json({ error: '내용은 최대 1000자까지 입력 가능합니다.' })
      }

      // hash password (SHA-256 hex) to be compatible with backend service
      const hashed = password ? crypto.createHash('sha256').update(String(password), 'utf8').digest('hex') : null

      // transaction: insert post and increment boards.posts_count
      const client = await (await pool).connect()
      try {
        await client.query('BEGIN')
        const insertSql = 'INSERT INTO posts (board_id, author, content, password, image_url, ip, os, browser, location) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *'
        const insert = await client.query(insertSql, [board_id, author || null, content, hashed, image_url || null, ip || null, os || null, browser || null, location || null])
        await client.query('UPDATE boards SET posts_count = posts_count + 1 WHERE id = $1', [board_id])
        await client.query('COMMIT')
        
        const savedPost = insert.rows[0]
        
        const successTimestamp = new Date().toISOString()
        const savedContentSnippet = savedPost.content ? (savedPost.content.length > 20 ? savedPost.content.substring(0, 20) + '...' : savedPost.content) : '';
        console.log(`[${successTimestamp}] [API LOG] [201 Created] 글 작성 완료 (IP: ${ip}, 등록된 글 번호: ${savedPost.id}, 작성자: ${savedPost.author || '익명'}, 내용 일부: "${savedContentSnippet}")`)

        delete savedPost.ip // Securely remove IP from returned response to prevent leakage
        delete savedPost.os // Securely remove OS from returned response to prevent leakage
        delete savedPost.browser // Securely remove Browser from returned response to prevent leakage
        delete savedPost.location // Securely remove Location from returned response to prevent leakage
        
        return res.status(201).json(savedPost)
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }

    if (method === 'PUT') {
      const { id, author, content, password } = req.body
      
      const forwarded = req.headers['x-forwarded-for']
      const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress
      const userAgent = req.headers['user-agent'] || 'Unknown'
      const timestamp = new Date().toISOString()
      const contentSnippet = content ? (content.length > 20 ? content.substring(0, 20) + '...' : content) : '';

      console.log(`[${timestamp}] [API LOG] [PUT] /api/posts - 글 수정 요청 들어옴 (IP: ${ip}, 대상 글: ${id}, 작성자: ${author || '익명'}, 내용 일부: "${contentSnippet}", UA: ${userAgent})`)

      if (!id || !content) {
        console.log(`[${timestamp}] [API LOG] [400 Bad Request] 글 수정 실패 - 필수값 누락 (IP: ${ip})`)
        return res.status(400).json({ error: 'id and content required' })
      }
      if (author && author.length > 20) {
        console.log(`[${timestamp}] [API LOG] [400 Bad Request] 글 수정 실패 - 닉네임 길이 초과 (IP: ${ip})`)
        return res.status(400).json({ error: '닉네임은 최대 20자까지 입력 가능합니다.' })
      }
      if (content && content.length > 1000) {
        console.log(`[${timestamp}] [API LOG] [400 Bad Request] 글 수정 실패 - 내용 길이 초과 (IP: ${ip})`)
        return res.status(400).json({ error: '내용은 최대 1000자까지 입력 가능합니다.' })
      }
      const hashed = password ? crypto.createHash('sha256').update(String(password), 'utf8').digest('hex') : null

      // Verify existing post password before updating to prevent unauthorized edits
      const existing = await query('SELECT password FROM posts WHERE id = $1', [Number(id)])
      if (!existing || existing.rowCount === 0) {
        console.log(`[${timestamp}] [API LOG] [404 Not Found] 글 수정 실패 - 존재하지 않는 글 (IP: ${ip}, 대상 글: ${id})`)
        return res.status(404).json({ error: 'not found' })
      }
      const stored = existing.rows[0].password
      if (!((stored == null && hashed == null) || (stored != null && stored === hashed))) {
        console.log(`[${timestamp}] [API LOG] [403 Forbidden] 글 수정 실패 - 비밀번호 불일치 (IP: ${ip}, 대상 글: ${id})`)
        return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })
      }

      const result = await query('UPDATE posts SET author=$1, content=$2, password=$3, updated_at=now() WHERE id=$4 RETURNING *', [author || null, content, hashed, id])
      if (!result || result.rowCount === 0) {
        console.log(`[${timestamp}] [API LOG] [404 Not Found] 글 수정 실패 - 업데이트 실패 (IP: ${ip}, 대상 글: ${id})`)
        return res.status(404).json({ error: 'not found' })
      }
      
      const successTimestamp = new Date().toISOString()
      const updatedPost = result.rows[0]
      const updatedContentSnippet = updatedPost.content ? (updatedPost.content.length > 20 ? updatedPost.content.substring(0, 20) + '...' : updatedPost.content) : '';
      console.log(`[${successTimestamp}] [API LOG] [200 OK] 글 수정 완료 (IP: ${ip}, 대상 글: ${id}, 작성자: ${updatedPost.author || '익명'}, 내용 일부: "${updatedContentSnippet}")`)
      return res.status(200).json(updatedPost)
    }

    if (method === 'DELETE') {
      // accept id either in query or in JSON body; require password verification
      const body = req.body || {}
      const id = req.query.id || body.id
      const password = body.password || null
      
      const forwarded = req.headers['x-forwarded-for']
      const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress
      const userAgent = req.headers['user-agent'] || 'Unknown'
      const timestamp = new Date().toISOString()

      if (!id) {
        console.log(`[${timestamp}] [API LOG] [400 Bad Request] 글 삭제 실패 - 필수값 누락 (IP: ${ip})`)
        return res.status(400).json({ error: 'id required' })
      }

      const hashed = password ? crypto.createHash('sha256').update(String(password), 'utf8').digest('hex') : null

      const existing = await query('SELECT password, board_id, author, content FROM posts WHERE id = $1', [Number(id)])
      if (!existing || existing.rowCount === 0) {
        console.log(`[${timestamp}] [API LOG] [404 Not Found] 글 삭제 실패 - 존재하지 않는 글 (IP: ${ip}, 대상 글: ${id})`)
        return res.status(404).json({ error: 'not found' })
      }

      const existingPost = existing.rows[0]
      const existingContentSnippet = existingPost.content ? (existingPost.content.length > 20 ? existingPost.content.substring(0, 20) + '...' : existingPost.content) : '';
      console.log(`[${timestamp}] [API LOG] [DELETE] /api/posts - 글 삭제 요청 들어옴 (IP: ${ip}, 대상 글: ${id}, 작성자: ${existingPost.author || '익명'}, 내용 일부: "${existingContentSnippet}", UA: ${userAgent})`)

      if (existingPost.content === '(이 글은 삭제되었습니다)') {
        console.log(`[${timestamp}] [API LOG] [400 Bad Request] 글 삭제 실패 - 이미 삭제된 글 (IP: ${ip}, 대상 글: ${id})`)
        return res.status(400).json({ error: '이미 삭제된 게시글입니다.' })
      }

      const stored = existingPost.password
      if (!((stored == null && hashed == null) || (stored != null && stored === hashed))) {
        console.log(`[${timestamp}] [API LOG] [403 Forbidden] 글 삭제 실패 - 비밀번호 불일치 (IP: ${ip}, 대상 글: ${id})`)
        return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' })
      }

      // transaction: update post content and decrement boards.posts_count
      const client = await (await require('../../lib/db').pool).connect()
      try {
        await client.query('BEGIN')
        const del = await client.query(
          "UPDATE posts SET content = '(이 글은 삭제되었습니다)', author = null, password = null, image_url = null, updated_at = now() WHERE id = $1 RETURNING *",
          [Number(id)]
        )
        if (del.rowCount === 0) {
          await client.query('ROLLBACK')
          console.log(`[${timestamp}] [API LOG] [404 Not Found] 글 삭제 실패 - 업데이트 실패 (IP: ${ip}, 대상 글: ${id})`)
          return res.status(404).json({ error: 'not found' })
        }
        const boardId = del.rows[0].board_id
        await client.query('UPDATE boards SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = $1', [boardId])
        await client.query('COMMIT')
        
        const successTimestamp = new Date().toISOString()
        console.log(`[${successTimestamp}] [API LOG] [200 OK] 글 삭제 완료 (IP: ${ip}, 대상 글: ${id}, 기존 작성자: ${existingPost.author || '익명'})`)
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
    console.error('[API ERROR] posts API error', err)
    res.status(500).json({ error: 'internal_error' })
  }
}
