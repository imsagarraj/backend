import { Outlet } from 'react-router-dom'
import LeftSidebar from '../LeftSidebar/LeftSidebar'
import styles from './Layout.module.css'

export default function Layout() {
  return (
    <div className={styles.layout}>
      <LeftSidebar />
      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
