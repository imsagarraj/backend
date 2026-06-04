import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { listBusinesses } from '../lib/api'

export default function Businesses() {
  const navigate = useNavigate()
  const { signOut } = useAdminAuth()
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    listBusinesses()
      .then(setBusinesses)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = businesses.filter(b =>
    !search || b.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.city?.toLowerCase().includes(search.toLowerCase())
  )

  const navLinkStyle = {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    padding: '4px 0',
    cursor: 'pointer',
  }

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 24,
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.5rem' }}>Businesses</h1>
        <button style={{ ...navLinkStyle, color: 'var(--danger)' }} onClick={signOut}>
          Sign out
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <button style={navLinkStyle} onClick={() => navigate('/')}>Dashboard</button>
        <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.875rem' }}>Businesses</span>
        <button style={navLinkStyle} onClick={() => navigate('/pipeline')}>Pipeline</button>
        <button style={navLinkStyle} onClick={() => navigate('/agents')}>AI Agents</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Search by name or city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: 320,
            padding: '10px 14px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      ) : (
        <div style={cardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>Business Name</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>Type</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>City</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>Customers</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>Messages</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>Agent</th>
                <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No businesses found
                  </td>
                </tr>
              ) : filtered.map(biz => (
                <tr
                  key={biz.id}
                  onClick={() => navigate(`/businesses/${biz.id}`)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                    {biz.business_name || 'Unnamed'}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                    {biz.business_type || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                    {biz.city || '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{biz.customer_count}</td>
                  <td style={{ padding: '10px 12px' }}>{biz.message_count}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                    {biz.agent_name || '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      color: (biz.pipeline?.failed || 0) > 0 ? 'var(--danger)' : 'var(--success)',
                      fontSize: '0.75rem',
                    }}>
                      {(biz.pipeline?.failed || 0) > 0 ? `${biz.pipeline.failed} failed` : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
