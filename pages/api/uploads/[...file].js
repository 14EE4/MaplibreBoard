import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Only allow GET method
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { file } = req.query; // file will be an array of path segments
  if (!file || file.length === 0) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const fileName = file.join('/');
    
    // Path Traversal Mitigation: normalize and sanitize file path
    const safeFileName = path.normalize(fileName).replace(/^(\.\.(\/|\\|$))+/, '');
    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, safeFileName);

    // Resolve absolute paths for boundary check
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadDir);

    // Enforce trailing slash on base directory check to prevent partial matching bypasses
    if (!resolvedPath.startsWith(resolvedUploadsDir + path.sep)) {
      return res.status(400).json({ error: 'Invalid file path boundary' });
    }

    // Check if path exists and is a file
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Determine Content-Type based on extension
    const ext = path.extname(resolvedPath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.webp') {
      contentType = 'image/webp';
    } else if (ext === '.svg') {
      contentType = 'image/svg+xml';
    }

    // Apply security headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Serve file content as a stream
    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  } catch (error) {
    console.error('Error serving file:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
