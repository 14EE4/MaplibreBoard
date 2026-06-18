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

  const { image } = req.body; // Base64 data URI (e.g. data:image/png;base64,...)

  if (!image) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  try {
    // Match base64 pattern and extract extension & data
    const matches = image.match(/^data:image\/([A-Za-z0-9-+.]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid image format. Must be a base64 image data URI.' });
    }

    const fileExtension = matches[1].toLowerCase();
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    if (!allowedExtensions.includes(fileExtension)) {
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
    return res.status(200).json({ url: imageUrl });
  } catch (error) {
    console.error('[API ERROR] Upload API Error:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
}
