import Head from 'next/head'

export default function IndexPage() {

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

      `}</style>
    </>
  )
}
