import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBusinessDetail, retryPipelineItem } from '../../lib/admin'
import styles from '../../components/AdminLayout/AdminLayout.module.css'

export default function AdminBusinessDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(null)

  useEffect(() => {
    getBusinessDetail(id).then(setData).catch(console.error).finally(() => setLoading(false))
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

  if (loading) return <p className={styles.emptyState}>Loading business details...</p>
  if (!data) return <p className={styles.emptyState} style={{ color: 'var(--color-error)' }}>Business not found</p>

  const { business, customers, pipeline, recent_messages, agent } = data

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <button className={styles.btnGhost} onClick={() => navigate('/admin/businesses')} style={{ marginBottom: 8, fontSize: '0.8125rem' }}>
            ← Back to Businesses
          </button>
          <h1 className={styles.pageTitle}>{business.business_name || 'Unnamed Business'}</h1>
          <p className={styles.pageSubtitle}>
            {business.city}{business.city && business.state ? ', ' : ''}{business.state || ''}
          </p>
        </div>
      </div>

      <div className={styles.tabBar}>
        <button className={styles.tab} onClick={() => navigate('/admin/dashboard')}>Dashboard</button>
        <button className={styles.tab} onClick={() => navigate('/admin/businesses')}>Businesses</button>
        <button className={styles.tab} onClick={() => navigate('/admin/pipeline')}>Pipeline</button>
        <button className={styles.tab} onClick={() => navigate('/admin/agents')}>AI Agents</button>
      </div>

      <div className={styles.card} style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Business Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: '0.875rem' }}>
          <div><span style={{ color: 'var(--color-text-muted)' }}>Type:</span> {business.business_type || '—'}</div>
          <div><span style={{ color: 'var(--color-text-muted)' }}>Email:</span> {business.email || '—'}</div>
          <div><span style={{ color: 'var(--color-text-muted)' }}>Phone:</span> {business.phone || '—'}</div>
          <div><span style={{ color: 'var(--color-text-muted)' }}>City:</span> {business.city || '—'}</div>
          <div><span style={{ color: 'var(--color-text-muted)' }}>State:</span> {business.state || '—'}</div>
          <div><span style={{ color: 'var(--color-text-muted)' }}>Owner:</span> {business.owner_name || '—'}</div>
          <div><span style={{ color: 'var(--color-text-muted)' }}>AI Agent:</span> {agent?.agent_name || 'None'}</div>
          <div><span style={{ color: 'var(--color-text-muted)' }}>Customers:</span> {customers.length}</div>
          <div><span style={{ color: 'var(--color-text-muted)' }}>Messages:</span> {recent_messages.length}</div>
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Pipeline Queue</h3>
        {pipeline.length === 0 ? (
          <p className={styles.emptyState}>No items in queue</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Stage</th>
                <th>Day</th>
                <th>Error</th>
                <th>Retries</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map(item => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td>{item.message_type}</td>
                  <td>
                    <span className={
                      item.stage === 'failed' ? styles.badgeDanger :
                      item.stage === 'sent' ? styles.badgeSuccess :
                      styles.badgeDefault
                    }>{item.stage}</span>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{item.sequence_day != null ? `Day ${item.sequence_day}` : '—'}</td>
                  <td style={{ color: 'var(--color-error)', fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.error_log || '—'}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{item.retry_count}/{item.max_retries || 3}</td>
                  <td>
                    {item.stage === 'failed' && (
                      <button
                        className={`${styles.btn} ${styles.btnWarning}`}
                        onClick={() => handleRetry(item.id)}
                        disabled={retrying === item.id}
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
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

      <div className={styles.card}>
        <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Recent Messages (last 50)</h3>
        {recent_messages.length === 0 ? (
          <p className={styles.emptyState}>No messages</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
            {recent_messages.map(msg => (
              <div key={msg.id} className={`${styles.messageItem} ${msg.direction === 'received' ? styles.messageItemIncoming : ''}`}>
                <div className={styles.messageMeta}>
                  <span className={styles.messageType} style={{
                    background: msg.direction === 'sent' ? 'var(--color-accent-dim)' : 'var(--color-success-dim)',
                    color: msg.direction === 'sent' ? 'var(--color-accent)' : 'var(--color-success)',
                  }}>
                    {msg.direction}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
                  </span>
                </div>
                <div style={{ color: 'var(--color-text-secondary)' }}>
                  {msg.content?.slice(0, 120)}{msg.content?.length > 120 ? '...' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
