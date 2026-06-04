import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signIn(email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error.message)
    } else {
      navigate('/')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        padding: 40,
        borderRadius: 12,
        width: 380,
        border: '1px solid var(--border)',
      }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>VICloud Admin</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>
          Sign in with your admin account
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            color: 'var(--danger)',
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: '0.875rem',
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
              required
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: '0.875rem',
              fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
