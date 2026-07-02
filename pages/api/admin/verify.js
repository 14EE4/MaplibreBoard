// pages/api/admin/verify.js

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is not defined');
}

// Global in-memory storage for login attempts
// Key: IP, Value: { attempts: number, lockUntil: number }
const loginAttempts = new Map()

const MAX_ATTEMPTS = 5
const LOCK_TIME = 30 * 60 * 1000 // 30 minutes in milliseconds

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const timestamp = new Date().toISOString();

  // Rate Limiting Check
  const record = loginAttempts.get(ip)
  const now = Date.now()

  if (record && record.lockUntil > now) {
    const remainingMin = Math.ceil((record.lockUntil - now) / 60000)
    console.log(`[${timestamp}] [API LOG] [429 Too Many Requests] 어드민 인증 거부 - 잠금 상태 (IP: ${ip}, 남은 시간: ${remainingMin}분)`)
    return res.status(429).json({
      error: `너무 많은 로그인 시도가 발생했습니다. 잠시 후 다시 시도해 주세요. (${remainingMin}분 남음)`
    })
  }

  try {
    console.log(`[${timestamp}] [API LOG] [POST] /api/admin/verify - 어드민 인증 시도 (IP: ${ip}, UA: ${userAgent})`);
    const { password } = req.body || {};

    if (password === ADMIN_PASSWORD) {
      // Clear login attempts on success
      loginAttempts.delete(ip)
      const successTimestamp = new Date().toISOString();
      console.log(`[${successTimestamp}] [API LOG] [200 OK] 어드민 인증 성공 (IP: ${ip})`);
      return res.status(200).json({ success: true });
    } else {
      const currentAttempts = record ? record.attempts + 1 : 1
      if (currentAttempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCK_TIME
        loginAttempts.set(ip, { attempts: currentAttempts, lockUntil })
        const lockTimestamp = new Date().toISOString()
        console.log(`[${lockTimestamp}] [API LOG] [403 Forbidden] 어드민 로그인 한도 초과 - IP 임시 잠금 (IP: ${ip}, 잠금 기간: 30분)`)
        return res.status(403).json({
          error: '비밀번호 입력 한도를 초과했습니다. 이 IP로부터의 로그인 요청이 30분간 차단됩니다.'
        })
      } else {
        loginAttempts.set(ip, { attempts: currentAttempts, lockUntil: 0 })
        const failTimestamp = new Date().toISOString();
        console.log(`[${failTimestamp}] [API LOG] [401 Unauthorized] 어드민 인증 실패 - 비밀번호 불일치 (IP: ${ip}, 시도 횟수: ${currentAttempts}/${MAX_ATTEMPTS})`);
        return res.status(401).json({
          error: `비밀번호가 일치하지 않습니다. (${MAX_ATTEMPTS - currentAttempts}회 남음)`
        });
      }
    }
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] [API ERROR] 어드민 인증 에러:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
