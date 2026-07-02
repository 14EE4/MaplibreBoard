import Head from 'next/head'
import { useEffect } from 'react'
import '../styles/globals.css'
import '../styles/board.css'
import '../styles/all.css'
import '../styles/admin.css'
import '../styles/index.css'

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.__fetchIntercepted) {
      window.__fetchIntercepted = true;
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch(...args);
        if (response.status === 403) {
          try {
            const clone = response.clone();
            const data = await clone.json();
            if (data && data.banned && !window.location.pathname.startsWith('/admin')) {
              alert(`차단된 IP입니다.\n사유: ${data.reason || '사유가 입력되지 않았습니다.'}`);
            }
          } catch (e) {
            // ignore if not json
          }
        }
        return response;
      };
    }
  }, []);

  return (
    <>
      <Head>
        <link rel="icon" href="/icon.png" />
        <link rel="shortcut icon" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
