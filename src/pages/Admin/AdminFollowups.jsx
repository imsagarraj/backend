import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFollowups, updateFollowupDate } from '../../lib/admin'
import styles from '../../components/AdminLayout/AdminLayout.module.css'

export default function AdminFollowups() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    getFollowups()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const startEdit = (s) => {
    setEditingId(s.id)
    setEditDate(s.scheduled_date)
  }

  const saveDate = async (id) => {
    setSaving(true)
    try {
      await updateFollowupDate(id, editDate)
      setEditingId(null)
      setEditDate('')
      load()
    } catch (e) {
      alert('Failed to update: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDate('')
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Follow-up Schedule</h1>
          <p className={styles.pageSubtitle}>All customer follow-up sequences — upcoming, completed, and missed</p>
        </div>
      </div>

      <div className={styles.tabBar}>
        <button className={styles.tab} onClick={() => navigate('/admin/dashboard')}>Dashboard</button>
        <button className={styles.tab} onClick={() => navigate('/admin/businesses')}>Businesses</button>
        <button className={styles.tab} onClick={() => navigate('/admin/pipeline')}>Pipeline</button>
        <span className={`${styles.tab} ${styles.tabActive}`}>Follow-ups</span>
        <button className={styles.tab} onClick={() => navigate('/admin/agents')}>AI Agents</button>
      </div>

      {loading ? (
        <p className={styles.emptyState}>Loading follow-ups...</p>
      ) : data.length === 0 ? (
        <p className={styles.emptyState}>No follow-up sequences found.</p>
      ) : (
        <div className={styles.card}>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Business</th>
                  <th>Touch</th>
                  <th>Scheduled Date</th>
                  <th>Status</th>
                  <th>Customer Status</th>
                  <th>Seq Day</th>
                  <th>Purchase Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(s => {
                  const cust = s.customer
                  const biz = s.business
                  const isDue = s.status === 'pending' && s.scheduled_date <= today
                  const isToday = s.scheduled_date === today
                  const isEditing = editingId === s.id
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{cust?.name || '—'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{cust?.phone || ''}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{biz?.business_name || `#${s.business_id}`}</td>
                      <td style={{ textAlign: 'center' }}>{s.touch_number}/5</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDate}
                            onChange={e => setEditDate(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--color-border)',
                              background: 'var(--color-bg-alt)',
                              color: 'var(--color-text)',
                              fontSize: '0.8rem',
                            }}
                          />
                        ) : (
                          <span style={{
                            fontWeight: isToday ? 700 : 400,
                            color: isDue ? 'var(--color-error)' : isToday ? 'var(--color-accent)' : 'inherit',
                          }}>
                            {s.scheduled_date}
                            {isToday && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: 'var(--color-accent)' }}>TODAY</span>}
                            {isDue && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: 'var(--color-error)' }}>OVERDUE</span>}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                          fontSize: '0.7rem', fontWeight: 600,
                          ...(s.status === 'completed' ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' } :
                             s.status === 'pending' ? (isDue ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444' } : { background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }) :
                             { background: 'rgba(107,114,128,0.1)', color: '#6b7280' }),
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td>{cust?.status || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{cust?.current_sequence_day ?? '—'}</td>
                      <td style={{ fontSize: '0.75rem' }}>{cust?.purchase_date || '—'}</td>
                      <td>
                        {s.status === 'pending' && (
                          isEditing ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className={styles.btn} style={{ background: 'var(--color-accent)', color: '#fff', padding: '4px 12px', fontSize: '0.75rem' }}
                                onClick={() => saveDate(s.id)} disabled={saving}>
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button className={styles.btn} style={{ background: 'transparent', color: 'var(--color-text-secondary)', padding: '4px 12px', fontSize: '0.75rem', border: '1px solid var(--color-border)' }}
                                onClick={cancelEdit}>Cancel</button>
                            </div>
                          ) : (
                            <button className={styles.btnGhost} style={{ fontSize: '0.75rem' }}
                              onClick={() => startEdit(s)}>Change Date</button>
                          )
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
