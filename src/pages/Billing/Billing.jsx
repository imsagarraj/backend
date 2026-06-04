import { useState } from 'react'
import { motion } from 'framer-motion'
import styles from './Billing.module.css'

const plans = [
  {
    name: 'Starter', price: '₹2,999', features: [
      'WhatsApp follow-ups', 'Up to 100 customers', '500 messages/month',
      '1 default AI agent', 'Basic analytics', 'Email support',
    ],
  },
  {
    name: 'Growth', price: '₹7,999', featured: true, features: [
      'WhatsApp + Email', 'Up to 500 customers', '2,000 messages/month',
      '3 AI agents (1 premium)', 'Advanced analytics', 'Smart timing', 'Priority support',
    ],
  },
  {
    name: 'Pro', price: '₹19,999', features: [
      'WhatsApp + Email + AI Calls', 'Unlimited customers', 'Unlimited messages',
      'All AI agents unlocked', 'Full analytics', 'Smart timing + mirroring',
      'Dedicated account manager', 'API access',
    ],
  },
]

const paymentHistory = [
  { date: '01 May 2025', plan: 'Starter', amount: '₹2,999', status: 'Paid' },
  { date: '01 Apr 2025', plan: 'Starter', amount: '₹2,999', status: 'Paid' },
  { date: '01 Mar 2025', plan: 'Starter', amount: '₹2,999', status: 'Paid' },
  { date: '01 Feb 2025', plan: 'Free Trial', amount: '₹0', status: 'Paid' },
]

export default function Billing() {
  const [currentPlan, setCurrentPlan] = useState('Starter')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className={styles.pageTitle}>Billing & Plans</div>
      <div className={styles.pageSubtitle}>Manage your Vi subscription</div>

      {/* Current Plan */}
      <div className={styles.currentPlan}>
        <div className={styles.planInfo}>
          <div className={styles.planName}>{currentPlan} Plan</div>
          <div className={styles.planPrice}>₹2,999<span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>/month</span></div>
          <div className={styles.planRenewal}>Renews on 01 Jun 2025</div>
        </div>
        <div className={styles.planUsage}>
          <div className={styles.usageBar}>
            <div className={styles.usageLabel}><span>Messages</span><span>234 / 500</span></div>
            <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: '46.8%' }} /></div>
          </div>
          <div className={styles.usageBar}>
            <div className={styles.usageLabel}><span>Customers</span><span>48 / 100</span></div>
            <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: '48%' }} /></div>
          </div>
          <button className={styles.upgradeBtn}>Upgrade Plan</button>
        </div>
      </div>

      {/* All Plans */}
      <div className={styles.plansGrid}>
        {plans.map(plan => (
          <div key={plan.name} className={`${styles.planCard} ${plan.featured ? styles.planCardFeatured : ''}`}>
            {plan.featured && <div className={styles.planBadge}>Popular</div>}
            <div className={styles.planCardName}>{plan.name}</div>
            <div className={styles.planCardPrice}>{plan.price}<span>/month</span></div>
            <ul className={styles.planFeatures}>
              {plan.features.map(f => (
                <li key={f} className={styles.planFeature}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`${styles.planCta} ${currentPlan === plan.name ? styles.planCtaCurrent : ''}`}
              onClick={() => setCurrentPlan(plan.name)}
            >
              {currentPlan === plan.name ? 'Current Plan' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>

      {/* Payment History */}
      <div className={styles.sectionTitle}>Payment History</div>
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {paymentHistory.map((p, i) => (
              <tr key={i}>
                <td>{p.date}</td>
                <td>{p.plan}</td>
                <td>{p.amount}</td>
                <td><span className={`${styles.statusBadge} ${styles[p.status.toLowerCase()]}`}>{p.status}</span></td>
                <td><button className={styles.downloadBtn}>Download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Method */}
      <div className={styles.sectionTitle}>Payment Method</div>
      <div className={styles.paymentCard}>
        <div className={styles.cardInfo}>
          <div className={styles.cardIcon}>VISA</div>
          <span className={styles.cardEnding}>•••• 4242</span>
        </div>
        <button className={styles.updateBtn}>Update Payment Method</button>
      </div>
    </motion.div>
  )
}
