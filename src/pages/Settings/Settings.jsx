import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { deleteBusinessAccount } from '../../lib/api'
import styles from './Settings.module.css'

const integrations = [
  { name: 'Shopify', icon: 'SH' },
  { name: 'WooCommerce', icon: 'WC' },
  { name: 'Razorpay', icon: 'RZ' },
  { name: 'Zoho CRM', icon: 'ZC' },
  { name: 'Google Sheets', icon: 'GS' },
]

export default function Settings() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [notifPrefs, setNotifPrefs] = useState({
    customerReply: true,
    dailySummary: true,
    weeklyReport: false,
    failedAlert: true,
    billingReminders: true,
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const toggleNotif = key => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    setDeleting(true)
    setError('')
    try {
      await deleteBusinessAccount()
      await signOut()
      navigate('/login')
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
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
            <button className={styles.fieldAction} onClick={() => window.open('/privacy.html', '_blank')}>View</button>
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

          {!showDeleteConfirm ? (
            <button className={styles.dangerBtn} onClick={() => setShowDeleteConfirm(true)}>
              Delete Account Permanently
            </button>
          ) : (
            <div className={styles.deleteConfirm}>
              {error && <div className={styles.deleteError}>{error}</div>}
              <p className={styles.deleteConfirmText}>
                This will permanently delete your entire business account, all customers, messages, campaigns, and settings. <strong>This cannot be undone.</strong>
              </p>
              <p className={styles.deleteConfirmLabel}>Type <strong>DELETE</strong> to confirm:</p>
              <input
                className={styles.deleteConfirmInput}
                type="text"
                placeholder="Type DELETE"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                autoFocus
              />
              <div className={styles.deleteConfirmActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                    setError('')
                  }}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className={styles.confirmDeleteBtn}
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
