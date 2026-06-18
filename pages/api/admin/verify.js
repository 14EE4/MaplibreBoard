// pages/api/admin/verify.js

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is not defined');
}

export default async function handler(req, res) {
  // TODO(security): Implement rate limiting to prevent brute force password guessing attacks.

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [API LOG] [POST] /api/admin/verify - 어드민 인증 시도 (IP: ${ip}, UA: ${userAgent})`);
    const { password } = req.body || {};

    if (password === ADMIN_PASSWORD) {
      const successTimestamp = new Date().toISOString();
      console.log(`[${successTimestamp}] [API LOG] [200 OK] 어드민 인증 성공 (IP: ${ip})`);
      return res.status(200).json({ success: true });
    } else {
      const failTimestamp = new Date().toISOString();
      console.log(`[${failTimestamp}] [API LOG] [401 Unauthorized] 어드민 인증 실패 - 비밀번호 불일치 (IP: ${ip})`);
      // Fail close: return unauthorized
      return res.status(401).json({ error: 'Incorrect password' });
    }
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] [API ERROR] 어드민 인증 에러:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
