import fs from 'fs';
import path from 'path';
const { query, pool } = require('../../../lib/db');

const ADMIN_PASSWORD = '1q2w3e4r!';

export default async function handler(req, res) {
  const { method } = req;

  // 1. Authenticate Request
  const auth = req.headers['authorization'] || req.query.auth || (req.body && req.body.auth);
  if (auth !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');

  try {
    if (method === 'GET') {
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

      return res.status(200).json(matchedImages);
    }

    if (method === 'DELETE') {
      const { fileName, action } = req.body || {};
      if (!fileName || !action) {
        return res.status(400).json({ error: 'fileName and action are required' });
      }

      // Path Traversal Mitigation: extract only the base name of the file
      const safeFileName = path.basename(fileName);
      const filePath = path.join(uploadDir, safeFileName);

      // Boundary check to prevent directory escape
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadsDir = path.resolve(uploadDir);
      if (!resolvedPath.startsWith(resolvedUploadsDir + path.sep)) {
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
            // Delete post record
            await client.query('DELETE FROM posts WHERE id = $1', [post.id]);
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

        return res.status(200).json({ success: true, message: 'Post and image file deleted' });
      }

      if (action === 'clear-image-only') {
        // Clear image_url reference in posts
        await query('UPDATE posts SET image_url = NULL WHERE image_url = $1', [imageUrl]);

        // Delete the physical file
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }

        return res.status(200).json({ success: true, message: 'Image reference cleared and file deleted' });
      }

      if (action === 'delete-file') {
        // Check if file is linked to any active posts
        const countResult = await query('SELECT COUNT(*)::int as count FROM posts WHERE image_url = $1', [imageUrl]);
        if (countResult.rows[0].count > 0) {
          return res.status(400).json({ error: 'Cannot delete file because it is still linked to active posts.' });
        }

        // Delete the physical file
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }

        return res.status(200).json({ success: true, message: 'Orphaned file deleted' });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error('Admin Images API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
