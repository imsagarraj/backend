import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getInsights } from '../../lib/api'
import {
  SmileIcon,
  RepeatIcon,
  StarIcon,
  AlertTriangleIcon,
  HeartIcon,
  BarChartIcon,
  issueIconMap,
} from '../../components/Icons'
import styles from './Insights.module.css'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
}

const itemReveal = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
}

const healthMeta = [
  { key: 'customer_satisfaction', Icon: SmileIcon, label: 'Customer Satisfaction' },
  { key: 'returning_customers_pct', Icon: RepeatIcon, label: 'Returning Customers' },
  { key: 'reviews_collected', Icon: StarIcon, label: 'Reviews Collected' },
  { key: 'customers_at_risk', Icon: AlertTriangleIcon, label: 'Customers At Risk' },
]

function HealthSkeleton() {
  return (
    <div className={styles.healthRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={styles.healthCard}
          style={{ opacity: 0.35, minHeight: 118 }}
        />
      ))}
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <motion.div variants={itemReveal} className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <div className={styles.emptyText}>{text}</div>
    </motion.div>
  )
}

function HealthCard({ value, label, icon, suffix }) {
  return (
    <div className={styles.healthCard}>
      <div className={styles.healthIcon}>{icon}</div>
      <div className={styles.healthValue}>{value}{suffix}</div>
      <div className={styles.healthLabel}>{label}</div>
    </div>
  )
}

export default function Insights() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getInsights()
      .then(setData)
      .catch((err) => {
        console.error('Failed to load insights:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.pageTitle}>AI Business Insights</div>
          <div className={styles.pageSubtitle}>
            What your customers are saying, feeling, and expecting — all in one place.
          </div>
        </div>
      </div>

      {loading && (
        <motion.div variants={itemReveal} className={styles.section}>
          <div className={styles.sectionHeader}>Overall Customer Health</div>
          <HealthSkeleton />
        </motion.div>
      )}

      {error && <EmptyState icon={<BarChartIcon size={32} />} text="Unable to load insights right now. Please try again later." />}

      {!loading && !error && !data && (
        <EmptyState icon={<BarChartIcon size={32} />} text="Not enough data yet. Insights will appear once you have customer conversations." />
      )}

      {data && (
        <>
          {/* Overall Customer Health */}
          {healthMeta.some(h => {
            const val = data.health[h.key]
            return val !== undefined && val !== 0
          }) && (
            <motion.div variants={itemReveal} className={styles.section}>
              <div className={styles.sectionHeader}>Overall Customer Health</div>
              <div className={styles.healthRow}>
                {healthMeta.map(({ key, Icon, label }, i) => (
                  <div key={i} className={styles.healthCard}>
                    <div className={styles.healthIcon}><Icon size={28} /></div>
                    <div className={styles.healthValue}>
                      {key === 'customer_satisfaction' || key === 'returning_customers_pct'
                        ? `${data.health[key]}%`
                        : String(data.health[key])}
                    </div>
                    <div className={styles.healthLabel}>{label}</div>
                  </div>
                ))}
                <div className={styles.healthCardAlert}>
                  <div className={styles.healthAlertLabel}>Needs Your Attention</div>
                  <div className={styles.healthAlertIcon}><AlertTriangleIcon size={28} /></div>
                  <div className={styles.healthAlertText}>
                    {data.health.not_returned_after_negative > 0
                      ? `${data.health.not_returned_after_negative} customer${data.health.not_returned_after_negative > 1 ? 's' : ''} didn't return after negative feedback`
                      : data.health.customers_at_risk > 0
                        ? `${data.health.customers_at_risk} customer${data.health.customers_at_risk > 1 ? 's' : ''} at risk`
                        : 'All customers are healthy'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Top Issues */}
          {data.top_issues.length > 0 && (
            <motion.div variants={itemReveal} className={styles.section}>
              <div className={styles.sectionHeader}>
                Top Issue{data.top_issues.length > 1 ? 's' : ''}
              </div>
              <div className={styles.issuesGrid}>
                {data.top_issues.map((issue, i) => {
                  const IssueIcon = issueIconMap[issue.icon] || issueIconMap['❗']
                  return (
                  <div key={i} className={styles.issueCard}>
                    <div className={styles.issueIcon}><IssueIcon size={22} /></div>
                    <div className={styles.issueTitle}>
                      {issue.label}
                      <span className={styles.issueCount}>{issue.customer_count}</span>
                    </div>
                    {issue.example && (
                      <div className={styles.issueExample}>
                        &ldquo;{issue.example}&rdquo;
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Customers Appreciate */}
          {data.appreciate.length > 0 && (
            <motion.div variants={itemReveal} className={styles.section}>
              <div className={styles.sectionHeader}>Customers Appreciate</div>
              <div className={styles.appreciateRow}>
                {data.appreciate.map((item, i) => (
                  <div key={i} className={styles.appreciateTag}>
                    <HeartIcon size={16} /> {item}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Most Common Feedback */}
          {(data.feedback.complaints.length > 0 || data.feedback.suggestions.length > 0 || data.feedback.praise.length > 0) && (
            <motion.div variants={itemReveal} className={styles.section}>
              <div className={styles.sectionHeader}>Most Common Feedback</div>
              <div className={styles.feedbackGrid}>
                <div className={styles.feedbackCard}>
                  <div className={styles.feedbackCardTitle}>Complaints</div>
                  {data.feedback.complaints.map((item, i) => (
                    <div key={i} className={`${styles.feedbackItem} ${styles.feedbackItemComplaint}`}>
                      <span className={styles.feedbackLabel}>{item.label}</span>
                      <span className={styles.feedbackCount}>{item.count}</span>
                    </div>
                  ))}
                  {data.feedback.complaints.length === 0 && (
                    <div className={styles.feedbackItem}>
                      <span className={styles.feedbackLabel} style={{ color: 'var(--color-text-muted)' }}>No complaints recorded</span>
                    </div>
                  )}
                </div>
                <div className={styles.feedbackCard}>
                  <div className={styles.feedbackCardTitle}>Suggestions</div>
                  {data.feedback.suggestions.map((item, i) => (
                    <div key={i} className={styles.feedbackItem}>
                      <span className={styles.feedbackLabel}>{item}</span>
                    </div>
                  ))}
                  {data.feedback.suggestions.length === 0 && (
                    <div className={styles.feedbackItem}>
                      <span className={styles.feedbackLabel} style={{ color: 'var(--color-text-muted)' }}>No suggestions yet</span>
                    </div>
                  )}
                </div>
                <div className={styles.feedbackCard}>
                  <div className={styles.feedbackCardTitle}>Praise</div>
                  {data.feedback.praise.map((item, i) => (
                    <div key={i} className={`${styles.feedbackItem} ${styles.feedbackItemPraise}`}>
                      <span className={styles.feedbackLabel}>{item}</span>
                    </div>
                  ))}
                  {data.feedback.praise.length === 0 && (
                    <div className={styles.feedbackItem}>
                      <span className={styles.feedbackLabel} style={{ color: 'var(--color-text-muted)' }}>No praise yet</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  )
}
