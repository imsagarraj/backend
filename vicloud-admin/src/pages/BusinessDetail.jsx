import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { getBusinessDetail, retryPipelineItem } from '../lib/api'

export default function BusinessDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { signOut } = useAdminAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(null)

  useEffect(() => {
    getBusinessDetail(id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  async function handleRetry(itemId) {
    setRetrying(itemId)
    try {
      await retryPipelineItem(itemId)
      const fresh = await getBusinessDetail(id)
      setData(fresh)
    } catch (err) {
      console.error(err)
    } finally {
      setRetrying(null)
    }
  }

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

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading business details...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>Business not found</p>
      </div>
    )
  }

  const { business, customers, pipeline, recent_messages, agent } = data

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <button onClick={() => navigate('/businesses')} style={{ ...navLinkStyle, color: 'var(--text-muted)', marginBottom: 8 }}>
            ← Back to Businesses
          </button>
          <h1 style={{ fontSize: '1.5rem' }}>{business.business_name || 'Unnamed Business'}</h1>
        </div>
        <button style={{ ...navLinkStyle, color: 'var(--danger)' }} onClick={signOut}>
          Sign out
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <button style={navLinkStyle} onClick={() => navigate('/')}>Dashboard</button>
        <button style={navLinkStyle} onClick={() => navigate('/businesses')}>Businesses</button>
        <button style={navLinkStyle} onClick={() => navigate('/pipeline')}>Pipeline</button>
        <button style={navLinkStyle} onClick={() => navigate('/agents')}>AI Agents</button>
      </div>

      {/* Business Info */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Business Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: '0.875rem' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> {business.business_type || '—'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> {business.email || '—'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> {business.phone || '—'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>City:</span> {business.city || '—'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>State:</span> {business.state || '—'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Owner:</span> {business.owner_name || '—'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>AI Agent:</span> {agent?.agent_name || 'None'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Customers:</span> {customers.length}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Messages:</span> {recent_messages.length}</div>
        </div>
      </div>

      {/* Pipeline Queue */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Pipeline Queue</h3>
        {pipeline.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No items in queue</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>ID</th>
                <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Type</th>
                <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Stage</th>
                <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Day</th>
                <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Error</th>
                <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Retries</th>
                <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px' }}>#{item.id}</td>
                  <td style={{ padding: '8px 12px' }}>{item.message_type}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      color: item.stage === 'failed' ? 'var(--danger)' :
                             item.stage === 'sent' ? 'var(--success)' :
                             'var(--text-primary)',
                      fontWeight: item.stage === 'failed' ? 600 : 400,
                    }}>
                      {item.stage}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    {item.sequence_day != null ? `Day ${item.sequence_day}` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--danger)', fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.error_log || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    {item.retry_count}/{item.max_retries || 3}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {item.stage === 'failed' && (
                      <button
                        onClick={() => handleRetry(item.id)}
                        disabled={retrying === item.id}
                        style={{
                          background: 'var(--warning)',
                          color: '#000',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          opacity: retrying === item.id ? 0.7 : 1,
                        }}
                      >
                        {retrying === item.id ? '...' : 'Retry'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Messages */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Recent Messages (last 50)</h3>
        {recent_messages.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No messages</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
            {recent_messages.map(msg => (
              <div key={msg.id} style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                borderRadius: 8,
                fontSize: '0.8rem',
                borderLeft: `3px solid ${msg.direction === 'sent' ? 'var(--accent)' : 'var(--success)'}`,
              }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.7rem',
                    background: msg.direction === 'sent' ? 'rgba(99,102,241,0.15)' : 'rgba(34,197,94,0.15)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}>
                    {msg.direction}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{msg.content?.slice(0, 120)}{msg.content?.length > 120 ? '...' : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
