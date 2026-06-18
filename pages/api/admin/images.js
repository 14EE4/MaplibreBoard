import fs from 'fs';
import path from 'path';
const { query, pool } = require('../../../lib/db');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is not defined');
}

export default async function handler(req, res) {
  const { method } = req;

  // 1. Authenticate Request
  const auth = req.headers['authorization'] || req.query.auth || (req.body && req.body.auth);
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const timestamp = new Date().toISOString();

  if (auth !== ADMIN_PASSWORD) {
    console.log(`[${timestamp}] [API LOG] [401 Unauthorized] 어드민 이미지 관리 API 호출 실패 - 인증 실패 (IP: ${ip})`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const uploadDir = path.join(process.cwd(), 'uploads');

  try {
    if (method === 'GET') {
      console.log(`[${timestamp}] [API LOG] [GET] /api/admin/images - 어드민 업로드 이미지 목록 조회 시도 (IP: ${ip})`);

      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        await fs.promises.mkdir(uploadDir, { recursive: true });
      }

      // Read physical upload files
      const files = await fs.promises.readdir(uploadDir);

      // Fetch all posts with images
      const result = await query(
        'SELECT id, board_id, author, content, image_url, created_at FROM posts WHERE image_url IS NOT NULL AND image_url LIKE $1',
        ['/uploads/%']
      );
      const posts = result.rows || [];

      // Map physical files to DB records
      const matchedImages = files.map((file) => {
        const imageUrl = `/uploads/${file}`;
        const associatedPosts = posts.filter((p) => p.image_url === imageUrl);

        return {
          fileName: file,
          url: imageUrl,
          posts: associatedPosts.map((p) => ({
            id: p.id.toString(), // BigInt to String for JSON safety
            boardId: p.board_id.toString(),
            author: p.author,
            content: p.content,
            created_at: p.created_at,
          })),
          isOrphaned: associatedPosts.length === 0,
        };
      });

      // Sort files: newest first (since filename starts with timestamp)
      matchedImages.sort((a, b) => b.fileName.localeCompare(a.fileName));

      const successTimestamp = new Date().toISOString();
      console.log(`[${successTimestamp}] [API LOG] [200 OK] 어드민 업로드 이미지 목록 조회 성공 (IP: ${ip}, 총 ${matchedImages.length}개)`);
      return res.status(200).json(matchedImages);
    }

    if (method === 'DELETE') {
      const { fileName, action } = req.body || {};
      console.log(`[${timestamp}] [API LOG] [DELETE] /api/admin/images - 이미지 검열 처리 시도 (IP: ${ip}, 파일: ${fileName}, 액션: ${action}, UA: ${userAgent})`);

      if (!fileName || !action) {
        console.log(`[${timestamp}] [API LOG] [400 Bad Request] 이미지 검열 실패 - 필수값 누락 (IP: ${ip})`);
        return res.status(400).json({ error: 'fileName and action are required' });
      }

      // Path Traversal Mitigation: reject any input trying to escape directory structure
      if (fileName !== path.basename(fileName)) {
        console.log(`[${timestamp}] [API LOG] [400 Bad Request] 이미지 검열 실패 - 디렉토리 우회 시도 차단 (IP: ${ip}, 파일: ${fileName})`);
        return res.status(400).json({ error: 'Path traversal attempt detected' });
      }

      const safeFileName = path.basename(fileName);
      const filePath = path.join(uploadDir, safeFileName);

      // Boundary check to prevent directory escape
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadsDir = path.resolve(uploadDir);
      if (!resolvedPath.startsWith(resolvedUploadsDir + path.sep)) {
        console.log(`[${timestamp}] [API LOG] [400 Bad Request] 이미지 검열 실패 - 범위 초과 파일 경로 (IP: ${ip}, 파일: ${fileName})`);
        return res.status(400).json({ error: 'Invalid file path boundary' });
      }

      const imageUrl = `/uploads/${safeFileName}`;

      if (action === 'delete-post') {
        // Find matching posts
        const postsResult = await query('SELECT id, board_id FROM posts WHERE image_url = $1', [imageUrl]);
        
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          for (const post of postsResult.rows) {
            // Soft-delete post record by updating content and clearing sensitive info
            await client.query(
              "UPDATE posts SET content = '(이 글은 삭제되었습니다)', author = NULL, password = NULL, image_url = NULL, updated_at = now() WHERE id = $1",
              [post.id]
            );
            // Decrement posts count in board
            await client.query(
              'UPDATE boards SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = $1',
              [post.board_id]
            );
          }

          // Delete the physical file
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }

        const successTimestamp = new Date().toISOString();
        console.log(`[${successTimestamp}] [API LOG] [200 OK] 이미지 검열 완료 - 게시글 소프트 딜리트 및 이미지 소거 (IP: ${ip}, 파일: ${fileName})`);
        return res.status(200).json({ success: true, message: 'Post updated to deleted and image file deleted' });
      }

      if (action === 'clear-image-only') {
        // Set image_url reference to 'censored' in posts
        await query("UPDATE posts SET image_url = 'censored' WHERE image_url = $1", [imageUrl]);

        // Delete the physical file
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }

        const successTimestamp = new Date().toISOString();
        console.log(`[${successTimestamp}] [API LOG] [200 OK] 이미지 검열 완료 - 이미지 참조 censored 마킹 및 이미지 소거 (IP: ${ip}, 파일: ${fileName})`);
        return res.status(200).json({ success: true, message: 'Image reference updated to censored and file deleted' });
      }

      if (action === 'delete-file') {
        // Check if file is linked to any active posts
        const countResult = await query('SELECT COUNT(*)::int as count FROM posts WHERE image_url = $1', [imageUrl]);
        if (countResult.rows[0].count > 0) {
          console.log(`[${timestamp}] [API LOG] [400 Bad Request] 이미지 검열 실패 - 활성 게시글 연결 존재 (IP: ${ip}, 파일: ${fileName})`);
          return res.status(400).json({ error: 'Cannot delete file because it is still linked to active posts.' });
        }

        // Delete the physical file
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }

        const successTimestamp = new Date().toISOString();
        console.log(`[${successTimestamp}] [API LOG] [200 OK] 이미지 검열 완료 - 고립된 이미지 소거 (IP: ${ip}, 파일: ${fileName})`);
        return res.status(200).json({ success: true, message: 'Orphaned file deleted' });
      }

      console.log(`[${timestamp}] [API LOG] [400 Bad Request] 이미지 검열 실패 - 잘못된 액션 (IP: ${ip})`);
      return res.status(400).json({ error: 'Invalid action' });
    }

    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] [API ERROR] Admin Images API Error:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
