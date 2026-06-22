import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { listCampaigns, createCampaign, sendCampaign, estimateCampaignAudience, deleteCampaign, updateCampaign } from '../../lib/api'
import { SkeletonCard, SkeletonTable, SkeletonLine } from '../../components/Skeleton/Skeleton'
import styles from './Campaigns.module.css'

function toLocalISO(datetimeLocal) {
  if (!datetimeLocal) return null
  const date = new Date(datetimeLocal)
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const pad = n => String(Math.abs(n)).padStart(2, '0')
  return date.getFullYear() + '-' +
    pad(date.getMonth() + 1) + '-' +
    pad(date.getDate()) + 'T' +
    pad(date.getHours()) + ':' +
    pad(date.getMinutes()) + ':' +
    pad(date.getSeconds()) +
    sign + pad(Math.floor(Math.abs(offset) / 60)) + ':' +
    pad(Math.abs(offset) % 60)
}

const statusStyles = {
  Draft: 'statusDraft',
  Scheduled: 'statusScheduled',
  Sent: 'statusSent',
  Sending: 'statusPaused',
  Paused: 'statusPaused',
  Failed: 'statusDraft',
}

const emptyCampaignForm = {
  name: '', goal: 'Re-engagement', message: '', tone: 'auto',
  audience_type: 'all', audience_filter: null,
  schedule_type: 'now', scheduled_at: '',
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createStep, setCreateStep] = useState(1)
  const [campaignData, setCampaignData] = useState(emptyCampaignForm)
  const [estimatedReach, setEstimatedReach] = useState(null)
  const [estimating, setEstimating] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [showDelete, setShowDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listCampaigns()
      setCampaigns(data || [])
    } catch (err) {
      setError(err.message)
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const handleEstimate = async () => {
    setEstimating(true)
    try {
      const result = await estimateCampaignAudience({
        message: campaignData.message || ' ',
        audience_type: campaignData.audience_type,
        audience_filter: campaignData.audience_filter,
      })
      setEstimatedReach(result.count)
    } catch {
      setEstimatedReach(null)
    } finally {
      setEstimating(false)
    }
  }

  useEffect(() => {
    if (createStep === 2) handleEstimate()
  }, [createStep, campaignData.audience_type])

  const handleCreateCampaign = async () => {
    setSending(true)
    try {
      await createCampaign({
        name: campaignData.name,
        goal: campaignData.goal,
        message: campaignData.message,
        tone: campaignData.tone,
        audience_type: campaignData.audience_type,
        audience_filter: campaignData.audience_filter,
        schedule_type: campaignData.schedule_type,
        scheduled_at: campaignData.schedule_type === 'later' ? toLocalISO(campaignData.scheduled_at) : null,
      })
      setShowCreate(false)
      setCreateStep(1)
      setCampaignData(emptyCampaignForm)
      setEstimatedReach(null)
      fetchCampaigns()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleSendCampaign = async (id) => {
    setSendingId(id)
    try {
      const result = await sendCampaign(id)
      fetchCampaigns()
    } catch (err) {
      setError(err.message)
    } finally {
      setSendingId(null)
    }
  }

  const handleDeleteCampaign = async () => {
    if (!showDelete) return
    setDeleting(true)
    try {
      await deleteCampaign(showDelete)
      setShowDelete(null)
      fetchCampaigns()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const toDate = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const statusLabel = (s) => {
    if (!s) return 'Draft'
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className={styles.pageTitle}>Campaigns</div>
      <div className={styles.pageSubtitle}>Send targeted messages to groups of customers</div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.8125rem', marginBottom: 16 }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 600 }}>Dismiss</button>
        </div>
      )}

      <div className={styles.topBar}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          {campaigns.length} total campaigns
        </span>
        <button className={styles.newBtn} onClick={() => setShowCreate(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          New Campaign
        </button>
      </div>

      {loading ? (
        <div className={styles.tableCard}>
          <div style={{ padding: 16 }}><SkeletonTable rows={4} cols={5} /></div>
        </div>
      ) : !showCreate && campaigns.length === 0 ? (
        <div className={`${styles.tableCard} ${styles.emptyState}`}>
          <div className={styles.emptyIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15.536 8.464a5 5 0 0 1 0 7.072m2.828-9.9a9 9 0 0 1 0 12.728M5.586 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
          </div>
          <div className={styles.emptyTitle}>No campaigns created yet</div>
          <div className={styles.emptySubtitle}>Send your first targeted message to bring customers back</div>
          <button className={styles.newBtn} onClick={() => setShowCreate(true)}>Create First Campaign</button>
        </div>
      ) : showCreate ? (
        <AnimatePresence mode="wait">
          <motion.div key={createStep} className={styles.flowCard} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className={styles.flowSteps}>
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`${styles.flowStep} ${s < createStep ? styles.flowStepDone : ''} ${s === createStep ? styles.flowStepActive : ''}`} />
              ))}
            </div>

            <div className={styles.flowTitle}>
              {['Campaign Details', 'Target Audience', 'Schedule', 'Review & Send'][createStep - 1]}
            </div>
            <div className={styles.flowSubtitle}>
              {['Name your campaign and write your message', 'Choose who to reach', 'When should this go out?', 'Confirm everything looks right'][createStep - 1]}
            </div>

            {createStep === 1 && (
              <>
                <label className={styles.label}>Campaign Name</label>
                <input className={styles.input} placeholder="e.g. Diwali Offer" value={campaignData.name} onChange={e => setCampaignData(d => ({ ...d, name: e.target.value }))} style={{ marginBottom: 16 }} />
                <label className={styles.label}>Campaign Goal</label>
                <div className={styles.radioGroup}>
                  {['Re-engagement', 'Upsell', 'Festival Offer', 'Feedback Request', 'Custom'].map(g => (
                    <label key={g} className={styles.radioLabel}>
                      <input type="radio" name="goal" checked={campaignData.goal === g} onChange={() => setCampaignData(d => ({ ...d, goal: g }))} />
                      {g}
                    </label>
                  ))}
                </div>
                <label className={styles.label} style={{ marginTop: 16 }}>Message</label>
                <textarea className={styles.textarea} placeholder="Write your campaign message..." value={campaignData.message} onChange={e => setCampaignData(d => ({ ...d, message: e.target.value }))} />
                <label className={styles.label} style={{ marginTop: 12 }}>Tone</label>
                <select className={styles.select} value={campaignData.tone} onChange={e => setCampaignData(d => ({ ...d, tone: e.target.value }))}>
                  <option value="auto">Auto-detect</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="funny">Funny</option>
                  <option value="empathetic">Empathetic</option>
                </select>
              </>
            )}

            {createStep === 2 && (
              <>
                <label className={styles.label}>Who to send to</label>
                <div className={styles.radioGroup}>
                  {[
                    { value: 'all', label: 'All Customers' },
                    { value: 'inactive', label: 'Customers who haven\'t replied in 30+ days' },
                    { value: 'product', label: 'Customers who purchased specific product' },
                    { value: 'custom', label: 'Custom filter' },
                  ].map(a => (
                    <label key={a.value} className={styles.radioLabel}>
                      <input type="radio" name="audience" checked={campaignData.audience_type === a.value} onChange={() => setCampaignData(d => ({ ...d, audience_type: a.value, audience_filter: null }))} />
                      {a.label}
                    </label>
                  ))}
                </div>
                <div className={styles.estimate}>
                  {estimating ? 'Estimating...' : (
                    <>📢 This campaign will reach <strong>{estimatedReach ?? '...'} customers</strong></>
                  )}
                </div>
              </>
            )}

            {createStep === 3 && (
              <>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="schedule" checked={campaignData.schedule_type === 'now'} onChange={() => setCampaignData(d => ({ ...d, schedule_type: 'now' }))} />
                    Send now
                  </label>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="schedule" checked={campaignData.schedule_type === 'later'} onChange={() => setCampaignData(d => ({ ...d, schedule_type: 'later' }))} />
                    Schedule for later
                  </label>
                </div>
                {campaignData.schedule_type === 'later' && (
                  <input className={styles.input} type="datetime-local" value={campaignData.scheduled_at} onChange={e => setCampaignData(d => ({ ...d, scheduled_at: e.target.value }))} />
                )}
              </>
            )}

            {createStep === 4 && (
              <div>
                <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>Campaign Summary</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '4px 0' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Name</span>
                    <span style={{ fontWeight: 600 }}>{campaignData.name || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '4px 0' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Goal</span>
                    <span style={{ fontWeight: 600 }}>{campaignData.goal || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '4px 0' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Audience</span>
                    <span style={{ fontWeight: 600 }}>{campaignData.audience_type === 'all' ? 'All Customers' : campaignData.audience_type === 'inactive' ? 'Inactive > 30 days' : campaignData.audience_type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '4px 0' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Reach</span>
                    <span style={{ fontWeight: 600 }}>{estimatedReach ?? '...'} customers</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '4px 0' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Schedule</span>
                    <span style={{ fontWeight: 600 }}>{campaignData.schedule_type === 'now' ? 'Send now' : campaignData.scheduled_at}</span>
                  </div>
                </div>
                {campaignData.message && (
                  <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>Message Preview</div>
                    <div style={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>{campaignData.message}</div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.flowActions}>
              <button className={styles.backBtn} onClick={() => createStep > 1 ? setCreateStep(s => s - 1) : setShowCreate(false)}>
                {createStep === 1 ? 'Cancel' : 'Back'}
              </button>
              <button className={styles.nextBtn} onClick={() => {
                if (createStep < 4) setCreateStep(s => s + 1)
                else handleCreateCampaign()
              }} disabled={sending || (createStep === 1 && !campaignData.name.trim())}>
                {sending ? 'Creating...' : createStep < 4 ? 'Continue' : 'Confirm & Send'}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Target Audience</th>
                <th>Messages Sent</th>
                <th>Response Rate</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>
                    {c.audience_type === 'all' ? 'All Customers' :
                     c.audience_type === 'inactive' ? 'Inactive > 30 days' :
                     c.audience_type === 'product' ? `Product: ${c.audience_filter?.product || ''}` :
                     c.audience_type === 'custom' ? 'Custom filter' : c.audience_type}
                  </td>
                  <td>{c.messages_sent || 0}</td>
                  <td>{c.response_rate > 0 ? `${c.response_rate}%` : '—'}</td>
                  <td><span className={`${styles.statusBadge} ${styles[statusStyles[statusLabel(c.status)]]}`}>{statusLabel(c.status)}</span></td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{toDate(c.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {c.status === 'draft' && (
                        <button
                          className={styles.quickBtn}
                          onClick={() => handleSendCampaign(c.id)}
                          disabled={sendingId === c.id}
                          title="Send campaign"
                        >
                          {sendingId === c.id ? '...' : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                          )}
                        </button>
                      )}
                      <button
                        className={styles.quickBtn}
                        onClick={() => setShowDelete(c.id)}
                        title="Delete campaign"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowDelete(null)}>
          <div className={`${styles.modal} ${styles.deleteModal}`}>
            <div className={styles.modalTitle}>Delete Campaign</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowDelete(null)}>Cancel</button>
              <button className={styles.deleteBtn} onClick={handleDeleteCampaign} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
