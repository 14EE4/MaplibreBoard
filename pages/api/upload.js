import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress
  const userAgent = req.headers['user-agent'] || 'Unknown'
  const timestamp = new Date().toISOString()

  const { image } = req.body; // Base64 data URI (e.g. data:image/png;base64,...)

  if (!image) {
    console.log(`[${timestamp}] [API LOG] [400 Bad Request] 이미지 업로드 실패 - 이미지 데이터 없음 (IP: ${ip})`)
    return res.status(400).json({ error: 'No image data provided' });
  }

  try {
    console.log(`[${timestamp}] [API LOG] [POST] /api/upload - 이미지 업로드 요청 들어옴 (IP: ${ip}, UA: ${userAgent})`)

    // Match base64 pattern and extract extension & data
    const matches = image.match(/^data:image\/([A-Za-z0-9-+.]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.log(`[${timestamp}] [API LOG] [400 Bad Request] 이미지 업로드 실패 - 잘못된 데이터 URI 포맷 (IP: ${ip})`)
      return res.status(400).json({ error: 'Invalid image format. Must be a base64 image data URI.' });
    }

    const fileExtension = matches[1].toLowerCase();
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    if (!allowedExtensions.includes(fileExtension)) {
      console.log(`[${timestamp}] [API LOG] [400 Bad Request] 이미지 업로드 실패 - 허용되지 않는 확장자 (${fileExtension}) (IP: ${ip})`)
      return res.status(400).json({ error: '허용되지 않는 이미지 파일 형식입니다. (png, jpg, jpeg, webp, gif만 가능)' });
    }
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Target upload directory
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      await fs.promises.mkdir(uploadDir, { recursive: true });
    }

    // Generate unique file name
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Save buffer as file
    await fs.promises.writeFile(filePath, buffer);

    // Return relative URL
    const imageUrl = `/uploads/${fileName}`;

    const successTimestamp = new Date().toISOString()
    console.log(`[${successTimestamp}] [API LOG] [200 OK] 이미지 업로드 성공 (IP: ${ip}, 파일명: ${fileName})`)
    return res.status(200).json({ url: imageUrl });
  } catch (error) {
    const errorTimestamp = new Date().toISOString()
    console.error(`[${errorTimestamp}] [API ERROR] Upload API Error:`, error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
}
