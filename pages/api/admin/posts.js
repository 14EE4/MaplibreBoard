const { query } = require('../../../lib/db')

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is not defined');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] [API LOG] [GET] /api/admin/posts - 어드민 전체 게시글 목록 조회 시도 (IP: ${ip}, UA: ${userAgent})`);

  // 1. Authenticate Request
  const auth = req.headers['authorization'] || req.query.auth || (req.body && req.body.auth);
  if (auth !== ADMIN_PASSWORD) {
    const failTimestamp = new Date().toISOString();
    console.log(`[${failTimestamp}] [API LOG] [401 Unauthorized] 어드민 전체 게시글 목록 조회 실패 - 인증 실패 (IP: ${ip})`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch all posts including IP, os, browser, location
    const result = await query(`
      SELECT p.id, p.board_id, p.author, p.content, p.image_url, p.ip, p.os, p.browser, p.location, p.created_at, p.updated_at,
             b.name as board_name, b.grid_x as board_x, b.grid_y as board_y
      FROM posts p
      LEFT JOIN boards b ON p.board_id = b.id
      ORDER BY p.created_at DESC
    `);
    
    // Map database rows to output objects with string IDs for JSON compatibility
    const posts = (result.rows || []).map(p => ({
      id: p.id.toString(),
      board_id: p.board_id ? p.board_id.toString() : null,
      author: p.author,
      content: p.content,
      image_url: p.image_url,
      ip: p.ip,
      os: p.os,
      browser: p.browser,
      location: p.location,
      created_at: p.created_at,
      updated_at: p.updated_at,
      board_name: p.board_name,
      board_x: p.board_x,
      board_y: p.board_y
    }));

    const successTimestamp = new Date().toISOString();
    console.log(`[${successTimestamp}] [API LOG] [200 OK] 어드민 전체 게시글 목록 조회 성공 - 총 ${posts.length}건 (IP: ${ip})`);
    return res.status(200).json(posts);
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] [API ERROR] 어드민 전체 게시글 목록 조회 에러:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
