import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { useApp } from '../../context/AppContext'
import { getAnalytics } from '../../lib/api'
import { SkeletonCard, SkeletonChart, SkeletonLine } from '../../components/Skeleton/Skeleton'
import styles from './Insights.module.css'

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hours = Array.from({ length: 16 }, (_, i) => `${i + 6}`)

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

  const empty = !loading && (!data || data.total_customers === 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
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

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <SkeletonCard height={100} />
            <SkeletonCard height={100} />
            <SkeletonCard height={100} />
            <SkeletonCard height={100} />
          </div>
          <SkeletonChart height={220} />
          <div style={{ display: 'flex', gap: 16 }}>
            <SkeletonCard height={180} />
            <SkeletonCard height={180} />
          </div>
        </div>
      ) : empty ? (
        <div className={`${styles.chartCard} ${styles.emptyState}`}>
          <div className={styles.emptyIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18M7 16l4-4 4 4 5-5M7 12l4-4 4 4 5-5"/></svg>
          </div>
          <div className={styles.emptyTitle}>Not enough data yet</div>
          <div className={styles.emptySubtitle}>Insights will appear once Vi sends your first 10 messages</div>
        </div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            {[
              { value: String(data.messages_sent), label: 'Total Messages\nSent' },
              { value: String(data.messages_received), label: 'Total Replies\nReceived' },
              { value: `${data.response_rate}%`, label: 'Overall Response\nRate' },
              { value: String(data.total_customers), label: 'Total\nCustomers' },
            ].map(s => (
              <div key={s.value} className={styles.statCard}>
                <div className={styles.statNumber}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Messages Over Time</div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.messages_per_day || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F2DECE" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #F2DECE', borderRadius: 8, color: '#1a1a1a', fontSize: 13 }} />
                    <Area type="monotone" dataKey="sent" stroke="#6b7280" strokeWidth={2} fill="rgba(107,114,128,0.1)" dot={false} />
                    <Area type="monotone" dataKey="received" stroke="#c85a1a" strokeWidth={2} fill="rgba(200,90,26,0.1)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Response Rate</div>
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>{data.response_rate}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Overall response rate</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}
