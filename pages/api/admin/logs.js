const fs = require('fs');
const path = require('path');
const os = require('os');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is not defined');
}

function readLastNLines(filePath, maxLines = 200) {
  if (!fs.existsSync(filePath)) {
    return `[System Notice] Log file does not exist at ${filePath}`;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    // Slice last N lines and join
    return lines.slice(-maxLines).join('\n');
  } catch (err) {
    return `[System Error] Failed to read log file: ${err.message}`;
  }
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

  console.log(`[${timestamp}] [API LOG] [GET] /api/admin/logs - 어드민 PM2 로그 조회 시도 (IP: ${ip}, UA: ${userAgent})`);

  // 1. Authenticate Request
  const auth = req.headers['authorization'] || req.query.auth || (req.body && req.body.auth);
  if (auth !== ADMIN_PASSWORD) {
    const failTimestamp = new Date().toISOString();
    console.log(`[${failTimestamp}] [API LOG] [401 Unauthorized] 어드민 PM2 로그 조회 실패 - 인증 실패 (IP: ${ip})`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let home = os.homedir();
    if (process.env.PM2_USER) {
      if (process.platform === 'win32') {
        home = path.join('C:\\Users', process.env.PM2_USER);
      } else {
        home = process.env.PM2_USER === 'root'
          ? '/root'
          : (process.platform === 'darwin' ? path.join('/Users', process.env.PM2_USER) : path.join('/home', process.env.PM2_USER));
      }
    }
    const outLogPath = path.join(home, '.pm2/logs/map-board-out.log');
    const errLogPath = path.join(home, '.pm2/logs/map-board-error.log');

    const outLogs = readLastNLines(outLogPath, 200);
    const errLogs = readLastNLines(errLogPath, 200);

    const successTimestamp = new Date().toISOString();
    console.log(`[${successTimestamp}] [API LOG] [200 OK] 어드민 PM2 로그 조회 성공 (IP: ${ip})`);

    return res.status(200).json({
      success: true,
      out: outLogs,
      err: errLogs
    });
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] [API ERROR] 어드민 PM2 로그 조회 에러:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
