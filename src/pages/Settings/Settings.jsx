import { useState } from 'react'
import { motion } from 'framer-motion'
import styles from './Settings.module.css'

const integrations = [
  { name: 'Shopify', icon: 'SH' },
  { name: 'WooCommerce', icon: 'WC' },
  { name: 'Razorpay', icon: 'RZ' },
  { name: 'Zoho CRM', icon: 'ZC' },
  { name: 'Google Sheets', icon: 'GS' },
]

export default function Settings() {
  const [notifPrefs, setNotifPrefs] = useState({
    customerReply: true,
    dailySummary: true,
    weeklyReport: false,
    failedAlert: true,
    billingReminders: true,
  })

  const toggleNotif = key => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className={styles.pageTitle}>Settings</div>

      {/* Account Settings */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Account Settings</div>
        <div className={styles.card}>
          <div className={styles.field}>
            <div className={styles.fieldInfo}>
              <div className={styles.fieldLabel}>Email Address</div>
              <div className={styles.fieldDesc}>amit@sunrisedental.com</div>
            </div>
            <button className={styles.fieldAction}>Change</button>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldInfo}>
              <div className={styles.fieldLabel}>Password</div>
              <div className={styles.fieldDesc}>Last changed 3 months ago</div>
            </div>
            <button className={styles.fieldAction}>Change</button>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldInfo}>
              <div className={styles.fieldLabel}>Two-Factor Authentication</div>
              <div className={styles.fieldDesc}>Add an extra layer of security to your account</div>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" />
              <span className={styles.toggleSlider} />
            </label>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldInfo}>
              <div className={styles.fieldLabel}>WhatsApp Business Number</div>
              <div className={styles.fieldDesc}>+91 98765 43210 — Connected ✓</div>
            </div>
            <button className={styles.fieldAction}>Reconnect</button>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Notification Preferences</div>
        <div className={styles.card}>
          {[
            { key: 'customerReply', label: 'Email when customer replies', desc: 'Get notified when a customer responds' },
            { key: 'dailySummary', label: 'Daily summary report', desc: 'Receive a daily digest via email' },
            { key: 'weeklyReport', label: 'Weekly analytics report', desc: 'Full weekly analytics in your inbox' },
            { key: 'failedAlert', label: 'Alert when message fails', desc: 'Immediate notification on delivery failure' },
            { key: 'billingReminders', label: 'Billing reminders', desc: 'Get reminded before plan renewal' },
          ].map(item => (
            <div key={item.key} className={styles.field}>
              <div className={styles.fieldInfo}>
                <div className={styles.fieldLabel}>{item.label}</div>
                <div className={styles.fieldDesc}>{item.desc}</div>
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" checked={notifPrefs[item.key]} onChange={() => toggleNotif(item.key)} />
                <span className={styles.toggleSlider} />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Data & Privacy */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Data & Privacy</div>
        <div className={styles.card}>
          <div className={styles.field}>
            <div className={styles.fieldInfo}>
              <div className={styles.fieldLabel}>Download all my data</div>
              <div className={styles.fieldDesc}>Export all your business data in a single file</div>
            </div>
            <button className={styles.fieldAction}>Download</button>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldInfo}>
              <div className={styles.fieldLabel}>Delete all customer data</div>
              <div className={styles.fieldDesc}>Permanently remove all customer records</div>
            </div>
            <button className={`${styles.fieldAction} ${styles.fieldActionDanger}`}>Delete</button>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldInfo}>
              <div className={styles.fieldLabel}>Privacy Policy</div>
            </div>
            <button className={styles.fieldAction}>View</button>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldInfo}>
              <div className={styles.fieldLabel}>Terms of Service</div>
            </div>
            <button className={styles.fieldAction}>View</button>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Integrations</div>
        <div className={styles.integrationsGrid}>
          {integrations.map(integration => (
            <div key={integration.name} className={styles.integrationCard}>
              <div className={styles.integrationIcon}>{integration.icon}</div>
              <span className={styles.integrationName}>{integration.name}</span>
              <span className={styles.comingSoonBadge}>Coming Soon</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className={styles.section}>
        <div className={styles.dangerZone}>
          <div className={styles.dangerTitle}>Danger Zone</div>
          <div className={styles.dangerText}>These actions are irreversible. Please proceed with caution.</div>
          <div className={styles.dangerActions}>
            <button className={`${styles.dangerBtn} ${styles.dangerBtnFilled}`}>Deactivate Account</button>
            <button className={styles.dangerBtn}>Delete Account Permanently</button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
