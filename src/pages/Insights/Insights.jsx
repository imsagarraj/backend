import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getInsights } from '../../lib/api'
import styles from './Insights.module.css'

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 },
  }),
}

const defaultAppreciate = [
  'Friendly Staff',
  'Product Quality',
  'Fast Service',
  'Smooth Delivery',
]

const emotionIcons = {
  'customer_satisfaction': '😊',
  'returning_customers_pct': '🔁',
  'reviews_collected': '⭐',
  'customers_at_risk': '⚠️',
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

  if (loading) {
    return (
      <div>
        <div className={styles.pageTitle}>AI Business Insights</div>
        <div className={styles.pageSubtitle}>Analyzing your customer data...</div>
        <div className={styles.healthRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={styles.healthCard} style={{ opacity: 0.5, minHeight: 100 }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className={styles.pageTitle}>AI Business Insights</div>
        <div className={styles.pageSubtitle}>What your customers are saying, feeling, and expecting — all in one place.</div>
        <div className={styles.healthCard} style={{ padding: 40, textAlign: 'center', marginTop: 20 }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Unable to load insights right now. Please try again later.
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <div className={styles.pageTitle}>AI Business Insights</div>
        <div className={styles.pageSubtitle}>What your customers are saying, feeling, and expecting — all in one place.</div>
        <div className={styles.healthCard} style={{ padding: 40, textAlign: 'center', marginTop: 20 }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Not enough data yet. Insights will appear once you have customer interactions.
          </div>
        </div>
      </div>
    )
  }

  const { health, top_issues, appreciate, feedback } = data
  const healthItems = [
    { key: 'customer_satisfaction', value: `${health.customer_satisfaction}%`, label: 'Customer Satisfaction' },
    { key: 'returning_customers_pct', value: `${health.returning_customers_pct}%`, label: 'Returning Customers' },
    { key: 'reviews_collected', value: String(health.reviews_collected), label: 'Reviews Collected' },
    { key: 'customers_at_risk', value: String(health.customers_at_risk), label: 'Customers At Risk' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className={styles.pageTitle}>AI Business Insights</div>
      <div className={styles.pageSubtitle}>What your customers are saying, feeling, and expecting — all in one place.</div>

      {healthItems.some(h => h.value !== '0%' && h.value !== '0') && (
        <motion.div variants={sectionVariants} custom={0} initial="hidden" animate="visible" className={styles.section}>
          <div className={styles.sectionHeader}>Overall Customer Health</div>
          <div className={styles.healthRow}>
            {healthItems.map((h, i) => (
              <div key={i} className={styles.healthCard}>
                <div className={styles.healthIcon}>{emotionIcons[h.key]}</div>
                <div className={styles.healthValue}>{h.value}</div>
                <div className={styles.healthLabel}>{h.label}</div>
              </div>
            ))}
            <div className={styles.healthCardAlert}>
              <div className={styles.healthAlertLabel}>Needs Your Attention</div>
              <div className={styles.healthAlertIcon}>🚨</div>
              <div className={styles.healthAlertText}>
                {health.not_returned_after_negative > 0
                  ? `${health.not_returned_after_negative} customers didn't return after negative feedback`
                  : health.customers_at_risk > 0
                    ? `${health.customers_at_risk} customers at risk`
                    : 'All customers are healthy'}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {top_issues.length > 0 && (
        <>
          <motion.div variants={sectionVariants} custom={1} initial="hidden" animate="visible" className={styles.section}>
            <div className={styles.sectionHeader}>
              <span>❗</span> The {top_issues.length} most important issues right now
            </div>
            <div className={styles.sectionNote}>This is what the owner should see first.</div>
            <div className={styles.issuesGrid}>
              {top_issues.map((issue, i) => (
                <div key={i} className={styles.issueCard}>
                  <div className={styles.issueIcon}>{issue.icon}</div>
                  <div className={styles.issueTitle}>{issue.title}</div>
                  <div className={styles.issueDesc}>{issue.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      <motion.div variants={sectionVariants} custom={2} initial="hidden" animate="visible" className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>❤️</span> Customers Appreciate
        </div>
        <div className={styles.sectionNote}>This helps businesses know what not to change.</div>
        <div className={styles.appreciateRow}>
          {(appreciate.length > 0 ? appreciate : defaultAppreciate).map((item, i) => (
            <div key={i} className={styles.appreciateTag}>
              <span>❤️</span> {item}
            </div>
          ))}
        </div>
      </motion.div>

      {(feedback.complaints.length > 0 || feedback.suggestions.length > 0 || feedback.praise.length > 0) && (
        <motion.div variants={sectionVariants} custom={3} initial="hidden" animate="visible" className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>💬</span> Most Common Feedback
          </div>
          <div className={styles.feedbackGrid}>
            <div className={styles.feedbackCard}>
              <div className={styles.feedbackCardTitle}>
                <span>😤</span> Complaints
              </div>
              {feedback.complaints.map((item, i) => (
                <div key={i} className={`${styles.feedbackItem} ${styles.feedbackItemComplaint}`}>
                  <span className={styles.feedbackLabel}>{item.label}</span>
                  <span className={styles.feedbackCount}>({item.count})</span>
                </div>
              ))}
              {feedback.complaints.length === 0 && (
                <div className={styles.feedbackItem}>
                  <span className={styles.feedbackLabel} style={{ color: 'var(--color-text-muted)' }}>No complaints recorded</span>
                </div>
              )}
            </div>
            <div className={styles.feedbackCard}>
              <div className={styles.feedbackCardTitle}>
                <span>💡</span> Suggestions
              </div>
              {feedback.suggestions.map((item, i) => (
                <div key={i} className={styles.feedbackItem}>
                  <span className={styles.feedbackLabel}>{item}</span>
                </div>
              ))}
              {feedback.suggestions.length === 0 && (
                <div className={styles.feedbackItem}>
                  <span className={styles.feedbackLabel} style={{ color: 'var(--color-text-muted)' }}>No suggestions yet</span>
                </div>
              )}
            </div>
            <div className={styles.feedbackCard}>
              <div className={styles.feedbackCardTitle}>
                <span>⭐</span> Praise
              </div>
              {feedback.praise.map((item, i) => (
                <div key={i} className={`${styles.feedbackItem} ${styles.feedbackItemPraise}`}>
                  <span className={styles.feedbackLabel}>{item}</span>
                </div>
              ))}
              {feedback.praise.length === 0 && (
                <div className={styles.feedbackItem}>
                  <span className={styles.feedbackLabel} style={{ color: 'var(--color-text-muted)' }}>No praise yet</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
