import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { listBusinesses, getPipelineStatus, retryAllFailed } from '../lib/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const { signOut } = useAdminAuth()
  const [businesses, setBusinesses] = useState([])
  const [pipeline, setPipeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [bizData, pipeData] = await Promise.all([
        listBusinesses(),
        getPipelineStatus(),
      ])
      setBusinesses(bizData)
      setPipeline(pipeData)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRetryAll() {
    setRetrying(true)
    try {
      await retryAllFailed()
      await loadData()
    } catch (err) {
      console.error('Retry failed:', err)
    } finally {
      setRetrying(false)
    }
  }

  const totalCustomers = businesses.reduce((s, b) => s + (b.customer_count || 0), 0)
  const totalMessages = businesses.reduce((s, b) => s + (b.message_count || 0), 0)
  const failedCount = pipeline?.counts?.failed || 0
  const pendingCount = (pipeline?.counts?.pending_schedule || 0) + (pipeline?.counts?.pending_ai_gen || 0) + (pipeline?.counts?.ready_to_send || 0)

  const navStyle = {
    display: 'flex',
    gap: 24,
    alignItems: 'center',
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
        <p style={{ color: 'var(--text-secondary)' }}>Loading admin dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      {/* Top nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.5rem' }}>VICloud Admin</h1>
        <div style={{ ...navStyle, gap: 24 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>admin</span>
          <button style={{ ...navLinkStyle, color: 'var(--danger)' }} onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.875rem' }}>Dashboard</span>
        <button style={navLinkStyle} onClick={() => navigate('/businesses')}>Businesses</button>
        <button style={navLinkStyle} onClick={() => navigate('/pipeline')}>Pipeline</button>
        <button style={navLinkStyle} onClick={() => navigate('/agents')}>AI Agents</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Total Businesses</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{businesses.length}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Total Customers</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{totalCustomers}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Messages Sent</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{totalMessages}</div>
        </div>
        <div style={{ ...cardStyle, borderColor: failedCount > 0 ? 'var(--danger)' : 'var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Pipeline Failed</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: failedCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {failedCount}
          </div>
        </div>
      </div>

      {/* Pipeline health */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 32 }}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Pipeline Health</h3>
          {pipeline ? (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {Object.entries(pipeline.counts).map(([stage, count]) => (
                <div key={stage} style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{
                    fontSize: '1.5rem',
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
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No pipeline data</p>
          )}

          {failedCount > 0 && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={handleRetryAll}
                disabled={retrying}
                style={{
                  background: 'var(--warning)',
                  color: '#000',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  opacity: retrying ? 0.7 : 1,
                }}
              >
                {retrying ? 'Retrying...' : `Retry All Failed (${failedCount})`}
              </button>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Recent Failures</h3>
          {pipeline?.recent_failures?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pipeline.recent_failures.slice(0, 5).map((f, i) => (
                <div key={i} style={{
                  fontSize: '0.75rem',
                  color: 'var(--danger)',
                  padding: '8px 10px',
                  background: 'rgba(239,68,68,0.08)',
                  borderRadius: 6,
                }}>
                  <div style={{ fontWeight: 600 }}>{f.message_type} · item #{f.id}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{f.error_log || 'Unknown error'}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No recent failures</p>
          )}
        </div>
      </div>

      {/* Businesses quick table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem' }}>All Businesses</h3>
          <button
            onClick={() => navigate('/businesses')}
            style={{ ...navLinkStyle, color: 'var(--accent)' }}
          >
            View all →
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Business</th>
              <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Customers</th>
              <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Messages</th>
              <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Agent</th>
              <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {businesses.slice(0, 10).map(biz => (
              <tr
                key={biz.id}
                onClick={() => navigate(`/businesses/${biz.id}`)}
                style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
              >
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{biz.business_name || 'Unnamed'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{biz.customer_count}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{biz.message_count}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{biz.agent_name || '—'}</td>
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
    </div>
  )
}
