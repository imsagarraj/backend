import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPipelineStatus, retryPipelineItem, retryAllFailed, cancelPipelineItem, deletePipelineItem } from '../../lib/admin'
import styles from '../../components/AdminLayout/AdminLayout.module.css'

const STAGE_COLORS = {
  pending_schedule: 'var(--color-text-muted)',
  pending_ai_gen: '#f59e0b',
  ready_to_send: '#3b82f6',
  sending: '#8b5cf6',
  sent: '#10b981',
  failed: '#ef4444',
  dead: 'var(--color-text-muted)',
  cancelled: '#6b7280',
}

const CANCELLABLE_STAGES = ['pending_schedule', 'pending_ai_gen', 'ready_to_send', 'sending']

export default function AdminPipeline() {
  const navigate = useNavigate()
  const [pipeline, setPipeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(null)
  const [retryingAll, setRetryingAll] = useState(false)
  const [filterStage, setFilterStage] = useState('all')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => { loadData() }, [])

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

  async function handleCancel(itemId) {
    if (!confirm('Cancel this message? It will be marked as cancelled and won\'t be sent.')) return
    setActionLoading(`cancel-${itemId}`)
    try {
      await cancelPipelineItem(itemId)
      await loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(itemId) {
    if (!confirm('Delete this message permanently?')) return
    setActionLoading(`delete-${itemId}`)
    try {
      await deletePipelineItem(itemId)
      await loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  const counts = pipeline?.counts || {}
  const allItems = pipeline?.items || []
  const filteredItems = filterStage === 'all'
    ? allItems
    : allItems.filter(i => i.stage === filterStage)

  const stages = [
    'pending_schedule', 'pending_ai_gen', 'ready_to_send',
    'sending', 'sent', 'failed', 'dead', 'cancelled',
  ]

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pipeline</h1>
          <p className={styles.pageSubtitle}>Message queue state machine — all scheduled & processed messages</p>
        </div>
      </div>

      <div className={styles.tabBar}>
        <button className={styles.tab} onClick={() => navigate('/admin/dashboard')}>Dashboard</button>
        <button className={styles.tab} onClick={() => navigate('/admin/businesses')}>Businesses</button>
        <span className={`${styles.tab} ${styles.tabActive}`}>Pipeline</span>
        <button className={styles.tab} onClick={() => navigate('/admin/agents')}>AI Agents</button>
      </div>

      {loading ? (
        <p className={styles.emptyState}>Loading pipeline data...</p>
      ) : (
        <>
          <div className={styles.pipelineGrid}>
            {stages.map(stage => (
              <div
                key={stage}
                className={styles.pipelineCard}
                onClick={() => setFilterStage(stage === filterStage ? 'all' : stage)}
                style={{
                  cursor: 'pointer',
                  borderColor: filterStage === stage ? STAGE_COLORS[stage] || 'var(--color-border)' : '',
                  borderWidth: filterStage === stage ? 2 : 1,
                }}
              >
                <div className={styles.pipelineValue} style={{
                  color: STAGE_COLORS[stage] || 'var(--color-text)',
                }}>{counts[stage] || 0}</div>
                <div className={styles.pipelineLabel}>{stage.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>

          {counts.failed > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button className={`${styles.btn} ${styles.btnWarning}`} onClick={handleRetryAll} disabled={retryingAll}>
                {retryingAll ? 'Retrying...' : `Retry All Failed (${counts.failed})`}
              </button>
            </div>
          )}

          <div className={styles.card}>
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: '1rem' }}>
                Queue Items
                {filterStage !== 'all' && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>filtered: {filterStage.replace(/_/g, ' ')}</span>}
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>({filteredItems.length})</span>
              </h3>
            </div>
            {filteredItems.length === 0 ? (
              <p className={styles.emptyState}>No items in this stage.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Business</th>
                      <th>Type</th>
                      <th>Day</th>
                      <th>Stage</th>
                      <th>Scheduled</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => (
                      <tr key={item.id}>
                        <td style={{ color: 'var(--color-text-muted)' }}>#{item.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.customer_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{item.customer_phone}</div>
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>{item.business_name || `#${item.business_id}`}</td>
                        <td><span className={styles.badge}>{item.message_type}</span></td>
                        <td style={{ textAlign: 'center' }}>{item.sequence_day ?? '—'}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                            background: STAGE_COLORS[item.stage] || 'var(--color-bg-alt)',
                            color: '#fff', fontSize: '0.7rem', fontWeight: 600,
                          }}>
                            {item.stage.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {item.stage === 'failed' && (
                              <button
                                className={`${styles.btn} ${styles.btnWarning}`}
                                onClick={() => handleRetry(item.id)}
                                disabled={retrying === item.id}
                                style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                              >
                                {retrying === item.id ? '...' : 'Retry'}
                              </button>
                            )}
                            {CANCELLABLE_STAGES.includes(item.stage) && (
                              <button
                                className={`${styles.btn} ${styles.btnGhost}`}
                                onClick={() => handleCancel(item.id)}
                                disabled={actionLoading === `cancel-${item.id}`}
                                style={{ padding: '4px 10px', fontSize: '0.7rem', color: '#f59e0b' }}
                              >
                                {actionLoading === `cancel-${item.id}` ? '...' : 'Cancel'}
                              </button>
                            )}
                            <button
                              className={`${styles.btn} ${styles.btnGhost}`}
                              onClick={() => handleDelete(item.id)}
                              disabled={actionLoading === `delete-${item.id}`}
                              style={{ padding: '4px 10px', fontSize: '0.7rem', color: '#ef4444' }}
                            >
                              {actionLoading === `delete-${item.id}` ? '...' : 'Delete'}
                            </button>
                          </div>
                          {item.error_log && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-error)', marginTop: 4, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.error_log}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
