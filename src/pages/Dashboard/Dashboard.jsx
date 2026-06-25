import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, animate } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

import { useApp } from '../../context/AppContext'
import { SkeletonCard } from '../../components/Skeleton/Skeleton'
import NotificationDropdown from '../../components/Notifications/NotificationDropdown'
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

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function AnimatedNumber({ value, suffix = '' }) {
  const [display, setDisplay] = useState(value)
  const motionValue = useMotionValue(0)

  useEffect(() => {
    const unsubscribe = motionValue.on('change', (v) => {
      setDisplay(Math.round(v))
    })
    const controls = animate(motionValue, value, {
      type: 'spring', stiffness: 50, damping: 15, duration: 1,
    })
    return () => { unsubscribe(); controls.stop() }
  }, [value, motionValue])

  return <span>{display}{suffix}</span>
}

function Sparkline({ data = [3, 6, 4, 7, 5, 8, 6, 9, 7, 10, 8, 11], color = 'var(--color-accent)' }) {
  const w = 80; const h = 28
  const max = Math.max(...data); const min = Math.min(...data)
  const range = max - min || 1
  const px = (i) => (i / (data.length - 1)) * w
  const py = (v) => h - ((v - min) / range) * h
  const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(0)},${py(v).toFixed(0)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </svg>
  )
}

function MiniBar({ value = 0.6 }) {
  const w = 80; const h = 28; const barW = 4; const gap = 3; const bars = 12
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {Array.from({ length: bars }).map((_, i) => {
        const bh = Math.max(4, (0.2 + Math.random() * 0.8) * h * value)
        return (
          <rect key={i} x={i * (barW + gap)} y={h - bh} width={barW} height={bh}
            rx="2" fill="var(--color-accent)" opacity={Math.max(0.15, 0.1 + i * 0.06)} />
        )
      })}
    </svg>
  )
}

function generateTimeSeries(stats, days) {
  const baseSent = (stats?.today_sent || 45) / (days === 7 ? 1 : 30) * days
  const baseReceived = (stats?.today_replies || 28) / (days === 7 ? 1 : 30) * days
  const now = new Date()
  const data = []
  for (let i = 0; i < days; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - (days - 1 - i))
    const trend = Math.sin((i / days) * Math.PI * 1.6) * 0.18 + 1
    const sent = Math.max(3, Math.round((baseSent / days) * trend * (0.8 + Math.random() * 0.4)))
    const received = Math.max(1, Math.round((baseReceived / days) * trend * (0.6 + Math.random() * 0.6)))
    data.push({
      date,
      label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      sent,
      received,
    })
  }
  return data
}

function EngagementChart({ stats }) {
  const [range, setRange] = useState('7d')
  const [tooltip, setTooltip] = useState(null)
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const data = useMemo(() => generateTimeSeries(stats, days), [stats, days])

  const margin = { top: 8, right: 16, bottom: 28, left: 38 }
  const svgW = 600; const svgH = 200
  const innerW = svgW - margin.left - margin.right
  const innerH = svgH - margin.top - margin.bottom

  const allVals = data.flatMap(d => [d.sent, d.received])
  const maxRaw = Math.max(...allVals, 1)
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxRaw)))
  const yMax = Math.ceil(maxRaw / (magnitude / 2)) * (magnitude / 2)
  const yTicks = [0, Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75), yMax]

  const xScale = (i) => margin.left + (i / (data.length - 1)) * innerW
  const yScale = (v) => margin.top + innerH - (v / yMax) * innerH

  function buildPath(key) {
    return data.map((d, i) => {
      const x = xScale(i); const y = yScale(d[key])
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }

  function buildArea(key) {
    const line = data.map((d, i) => {
      const x = xScale(i); const y = yScale(d[key])
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
    return `${line} L${xScale(data.length - 1)},${margin.top + innerH} L${xScale(0)},${margin.top + innerH} Z`
  }

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width * svgW - margin.left
    const idx = Math.round((relX / innerW) * (data.length - 1))
    const i = Math.max(0, Math.min(data.length - 1, idx))
    setTooltip({ x: xScale(i), ...data[i] })
  }

  const labelInterval = days <= 7 ? 1 : days <= 30 ? Math.ceil(days / 6) : Math.ceil(days / 8)

  const totalSent = data.reduce((s, d) => s + d.sent, 0)
  const totalReceived = data.reduce((s, d) => s + d.received, 0)
  const engagementRate = totalSent > 0 ? Math.round((totalReceived / totalSent) * 100) : 0
  const avgResponse = stats?.week_response_rate ? `${Math.round(stats.week_response_rate)}%` : '—'

  const ranges = [
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: '90d', label: '90D' },
  ]

  function tooltipColor(v) {
    if (v >= 50) return 'var(--color-success)'
    if (v >= 30) return 'var(--color-accent)'
    return 'var(--color-error)'
  }

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <h3 className={styles.chartTitle}>Customer Engagement</h3>
          <p className={styles.chartSub}>Messages sent vs received over time</p>
        </div>
        <div className={styles.chartActions}>
          <div className={styles.timeRange}>
            {ranges.map(r => (
              <button key={r.key} onClick={() => { setRange(r.key); setTooltip(null) }}
                className={`${styles.timeBtn} ${range === r.key ? styles.timeBtnActive : ''}`}>
                {r.label}
              </button>
            ))}
          </div>
          <div className={styles.chartLegend}>
            <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: 'var(--color-accent)' }} /> Sent</span>
            <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: 'var(--color-success)' }} /> Received</span>
          </div>
        </div>
      </div>

      <div className={styles.chartBody} style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className={styles.chartSvg}
          onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
          <defs>
            <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="recvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map(v => (
            <g key={v}>
              <line x1={margin.left} y1={yScale(v)} x2={margin.left + innerW} y2={yScale(v)}
                stroke="var(--color-border-softer)" strokeWidth="1" />
              <text x={margin.left - 6} y={yScale(v) + 3} textAnchor="end"
                fill="var(--color-text-muted)" fontSize="9" fontFamily="var(--font-sans)">
                {v}
              </text>
            </g>
          ))}

          <path d={buildArea('sent')} fill="url(#sentGrad)" />
          <path d={buildArea('received')} fill="url(#recvGrad)" />

          <motion.path d={buildPath('sent')}
            fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.path d={buildPath('received')}
            fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />

          {data.map((d, i) => (
            i % labelInterval === 0 || i === data.length - 1 ? (
              <text key={i} x={xScale(i)} y={svgH - 4} textAnchor="middle"
                fill="var(--color-text-muted)" fontSize="8" fontFamily="var(--font-sans)">
                {d.label}
              </text>
            ) : null
          ))}

          {tooltip && (
            <>
              <line x1={tooltip.x} y1={margin.top} x2={tooltip.x} y2={margin.top + innerH}
                stroke="var(--color-text-muted)" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
              <circle cx={tooltip.x} cy={yScale(tooltip.sent)} r="4"
                fill="var(--color-accent)" stroke="var(--color-bg-card)" strokeWidth="2" />
              <circle cx={tooltip.x} cy={yScale(tooltip.received)} r="4"
                fill="var(--color-success)" stroke="var(--color-bg-card)" strokeWidth="2" />
            </>
          )}
        </svg>

        {tooltip && (
          <div className={styles.tooltip} style={{ left: `${(tooltip.x / svgW) * 100}%` }}>
            <div className={styles.tooltipDate}>{tooltip.label}</div>
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipDot} style={{ background: 'var(--color-accent)' }} />
              Sent: {tooltip.sent}
            </div>
            <div className={styles.tooltipRow}>
              <span className={styles.tooltipDot} style={{ background: 'var(--color-success)' }} />
              Received: {tooltip.received}
            </div>
          </div>
        )}
      </div>

      <div className={styles.engagementSummary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Sent</span>
          <span className={styles.summaryValue} style={{ color: 'var(--color-accent)' }}>
            {totalSent.toLocaleString()}
          </span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Received</span>
          <span className={styles.summaryValue} style={{ color: 'var(--color-success)' }}>
            {totalReceived.toLocaleString()}
          </span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Engagement Rate</span>
          <span className={styles.summaryValue} style={{ color: tooltipColor(engagementRate) }}>
            {engagementRate}%
          </span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Response Rate</span>
          <span className={styles.summaryValue}>{avgResponse}</span>
        </div>
      </div>
    </div>
  )
}

const metrics = [
  { label: 'Total Customers', icon: 'users', key: 'total_customers', sparkline: true },
  { label: 'Messages Sent', icon: 'message', key: 'today_sent', sparkline: false },
  { label: 'Response Rate', icon: 'activity', key: 'week_response_rate', suffix: '%', sparkline: true },
  { label: 'Replies Today', icon: 'reply', key: 'today_replies', sparkline: true },
]

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }
  })
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } }
}

const chartPath = 'M0,50 C30,45 60,55 100,40 C140,25 180,35 220,30 C260,25 300,15 340,20 C380,25 420,10 460,15 C500,20 530,8 560,12'

export default function Dashboard() {
  const navigate = useNavigate()
  const { business, customers, dashboardData, dashboardLoading } = useApp()
  const displayName = business?.owner_name || business?.business_name || 'User'
  const hasData = customers.length > 0
  const stats = dashboardData?.stats
  const activity = dashboardData?.recent_activity || []
  const schedule = dashboardData?.todays_schedule || []
  const pipeline = dashboardData?.pipeline || {}

  function getStat(key) {
    const val = stats?.[key]
    if (key === 'total_customers') return val ?? customers.length
    if (key === 'week_response_rate') return val ?? 0
    if (key === 'today_sent') return val ?? 0
    if (key === 'today_replies') return val ?? 0
    return val ?? 0
  }

  function getSuffix(key) {
    return key === 'week_response_rate' ? '%' : ''
  }

  if (dashboardLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
        <div className={styles.header}>
          <div><SkeletonCard height={28} /><SkeletonCard height={14} style={{ marginTop: 4 }} /></div>
          <div style={{ display: 'flex', gap: 10 }}><SkeletonCard height={38} width={180} /><SkeletonCard height={38} width={38} /></div>
        </div>
        <SkeletonCard height={120} style={{ marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 2 }}><SkeletonCard height={320} /></div>
          <div style={{ flex: 1 }}><SkeletonCard height={320} /></div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <motion.div className={styles.header} variants={sectionVariants} custom={0}>
        <div>
          <h1 className={styles.greeting}>{getGreeting()}, {displayName}</h1>
          <p className={styles.date}>{formatDate()}</p>
        </div>
        <div className={styles.headerActions}>
          <NotificationDropdown />
          <motion.div
            className={styles.avatarSmall}
            whileHover={{ scale: 1.05 }}
          >
            {getInitials(displayName)}
          </motion.div>
        </div>
      </motion.div>

      <motion.div className={styles.metricsGrid} variants={sectionVariants} custom={1}>
        {metrics.map((m, i) => (
          <motion.div
            key={m.key}
            className={styles.metricCard}
            whileHover={{ y: -4, boxShadow: 'var(--shadow-xl)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className={styles.metricTop}>
              <span className={styles.metricLabel}>{m.label}</span>
              <Sparkline color={m.key === 'week_response_rate' ? 'var(--color-success)' : 'var(--color-accent)'} />
            </div>
            <div className={styles.metricValue}>
              <AnimatedNumber value={getStat(m.key)} suffix={getSuffix(m.key)} />
            </div>
            <div className={styles.metricFooter}>
              <span className={styles.metricTrend}>+{Math.floor(Math.random() * 20) + 2}%</span>
              <span className={styles.metricPeriod}>vs last period</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div className={styles.chartRow} variants={sectionVariants} custom={2}>
        <EngagementChart stats={stats} />

        <div className={styles.sidePanel}>
          <div className={styles.panelCard}>
            <h3 className={styles.panelTitle}>AI Agent</h3>
            {dashboardData?.agent ? (
              <div className={styles.agentBody}>
                <div className={styles.agentAvatarLarge}>
                  {dashboardData.agent.name?.[0] || 'A'}
                </div>
                <div className={styles.agentNameLarge}>{dashboardData.agent.name}</div>
                <div className={styles.agentMetrics}>
                  <div className={styles.agentMetric}>
                    <span className={styles.agentMetricValue}>{dashboardData.agent.today_sent}</span>
                    <span className={styles.agentMetricLabel}>Sent today</span>
                  </div>
                  <div className={styles.agentDivider} />
                  <div className={styles.agentMetric}>
                    <span className={styles.agentMetricValue}>{dashboardData.agent.today_replies}</span>
                    <span className={styles.agentMetricLabel}>Replies</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className={styles.emptySmall}>No agent configured</p>
            )}
          </div>

          <div className={styles.panelCard}>
            <h3 className={styles.panelTitle}>Queue Status</h3>
            <div className={styles.queueBody}>
              <div className={styles.queueItem}>
                <span className={styles.queueLabel}>Pending</span>
                <span className={styles.queueValue}>{pipeline.pending || 0}</span>
              </div>
              <div className={styles.queueItem}>
                <span className={styles.queueLabel}>Failed</span>
                <span className={`${styles.queueValue} ${(pipeline.failed || 0) > 0 ? styles.queueFailed : ''}`}>{pipeline.failed || 0}</span>
              </div>
              <div className={styles.queueItem}>
                <span className={styles.queueLabel}>Sent today</span>
                <span className={styles.queueValue}>{pipeline.sent_today || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div className={styles.bottomRow} variants={sectionVariants} custom={3}>
        <div className={styles.activityCard}>
          <h3 className={styles.sectionCardTitle}>Recent Activity</h3>
          {activity.length === 0 ? (
            <p className={styles.emptySmall}>No activity yet</p>
          ) : (
            <div className={styles.activityList}>
              {activity.slice(0, 6).map((item, i) => (
                <motion.div
                  key={i}
                  className={styles.activityItem}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.03, duration: 0.3 }}
                >
                  <div className={`${styles.activityDot} ${item.direction === 'received' ? styles.dotReceived : styles.dotSent}`} />
                  <div className={styles.activityInfo}>
                    <span className={styles.activityCustomer}>{item.customer_name}</span>
                    <span className={styles.activityAction}>{item.direction === 'sent' ? 'Message sent' : 'Reply received'}</span>
                  </div>
                  <span className={styles.activityTime}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.activityCard}>
          <h3 className={styles.sectionCardTitle}>Today's Schedule</h3>
          {schedule.length === 0 ? (
            <p className={styles.emptySmall}>No messages scheduled</p>
          ) : (
            <div className={styles.scheduleList}>
              {schedule.slice(0, 6).map((item, i) => (
                <motion.div
                  key={i}
                  className={styles.scheduleItem}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.03, duration: 0.3 }}
                >
                  <span className={styles.scheduleName}>{item.name}</span>
                  <span className={`${styles.scheduleBadge} ${
                    item.sequence_day === 1 ? styles.badgeBlue :
                    item.sequence_day === 2 ? styles.badgeOrange :
                    styles.badgePurple
                  }`}>
                    Touch {item.sequence_day || 0}
                  </span>
                  <span className={styles.scheduleTime}>
                    {item.scheduled_at ? new Date(item.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
          {pipeline.pending > 0 && (
            <div className={styles.pipelineNote}>{pipeline.pending} messages queued</div>
          )}
        </div>

        <div className={styles.activityCard}>
          <h3 className={styles.sectionCardTitle}>Quick Actions</h3>
          <div className={styles.quickActions}>
            {[
              { label: 'Add Customer', path: '/customers', icon: 'M12 5v14M5 12h14' },
              { label: 'Send Broadcast', path: '/campaigns', icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
              { label: 'View Insights', path: '/insights', icon: 'M3 3v18h18M7 16l4-4 4 4 5-5' },
              { label: 'Change Agent', path: '/ai-assistant', icon: 'M12 8V4m0 4a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4m0-8a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4' },
            ].map((action, i) => (
              <motion.button
                key={action.path}
                className={styles.quickBtn}
                onClick={() => navigate(action.path)}
                whileHover={{ x: 4, borderColor: 'var(--color-accent)' }}
                whileTap={{ scale: 0.97 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={action.icon} />
                </svg>
                <span>{action.label}</span>
                <svg className={styles.quickArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
