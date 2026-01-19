import Head from 'next/head'
import { useEffect, useState } from 'react'

const STATUS = {
  LOADING: 'loading',
  ONLINE: 'online',
  OFFLINE: 'offline',
  ERROR: 'error',
}

export default function IndexPage() {
  const [serverStatus, setServerStatus] = useState({
    state: STATUS.LOADING,
    online: 0,
    max: 0,
  })

  useEffect(() => {
    let active = true

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/server-status')
        if (!response.ok) {
          throw new Error('Failed to load server status')
        }

        const data = await response.json()
        if (!active) return

        if (data.online) {
          setServerStatus({
            state: STATUS.ONLINE,
            online: data.players.online,
            max: data.players.max,
          })
        } else {
          setServerStatus({
            state: STATUS.OFFLINE,
            online: 0,
            max: 0,
          })
        }
      } catch (error) {
        if (!active) return
        setServerStatus({
          state: STATUS.ERROR,
          online: 0,
          max: 0,
        })
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)

    // stop polling when unmounted
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const renderStatusLabel = () => {
    switch (serverStatus.state) {
      case STATUS.ONLINE:
        return `🟢 온라인 (${serverStatus.online}/${serverStatus.max} 명)`
      case STATUS.OFFLINE:
        return '🔴 오프라인'
      case STATUS.ERROR:
        return '⚠️ 상태 확인 실패'
      default:
        return '🔄 서버 상태 확인 중...'
    }
  }

  const statusStyle = () => {
    switch (serverStatus.state) {
      case STATUS.ONLINE:
        return { color: '#22c55e', fontWeight: 'bold' }
      case STATUS.OFFLINE:
        return { color: '#ef4444', fontWeight: 'bold' }
      case STATUS.ERROR:
        return { color: '#f59e0b', fontWeight: 'bold' }
      default:
        return { color: '#111' }
    }
  }

  return (
    <>
      <Head>
        <title>MaplibreBoard - Landing</title>
        <link rel="icon" href="/icon.png" />
        <link rel="shortcut icon" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />
        <meta name="theme-color" content="#ffffff" />
      </Head>

      <main className="container">
        <h1>MaplibreBoard</h1>

        <div className="button-group">
          <button onClick={() => window.location.href = '/map'} className="button primary">
            Raster Map 보기
          </button>
          <button onClick={() => window.location.href = '/admin'} className="button primary">
            관리자 페이지로 이동 (Admin)
          </button>
        </div>

        <hr />

        <section>
          <h2>자바 베드락 겸용 마인크래프트 서버</h2>
          <div className="status">
            <span style={statusStyle()}>{renderStatusLabel()}</span>
          </div>
          <ul className="servers">
            <li>Java: pyeong.p-e.kr:25565</li>
            <li>Bedrock: pyeong.p-e.kr:19132</li>
            <li>
              <a className="button" href="http://bluemap.pyeong.p-e.kr">
                맵 보기
              </a>
            </li>
          </ul>
        </section>
      </main>

      <style jsx>{`
        .container {
          font-family: Arial, Helvetica, sans-serif;
          padding: 24px;
          max-width: 720px;
          margin: 0 auto;
        }
        .button-group {
          display: flex;
          gap: 12px;
          margin: 24px 0;
          flex-wrap: wrap;
        }
        .button {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
        }
        .button.primary {
          background: #0070f3;
          color: #fff;
        }
        .button.primary:hover {
          background: #0051cc;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 112, 243, 0.3);
        }
        .button:active {
          transform: translateY(0);
        }
        .servers {
          list-style: none;
          padding: 0;
          margin: 0 0 12px 0;
        }
        .servers li {
          margin-top: 8px;
        }
        .status {
          margin-bottom: 12px;
        }
      `}</style>
    </>
  )
}
