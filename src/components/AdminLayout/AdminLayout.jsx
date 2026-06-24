import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logoSrc from '../../assets/logo.svg'
import styles from './AdminLayout.module.css'

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { path: '/admin/businesses', label: 'Businesses', icon: 'M3 21h18M9 8h1m-1 4h1m-1 4h1m4-12h1m-1 4h1m-1 4h1m-6-4H6v10h3M9 21V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14' },
  { path: '/admin/pipeline', label: 'Pipeline', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { path: '/admin/followups', label: 'Follow-ups', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
  { path: '/admin/agents', label: 'AI Agents', icon: 'M12 8V4m0 4a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4m0-8a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4M8 2h8M2 12h2m16 0h2M4 6h2m12 0h2' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()

  const displayName = user?.user_metadata?.full_name || user?.email || 'Admin'
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ display: 'flex' }}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src={logoSrc} alt="VI" className={styles.logo} />
          <span className={styles.brandName}>
            <span className={styles.brandAccent}>Cloud</span>
          </span>
          <span className={styles.badge}>Admin</span>
        </div>

        <nav className={styles.nav}>
          <div className={styles.sectionLabel}>Platform</div>
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                className={`${styles.navItem} ${isActive ? styles.navActive : ''}`}
                onClick={() => navigate(item.path)}
              >
                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className={styles.footer}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{displayName}</div>
            <div className={styles.userRole}>Admin</div>
          </div>
          <button className={styles.logoutBtn} onClick={signOut} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
