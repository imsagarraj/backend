import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

import { useApp } from '../../context/AppContext'
import styles from './Dashboard.module.css'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { business, customers, dashboardData, dashboardLoading } = useApp()
  const displayName = business?.owner_name || business?.business_name || 'User'
  const hasData = customers.length > 0
  const stats = dashboardData?.stats
  const activity = dashboardData?.recent_activity || []
  const schedule = dashboardData?.todays_schedule || []
  const pipeline = dashboardData?.pipeline || {}

  if (dashboardLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className={styles.pageTitle}>{getGreeting()}, {displayName} 👋</div>
        <div className={styles.pageSubtitle}>{formatDate()}</div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 40 }}>Loading dashboard...</p>
      </motion.div>
    )
  }

  if (!hasData) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className={styles.pageTitle}>{getGreeting()}, {displayName} 👋</div>
        <div className={styles.pageSubtitle}>{formatDate()}</div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <h2 className={styles.emptyTitle}>Welcome to VICloud</h2>
          <p className={styles.emptyText}>
            Start by adding your first customer. Once you have customers, you'll see your dashboard analytics, activity feed, and insights here.
          </p>
          <button className={styles.emptyCta} onClick={() => navigate('/customers')}>
            Add your first customer
          </button>
          <button className={styles.emptyCtaSecondary} onClick={() => navigate('/business-profile')}>
            Set up business profile
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className={styles.pageTitle}>{getGreeting()}, {displayName} 👋</div>
      <div className={styles.pageSubtitle}>{formatDate()}</div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="4"/><path d="M23 20v-1a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <div className={styles.statNumber}>{stats?.total_customers || customers.length}</div>
          <div className={styles.statLabel}>Total Customers</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
          <div className={styles.statNumber}>{stats?.today_sent || 0}</div>
          <div className={styles.statLabel}>Messages Sent Today</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg></div>
          <div className={styles.statNumber}>{stats?.week_response_rate != null ? `${stats.week_response_rate}%` : '--%'}</div>
          <div className={styles.statLabel}>Response Rate (7d)</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div className={styles.statNumber}>{stats?.today_replies || 0}</div>
          <div className={styles.statLabel}>Replies Today</div>
        </div>
      </div>

      <div className={styles.middleRow}>
        <div className={styles.activityCard}>
          <h3 className={styles.cardTitle}>Recent Activity</h3>
          {activity.length === 0 ? (
            <p className={styles.emptySmall}>No activity yet</p>
          ) : (
            <div className={styles.activityList}>
              {activity.map((item, i) => (
                <div key={i} className={styles.activityItem}>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityCustomer}>{item.customer_name}</span>
                    <span className={styles.activityAction}>
                      {item.direction === 'sent' ? 'Message sent' : 'Reply received'}
                    </span>
                  </div>
                  <div className={styles.activityMeta}>
                    <span className={styles.activityTime}>{timeAgo(item.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.scheduleCard}>
          <h3 className={styles.cardTitle}>Messages going out today</h3>
          {schedule.length === 0 ? (
            <p className={styles.emptySmall}>No messages scheduled</p>
          ) : (
            <div className={styles.scheduleBody}>
              {schedule.map((item, i) => (
                <div key={i} className={styles.scheduleRow}>
                  <div className={styles.scheduleInfo}>
                    <span className={styles.scheduleCustomer}>{item.name}</span>
                    <span className={`${styles.schedulePill} ${
                      item.sequence_day === 1 ? styles.pillDay1 :
                      item.sequence_day === 2 ? styles.pillDay3 :
                      item.sequence_day === 3 ? styles.pillDay15 :
                      item.sequence_day === 4 ? styles.pillDay30 :
                      styles.pillCustom
                    }`}>Touch {item.sequence_day}/5</span>
                  </div>
                  <span className={styles.statusScheduled}>Scheduled</span>
                </div>
              ))}
            </div>
          )}
          {pipeline.pending > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 8, padding: '0 16px 12px' }}>
              {pipeline.pending} messages queued{pipeline.failed > 0 ? ` · ${pipeline.failed} failed` : ''}
            </div>
          )}
        </div>
      </div>

      <div className={styles.bottomRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.cardTitle}>AI Agent Status</h3>
          {dashboardData?.agent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--color-accent)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '1.125rem',
              }}>
                {dashboardData.agent.name?.[0] || 'A'}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{dashboardData.agent.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {dashboardData.agent.today_sent} sent · {dashboardData.agent.today_replies} replies today
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.emptySmall}>No agent configured</p>
          )}
        </div>

        <div className={styles.quickActionsCard}>
          <h3 className={styles.cardTitle}>Quick Actions</h3>
          <div className={styles.quickActions}>
            <button className={styles.quickActionBtn} onClick={() => navigate('/customers')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Add Customer
            </button>
            <button className={styles.quickActionBtn} onClick={() => navigate('/campaigns')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              Send Broadcast Message
            </button>
            <button className={styles.quickActionBtn} onClick={() => navigate('/insights')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18M7 16l4-4 4 4 5-5"/></svg>
              View Insights
            </button>
            <button className={styles.quickActionBtn} onClick={() => navigate('/ai-assistant')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4m0 4a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4m0-8a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4"/></svg>
              Change AI Agent
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
