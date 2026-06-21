import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import styles from './RightSidebar.module.css'

export default function RightSidebar() {
  const { viPaused, setViPaused, customers, dashboardData, business, agents } = useApp()

  const activeAgent = agents.find(a => a.id === business?.active_agent_id)

  const stats = useMemo(() => {
    const sent = customers.length
    const replied = customers.filter(c => c.status === 'Replied').length
    const noReply = customers.filter(c => c.status === 'No Reply').length
    const responseRate = replied + noReply > 0
      ? Math.round((replied / (replied + noReply)) * 100)
      : dashboardData?.stats?.week_response_rate || 0

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const weekNew = customers.filter(c => {
      const d = c.created_at || c.purchase_date
      return d && new Date(d) >= weekAgo
    }).length

    return { sent, replied, responseRate, weekNew }
  }, [customers, dashboardData])

  const todaySchedule = useMemo(() => {
    if (dashboardData?.todays_schedule && dashboardData.todays_schedule.length > 0) {
      return dashboardData.todays_schedule.slice(0, 3).map(s => ({
        id: s.customer_id,
        time: 'Today',
        customer: s.name,
        type: `Touch ${s.sequence_day}/5`,
        status: 'Scheduled',
      }))
    }
    return customers
      .filter(c => c.stage && c.stage !== 'Done')
      .slice(0, 3)
      .map(c => ({
        id: c.id,
        time: '--:--',
        customer: c.name,
        type: c.stage,
        status: 'Scheduled',
      }))
  }, [dashboardData, customers])

  return (
    <aside className={styles.sidebar}>
      <div className={styles.scrollArea}>

        <div>
          <div className={styles.sectionTitle}>Your AI Agent</div>
          <div className={styles.agentCard}>
            <div className={styles.agentRow}>
              <div className={styles.agentAvatar}>
                {activeAgent?.agent_name?.[0] || 'A'}
                <span className={`${styles.statusDot} ${viPaused ? styles.dotPaused : styles.dotActive}`} />
              </div>
              <div className={styles.agentInfo}>
                <div className={styles.agentName}>{activeAgent?.agent_name || 'Not set'}</div>
                <div className={styles.agentStatus}>
                  {viPaused ? 'Paused' : 'Active'}
                </div>
              </div>
            </div>
            <div className={styles.agentMiniStats}>
              <div className={styles.miniStat}>
                <div className={styles.miniStatNumber}>{dashboardData?.agent?.today_sent ?? stats.sent}</div>
                <div className={styles.miniStatLabel}>sent today</div>
              </div>
              <div className={styles.miniStat}>
                <div className={styles.miniStatNumber}>{dashboardData?.agent?.today_replies ?? stats.replied}</div>
                <div className={styles.miniStatLabel}>replies</div>
              </div>
            </div>
            <button
              className={`${styles.pauseBtn} ${viPaused ? styles.resumeBtn : ''}`}
              onClick={() => setViPaused(!viPaused)}
            >
              {viPaused ? 'Resume Vi' : 'Pause Vi'}
            </button>
          </div>
        </div>

        <div>
          <div className={styles.sectionTitle}>Going Out Today</div>
          <div className={styles.scheduleList}>
            {todaySchedule.length === 0 ? (
              <div className={styles.emptyState}>No more today</div>
            ) : (
              todaySchedule.map(item => (
                <div key={item.id} className={styles.scheduleItem}>
                  <span className={styles.scheduleTime}>{item.time}</span>
                  <div className={styles.scheduleInfo}>
                    <span className={styles.scheduleCustomer}>{item.customer}</span>
                    <span className={`${styles.scheduleType} ${
                      item.type === 'Touch 1/5' ? styles.typeDay1 :
                      item.type === 'Touch 2/5' ? styles.typeDay3 :
                      item.type === 'Touch 3/5' ? styles.typeDay15 :
                      item.type === 'Touch 4/5' ? styles.typeDay30 :
                      styles.typeCustom
                    }`}>{item.type}</span>
                  </div>
                  <span className={item.status === 'Sent' ? styles.statusSent : styles.statusScheduled}>
                    {item.status === 'Sent' ? 'Sent' : 'Scheduled'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className={styles.sectionTitle}>This Week</div>
          <div className={styles.weekStats}>
            <div className={styles.weekStat}>
              <div className={styles.weekStatInfo}>
                <div className={styles.weekStatHeader}>
                  <span className={styles.weekStatLabel}>Response Rate</span>
                  <span className={styles.weekStatValue}>{stats.responseRate}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${stats.responseRate}%` }} />
                </div>
              </div>
            </div>
            <div className={styles.weekStat}>
              <div className={styles.weekStatInfo}>
                <div className={styles.weekStatHeader}>
                  <span className={styles.weekStatLabel}>Messages Sent</span>
                  <span className={styles.weekStatValue}>{stats.sent}</span>
                </div>
              </div>
            </div>
            <div className={styles.weekStat}>
              <div className={styles.weekStatInfo}>
                <div className={styles.weekStatHeader}>
                  <span className={styles.weekStatLabel}>New Customers</span>
                  <span className={styles.weekStatValue}>{stats.weekNew}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </aside>
  )
}
