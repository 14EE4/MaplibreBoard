import { status } from 'minecraft-server-util';

export default async function handler(req, res) {
  try {
    // Java 서버 상태 확인
    const result = await status('pyeong.p-e.kr', 25565, {
      timeout: 5000,
      enableSRV: true,
    });

    return res.status(200).json({
      online: true,
      players: {
        online: result.players.online,
        max: result.players.max,
      },
      version: result.version.name,
      motd: result.motd.clean,
    });
  } catch (error) {
    return res.status(200).json({
      online: false,
      players: {
        online: 0,
        max: 0,
      },
      error: error.message,
    });
  }
}
