import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listBusinesses, getPipelineStatus, retryAllFailed } from '../../lib/admin'
import styles from '../../components/AdminLayout/AdminLayout.module.css'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState([])
  const [pipeline, setPipeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => { loadData() }, [])

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

  if (loading) return <p className={styles.emptyState}>Loading admin dashboard...</p>

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Platform overview at a glance</p>
        </div>
      </div>

      <div className={styles.tabBar}>
        <span className={`${styles.tab} ${styles.tabActive}`}>Dashboard</span>
        <button className={styles.tab} onClick={() => navigate('/admin/businesses')}>Businesses</button>
        <button className={styles.tab} onClick={() => navigate('/admin/pipeline')}>Pipeline</button>
        <button className={styles.tab} onClick={() => navigate('/admin/agents')}>AI Agents</button>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Businesses</div>
          <div className={styles.statValue}>{businesses.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Customers</div>
          <div className={styles.statValue}>{totalCustomers}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Messages Sent</div>
          <div className={styles.statValue}>{totalMessages}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Pipeline Failed</div>
          <div className={styles.statValue} style={{ color: failedCount > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
            {failedCount}
          </div>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Pipeline Health</h3>
          {pipeline ? (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {Object.entries(pipeline.counts).map(([stage, count]) => (
                <div key={stage} style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{
                    fontSize: '1.5rem', fontWeight: 700,
                    color: stage === 'failed' ? 'var(--color-error)' :
                           stage === 'sent' ? 'var(--color-success)' :
                           stage === 'dead' ? 'var(--color-text-muted)' : 'var(--color-text)',
                  }}>{count}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {stage.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className={styles.emptyState}>No pipeline data</p>}
          {failedCount > 0 && (
            <div style={{ marginTop: 16 }}>
              <button className={`${styles.btn} ${styles.btnWarning}`} onClick={handleRetryAll} disabled={retrying}>
                {retrying ? 'Retrying...' : `Retry All Failed (${failedCount})`}
              </button>
            </div>
          )}
        </div>

        <div className={styles.card}>
          <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Recent Failures</h3>
          {pipeline?.recent_failures?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pipeline.recent_failures.slice(0, 5).map((f, i) => (
                <div key={i} className={styles.errorBlock}>
                  <div style={{ fontWeight: 600 }}>{f.message_type} · item #{f.id}</div>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{f.error_log || 'Unknown error'}</div>
                </div>
              ))}
            </div>
          ) : <p className={styles.emptyState}>No recent failures</p>}
        </div>
      </div>

      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem' }}>All Businesses</h3>
          <button className={styles.btnGhost} onClick={() => navigate('/admin/businesses')}>View all →</button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Business</th>
              <th>Customers</th>
              <th>Messages</th>
              <th>Agent</th>
              <th>Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {businesses.slice(0, 10).map(biz => (
              <tr key={biz.id} onClick={() => navigate(`/admin/businesses/${biz.id}`)}>
                <td style={{ fontWeight: 600 }}>{biz.business_name || 'Unnamed'}</td>
                <td>{biz.customer_count}</td>
                <td>{biz.message_count}</td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{biz.agent_name || '—'}</td>
                <td>
                  <span className={(biz.pipeline?.failed || 0) > 0 ? styles.badgeDanger : styles.badgeSuccess}>
                    {(biz.pipeline?.failed || 0) > 0 ? `${biz.pipeline.failed} failed` : 'OK'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
