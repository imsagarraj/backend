import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { getPipelineStatus, retryPipelineItem, retryAllFailed } from '../lib/api'

export default function Pipeline() {
  const navigate = useNavigate()
  const { signOut } = useAdminAuth()
  const [pipeline, setPipeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(null)
  const [retryingAll, setRetryingAll] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const data = await getPipelineStatus()
      setPipeline(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRetry(itemId) {
    setRetrying(itemId)
    try {
      await retryPipelineItem(itemId)
      await loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setRetrying(null)
    }
  }

  async function handleRetryAll() {
    setRetryingAll(true)
    try {
      await retryAllFailed()
      await loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setRetryingAll(false)
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

  const counts = pipeline?.counts || {}
  const failedItems = pipeline?.recent_failures || []

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.5rem' }}>Pipeline</h1>
        <button style={{ ...navLinkStyle, color: 'var(--danger)' }} onClick={signOut}>
          Sign out
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <button style={navLinkStyle} onClick={() => navigate('/')}>Dashboard</button>
        <button style={navLinkStyle} onClick={() => navigate('/businesses')}>Businesses</button>
        <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.875rem' }}>Pipeline</span>
        <button style={navLinkStyle} onClick={() => navigate('/agents')}>AI Agents</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading pipeline data...</p>
      ) : (
        <>
          {/* Stage counts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 32 }}>
            {Object.entries(counts).map(([stage, count]) => (
              <div key={stage} style={{
                ...cardStyle,
                textAlign: 'center',
                borderColor: stage === 'failed' && count > 0 ? 'var(--danger)' :
                             stage === 'dead' && count > 0 ? 'var(--text-muted)' :
                             'var(--border)',
              }}>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: stage === 'failed' ? 'var(--danger)' :
                         stage === 'sent' ? 'var(--success)' :
                         stage === 'dead' ? 'var(--text-muted)' :
                         'var(--text-primary)',
                }}>
                  {count}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {stage.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>

          {/* Failed items */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1rem' }}>Failed Items</h3>
              {failedItems.length > 0 && (
                <button
                  onClick={handleRetryAll}
                  disabled={retryingAll}
                  style={{
                    background: 'var(--warning)',
                    color: '#000',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    opacity: retryingAll ? 0.7 : 1,
                  }}
                >
                  {retryingAll ? 'Retrying...' : `Retry All (${failedItems.length})`}
                </button>
              )}
            </div>

            {failedItems.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No failed items. Everything is running smoothly.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>ID</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Business ID</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Type</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Error</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Retries</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Last Attempt</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {failedItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px' }}>#{item.id}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <button
                          onClick={() => navigate(`/businesses/${item.business_id}`)}
                          style={{ ...navLinkStyle, color: 'var(--accent)' }}
                        >
                          #{item.business_id}
                        </button>
                      </td>
                      <td style={{ padding: '8px 12px' }}>{item.message_type}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--danger)', fontSize: '0.75rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.error_log || 'Unknown'}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                        {item.retry_count}/{item.max_retries || 3}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        {item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <button
                          onClick={() => handleRetry(item.id)}
                          disabled={retrying === item.id}
                          style={{
                            background: 'var(--accent)',
                            color: '#fff',
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
