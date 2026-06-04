import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listBusinesses } from '../../lib/admin'
import styles from '../../components/AdminLayout/AdminLayout.module.css'

export default function AdminBusinesses() {
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    listBusinesses().then(setBusinesses).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = businesses.filter(b =>
    !search || b.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Businesses</h1>
          <p className={styles.pageSubtitle}>Manage all businesses on the platform</p>
        </div>
      </div>

      <div className={styles.tabBar}>
        <button className={styles.tab} onClick={() => navigate('/admin/dashboard')}>Dashboard</button>
        <span className={`${styles.tab} ${styles.tabActive}`}>Businesses</span>
        <button className={styles.tab} onClick={() => navigate('/admin/pipeline')}>Pipeline</button>
        <button className={styles.tab} onClick={() => navigate('/admin/agents')}>AI Agents</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          className={styles.searchInput}
          placeholder="Search by name or city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className={styles.emptyState}>Loading...</p>
      ) : (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Type</th>
                <th>City</th>
                <th>Customers</th>
                <th>Messages</th>
                <th>Agent</th>
                <th>Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>No businesses found</td>
                </tr>
              ) : filtered.map(biz => (
                <tr key={biz.id} onClick={() => navigate(`/admin/businesses/${biz.id}`)}>
                  <td style={{ fontWeight: 600 }}>{biz.business_name || 'Unnamed'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{biz.business_type || '—'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{biz.city || '—'}</td>
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
      )}
    </>
  )
}
