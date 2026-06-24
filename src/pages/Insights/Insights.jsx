import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { useApp } from '../../context/AppContext'
import { getAnalytics } from '../../lib/api'
import { SkeletonCard, SkeletonChart } from '../../components/Skeleton/Skeleton'
import styles from './Insights.module.css'

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function buildDayData(messagesPerDay) {
  const totals = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
  if (messagesPerDay?.length) {
    messagesPerDay.forEach(d => {
      const day = dayNames[new Date(d.date).getDay()]
      totals[day] += d.received || 0
    })
  }
  return dayOrder.map(day => ({ day, responses: totals[day] }))
}

function buildFeedbackData(messagesPerDay, period) {
  if (!messagesPerDay?.length) return []
  if (period === '90') {
    const weeks = []
    let buf = { label: '', received: 0, days: 0 }
    messagesPerDay.forEach((d, i) => {
      const dt = new Date(d.date)
      if (i === 0 || dt.getDay() === 0) {
        if (buf.days > 0) weeks.push(buf)
        buf = { label: dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), received: 0, days: 0 }
      }
      buf.received += d.received || 0
      buf.days++
    })
    if (buf.days > 0) weeks.push(buf)
    return weeks
  }
  return messagesPerDay.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    received: d.received || 0,
  }))
}

export default function Insights() {
  const { business } = useApp()
  const [range, setRange] = useState('30')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const periodMap = { '7': '7d', '30': '30d', '90': '90d' }

  useEffect(() => {
    if (!business?.id) return
    setLoading(true)
    getAnalytics(periodMap[range] || '30d')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [business?.id, range])

  const dayData = useMemo(() => buildDayData(data?.messages_per_day), [data])
  const feedbackData = useMemo(() => buildFeedbackData(data?.messages_per_day, range), [data, range])
  const bestDay = useMemo(() => {
    if (!dayData.length) return null
    return dayData.reduce((a, b) => a.responses > b.responses ? a : b)
  }, [dayData])
  const empty = !loading && (!data || data.total_customers === 0)

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 0) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }
    })
  }

  const fbLabel = range === '90' ? 'week' : 'date'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <motion.div variants={sectionVariants} custom={0} initial="hidden" animate="visible">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div className={styles.pageTitle}>Insights</div>
            <div className={styles.pageSubtitle}>Understand how your customers are engaging</div>
          </div>
        </div>

        <div className={styles.dateRange}>
          {[
            { label: '7 days', value: '7' },
            { label: '30 days', value: '30' },
            { label: '3 months', value: '90' },
          ].map(d => (
            <button key={d.value} className={`${styles.dateBtn} ${range === d.value ? styles.dateActive : ''}`} onClick={() => setRange(d.value)}>
              {d.label}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <motion.div variants={sectionVariants} custom={1} initial="hidden" animate="visible">
          <div className={styles.statsGrid}>
            <SkeletonCard height={80} /><SkeletonCard height={80} /><SkeletonCard height={80} /><SkeletonCard height={80} />
          </div>
          <div className={styles.insightGrid}>
            <SkeletonChart height={280} /><SkeletonChart height={280} />
            <SkeletonChart height={280} /><SkeletonChart height={280} />
          </div>
        </motion.div>
      ) : empty ? (
        <motion.div variants={sectionVariants} custom={1} initial="hidden" animate="visible" className={`${styles.chartCard} ${styles.emptyState}`}>
          <div className={styles.emptyIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18M7 16l4-4 4 4 5-5M7 12l4-4 4 4 5-5"/></svg>
          </div>
          <div className={styles.emptyTitle}>Not enough data yet</div>
          <div className={styles.emptySubtitle}>Insights will appear once Vi sends your first 10 messages</div>
        </motion.div>
      ) : (
        <>
          <motion.div className={styles.statsGrid} variants={sectionVariants} custom={1} initial="hidden" animate="visible">
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{data.total_customers}</div>
              <div className={styles.statLabel}>Total Customers</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{data.messages_received}</div>
              <div className={styles.statLabel}>Responses Received</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{bestDay?.responses > 0 ? `${bestDay.day} (${bestDay.responses})` : '—'}</div>
              <div className={styles.statLabel}>Best Response Day</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>{data.response_rate}%</div>
              <div className={styles.statLabel}>Response Rate</div>
            </div>
          </motion.div>

          <motion.div className={styles.insightGrid} variants={sectionVariants} custom={2} initial="hidden" animate="visible">
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Best Time to Respond</div>
              <div className={styles.chartSub}>Responses received by day of week</div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-softer)" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)', fontSize: 13 }}
                      labelStyle={{ color: 'var(--color-text-muted)', fontSize: 11, marginBottom: 2 }}
                      formatter={(v) => [`${v} responses`, 'Received']}
                    />
                    <Bar dataKey="responses" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {dayData.map((d, i) => (
                        <Cell key={i} fill={d.day === bestDay?.day && bestDay.responses > 0 ? 'var(--color-accent)' : 'var(--color-accent-dim)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {bestDay?.responses > 0 && (
                <div className={styles.insightNote}>
                  Peak responses on <strong className={styles.insightHighlight}>{bestDay.day}</strong> — best day to schedule campaigns
                </div>
              )}
            </div>

            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Feedback Overview</div>
              <div className={styles.chartSub}>Customer responses received over time</div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={feedbackData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-softer)" vertical={false} />
                    <XAxis dataKey={fbLabel} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }} interval="preserveStartEnd" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)', fontSize: 13 }}
                      labelStyle={{ color: 'var(--color-text-muted)', fontSize: 11, marginBottom: 2 }}
                      formatter={(v) => [`${v} responses`, 'Received']}
                    />
                    <Bar dataKey="received" fill="var(--color-accent)" radius={[2, 2, 0, 0]} maxBarSize={range === '90' ? 24 : 16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.insightNote}>
                Response rate: <strong className={styles.insightHighlight}>{data.response_rate}%</strong> across {data.responding_customers} of {data.messaged_customers} contacted customers
              </div>
            </div>

            <div className={`${styles.chartCard} ${styles.placeholderCard}`}>
              <div className={styles.placeholderIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s2-6 11-6 11 6 11 6-2 6-11 6-11-6-11-6z" /><circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className={styles.placeholderTitle}>Customer Returning</div>
              <div className={styles.placeholderSub}>Track repeat customer engagement after first interaction</div>
              <div className={styles.placeholderBadge}>Coming soon</div>
            </div>

            <div className={`${styles.chartCard} ${styles.placeholderCard}`}>
              <div className={styles.placeholderIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className={styles.placeholderTitle}>Revenue from Returning</div>
              <div className={styles.placeholderSub}>Revenue generated by repeat customers over time</div>
              <div className={styles.placeholderBadge}>Coming soon</div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
