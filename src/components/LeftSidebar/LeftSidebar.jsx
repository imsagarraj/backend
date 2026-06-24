import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import logoSrc from '../../assets/logo.svg'
import styles from './LeftSidebar.module.css'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/customers', label: 'Customers', icon: 'Users' },
  { path: '/campaigns', label: 'Campaigns', icon: 'Megaphone' },
  { path: '/ai-assistant', label: 'AI Agent', icon: 'Bot' },
  { path: '/insights', label: 'Insights', icon: 'BarChart3' },
  { path: '/business-profile', label: 'Business', icon: 'Building2' },
  { path: '/billing', label: 'Billing', icon: 'CreditCard' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
]

const iconMap = {
  LayoutDashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  Users: 'M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M7 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 20v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  Bot: 'M12 8V4m0 4a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4m0-8a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4M8 2h8M2 12h2m16 0h2M4 6h2m12 0h2',
  Megaphone: 'M15.536 8.464a5 5 0 0 1 0 7.072m2.828-9.9a9 9 0 0 1 0 12.728M5.586 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z',
  BarChart3: 'M3 3v18h18M7 16l4-4 4 4 5-5',
  Building2: 'M3 21h18M9 8h1m-1 4h1m-1 4h1m4-12h1m-1 4h1m-1 4h1m-6-4H6v10h3M9 21V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14',
  CreditCard: 'M3 10h18M3 6h18M3 18h18M3 14h18',
  Settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1.08H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z',
}

const sidebarVariants = {
  hidden: { x: -60, opacity: 0 },
  visible: {
    x: 0, opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
}

const navVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { x: -16, opacity: 0 },
  visible: {
    x: 0, opacity: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
  }
}

export default function LeftSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useApp()
  const { user, signOut } = useAuth()

  const displayName = user?.user_metadata?.full_name || user?.email || 'User'
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <motion.aside
      className={styles.sidebar}
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
    >
      <div className={styles.brand}>
        <img src={logoSrc} alt="VI" className={styles.logo} />
        <span className={styles.brandName}>
          <span className={styles.brandAccent}>Cloud</span>
        </span>
      </div>
      {business && (
        <div className={styles.businessName}>
          {business.business_name || 'My Business'}
        </div>
      )}
      <div className={styles.divider} />
      <motion.nav className={styles.nav} variants={navVariants}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path
          return (
            <motion.button
              key={item.path}
              className={`${styles.navItem} ${isActive ? styles.navActive : ''}`}
              onClick={() => navigate(item.path)}
              variants={itemVariants}
              whileHover={!isActive ? { x: 4 } : {}}
              whileTap={{ scale: 0.97 }}
            >
              <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={iconMap[item.icon]} />
              </svg>
              <span className={styles.navLabel}>{item.label}</span>
            </motion.button>
          )
        })}
      </motion.nav>
      <div className={styles.footer}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{displayName}</div>
          <div className={styles.userRole}>Owner</div>
        </div>
        <motion.button
          className={styles.logoutBtn}
          onClick={handleLogout}
          title="Logout"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </motion.button>
      </div>
    </motion.aside>
  )
}
