import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './Campaigns.module.css'

const initialCampaigns = [
  { id: 1, name: 'Diwali Offer 2025', audience: 'All customers', sent: 48, responseRate: 64, status: 'Sent', date: '15 May 2025' },
  { id: 2, name: 'New Year Check-in', audience: 'Inactive > 30 days', sent: 32, responseRate: 41, status: 'Sent', date: '02 Jan 2025' },
  { id: 3, name: 'Summer Sale', audience: 'Purchased > 60 days', sent: 0, responseRate: 0, status: 'Draft', date: '—' },
  { id: 4, name: 'Holii Greetings', audience: 'All customers', sent: 0, responseRate: 0, status: 'Scheduled', date: '12 Jun 2025' },
]

const statusStyles = {
  Draft: 'statusDraft',
  Scheduled: 'statusScheduled',
  Sent: 'statusSent',
  Paused: 'statusPaused',
}

export default function Campaigns() {
  const [campaigns] = useState(initialCampaigns)
  const [showCreate, setShowCreate] = useState(false)
  const [createStep, setCreateStep] = useState(1)
  const [campaignData, setCampaignData] = useState({
    name: '', goal: '', message: '', tone: 'auto',
    audience: 'all', schedule: 'now', scheduleDate: '',
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className={styles.pageTitle}>Campaigns</div>
      <div className={styles.pageSubtitle}>Send targeted messages to groups of customers</div>

      <div className={styles.topBar}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          {campaigns.length} total campaigns
        </span>
        <button className={styles.newBtn} onClick={() => setShowCreate(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          New Campaign
        </button>
      </div>

      {!showCreate ? (
        <>
          {campaigns.length === 0 ? (
            <div className={`${styles.tableCard} ${styles.emptyState}`}>
              <div className={styles.emptyIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15.536 8.464a5 5 0 0 1 0 7.072m2.828-9.9a9 9 0 0 1 0 12.728M5.586 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
              </div>
              <div className={styles.emptyTitle}>No campaigns created yet</div>
              <div className={styles.emptySubtitle}>Send your first targeted message to bring customers back</div>
              <button className={styles.newBtn} onClick={() => setShowCreate(true)}>Create First Campaign</button>
            </div>
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
                      <td style={{ color: 'var(--color-text-secondary)' }}>{c.audience}</td>
                      <td>{c.sent}</td>
                      <td>{c.responseRate > 0 ? `${c.responseRate}%` : '—'}</td>
                      <td><span className={`${styles.statusBadge} ${styles[statusStyles[c.status]]}`}>{c.status}</span></td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{c.date}</td>
                      <td>
                        <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
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
                  <option>Auto-detect</option>
                  <option>Formal</option>
                  <option>Casual</option>
                  <option>Funny</option>
                  <option>Empathetic</option>
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
                      <input type="radio" name="audience" checked={campaignData.audience === a.value} onChange={() => setCampaignData(d => ({ ...d, audience: a.value }))} />
                      {a.label}
                    </label>
                  ))}
                </div>
                <div className={styles.estimate}>
                  📢 This campaign will reach <strong>47 customers</strong>
                </div>
              </>
            )}

            {createStep === 3 && (
              <>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="schedule" checked={campaignData.schedule === 'now'} onChange={() => setCampaignData(d => ({ ...d, schedule: 'now' }))} />
                    Send now
                  </label>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="schedule" checked={campaignData.schedule === 'later'} onChange={() => setCampaignData(d => ({ ...d, schedule: 'later' }))} />
                    Schedule for later
                  </label>
                </div>
                {campaignData.schedule === 'later' && (
                  <input className={styles.input} type="datetime-local" value={campaignData.scheduleDate} onChange={e => setCampaignData(d => ({ ...d, scheduleDate: e.target.value }))} />
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
                    <span style={{ fontWeight: 600 }}>All Customers</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '4px 0' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Reach</span>
                    <span style={{ fontWeight: 600 }}>47 customers</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '4px 0' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Schedule</span>
                    <span style={{ fontWeight: 600 }}>{campaignData.schedule === 'now' ? 'Send now' : campaignData.scheduleDate}</span>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.flowActions}>
              <button className={styles.backBtn} onClick={() => createStep > 1 ? setCreateStep(s => s - 1) : setShowCreate(false)}
                style={{ visibility: createStep > 1 ? 'visible' : 'visible' }}>
                {createStep === 1 ? 'Cancel' : 'Back'}
              </button>
              <button className={styles.nextBtn} onClick={() => {
                if (createStep < 4) setCreateStep(s => s + 1)
                else {
                  setShowCreate(false)
                  setCreateStep(1)
                }
              }}>
                {createStep < 4 ? 'Continue' : 'Confirm & Send'}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
