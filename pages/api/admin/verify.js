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

  const { password } = req.body || {};

  if (password === ADMIN_PASSWORD) {
    return res.status(200).json({ success: true });
  } else {
    // Fail close: return unauthorized
    return res.status(401).json({ error: 'Incorrect password' });
  }
}
