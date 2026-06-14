import Link from 'next/link'
import { useEffect, useState } from 'react'

const ADMIN_PASSWORD = '1q2w3e4r!'

export default function Admin() {
  const [boards, setBoards] = useState([])
  const [authorized, setAuthorized] = useState(false)
  const [inputPw, setInputPw] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Check session flag
    try {
      const ok = sessionStorage.getItem('admin-authed')
      if (ok === '1') setAuthorized(true)
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!authorized) return
    fetch('/api/boards')
      .then((r) => r.json())
      .then(setBoards)
      .catch(() => setBoards([]))
  }, [authorized])

  function submitPw(e) {
    e.preventDefault()
    if (inputPw === ADMIN_PASSWORD) {
      try { sessionStorage.setItem('admin-authed', '1') } catch (e) { }
      setAuthorized(true)
      setError('')
    } else {
      setError('비밀번호가 틀렸습니다.')
    }
    setInputPw('')
  }

  if (!authorized) {
    return (
      <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <h1>관리자 페이지 접근</h1>
        <p>관리자 비밀번호를 입력해야 합니다.</p>
        <form onSubmit={submitPw} style={{ marginTop: 12 }}>
          <input
            type="password"
            placeholder="비밀번호"
            value={inputPw}
            onChange={(e) => setInputPw(e.target.value)}
            style={{ padding: 8, fontSize: 16 }}
          />
          <button style={{ marginLeft: 8, padding: '8px 12px' }}>입력</button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </main>
    )
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Maplibre Board (Admin)</h1>
      <p>This is the admin UI for MaplibreBoard.</p>

      <section>
        <p>
          <Link href="/">퍼블릭 인덱스 페이지 보기</Link>
        </p>
        <h2>Boards</h2>

        <ul>
          {boards.map((b) => (
            <li key={b.id}>
              <Link href={`/board?id=${b.id}`}>{b.name}</Link>
            </li>
          ))}
        </ul>
        <p>
          <Link href="/board">Create / open board</Link>
        </p>

      </section>
    </main>
  )
}
