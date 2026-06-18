function ipToLong(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  return ((Number(parts[0]) << 24) >>> 0) +
         ((Number(parts[1]) << 16) >>> 0) +
         ((Number(parts[2]) << 8) >>> 0) +
         (Number(parts[3]) >>> 0);
}

function normalizeIP(ip) {
  if (!ip) return '';
  let trimmed = ip.trim();
  if (trimmed.startsWith('::ffff:')) {
    trimmed = trimmed.substring(7);
  }
  return trimmed;
}

const ranges = {
  SKT: [
    ['27.160.0.0', '27.183.255.255'],
    ['42.35.0.0', '42.36.255.255'],
    ['203.226.192.0', '203.226.252.255'],
    ['211.234.0.0', '211.234.255.255'],
    ['211.235.0.0', '211.235.255.255'],
    ['223.32.0.0', '223.63.255.255']
  ],
  KT: [
    ['39.7.0.0', '39.7.255.255'],
    ['110.70.0.0', '110.70.255.255'],
    ['118.235.0.0', '118.235.255.255'],
    ['175.223.0.0', '175.223.255.255'],
    ['211.246.0.0', '211.246.255.255']
  ],
  LGU: [
    ['106.101.0.0', '106.101.255.255'],
    ['106.102.0.0', '106.102.255.255'],
    ['117.111.0.0', '117.111.255.255'],
    ['125.188.0.0', '125.188.255.255'],
    ['211.36.128.0', '211.36.159.255'],
    ['211.36.224.0', '211.36.255.255']
  ],
  Private: [
    ['10.0.0.0', '10.255.255.255'],
    ['172.16.0.0', '172.31.255.255'],
    ['192.168.0.0', '192.168.255.255']
  ]
};

const rangesLong = {
  SKT: ranges.SKT.map(([start, end]) => [ipToLong(start), ipToLong(end)]),
  KT: ranges.KT.map(([start, end]) => [ipToLong(start), ipToLong(end)]),
  LGU: ranges.LGU.map(([start, end]) => [ipToLong(start), ipToLong(end)]),
  Private: ranges.Private.map(([start, end]) => [ipToLong(start), ipToLong(end)])
};

function classifyIP(rawIp) {
  const ip = normalizeIP(rawIp);
  if (!ip) return '일반 공인 IP';
  if (ip === '::1' || ip === '127.0.0.1') return '사설 IP';

  const ipv4Pattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (!ipv4Pattern.test(ip)) {
    return '일반 공인 IP';
  }

  const ipLong = ipToLong(ip);

  for (const [start, end] of rangesLong.Private) {
    if (ipLong >= start && ipLong <= end) return '사설 IP';
  }
  for (const [start, end] of rangesLong.SKT) {
    if (ipLong >= start && ipLong <= end) return 'SKT 모바일';
  }
  for (const [start, end] of rangesLong.KT) {
    if (ipLong >= start && ipLong <= end) return 'KT 모바일';
  }
  for (const [start, end] of rangesLong.LGU) {
    if (ipLong >= start && ipLong <= end) return 'LGU+ 모바일';
  }

  return '일반 공인 IP';
}

module.exports = {
  ipToLong,
  normalizeIP,
  classifyIP
};
