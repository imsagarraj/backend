import styles from './Skeleton.module.css'

export function SkeletonLine({ width = '100%', height = 14 }) {
  return <div className={styles.line} style={{ width, height }} />
}

export function SkeletonBlock({ width = '100%', height = 80 }) {
  return <div className={styles.block} style={{ width, height }} />
}

export function SkeletonCircle({ size = 40 }) {
  return <div className={styles.circle} style={{ width: size, height: size }} />
}

export function SkeletonCard({ height = 120 }) {
  return <div className={styles.card} style={{ height }} />
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width={`${70 + Math.random() * 30}%`} height={12} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={styles.tableRow}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={`${50 + Math.random() * 50}%`} height={11} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonAvatar() {
  return (
    <div className={styles.avatarRow}>
      <SkeletonCircle size={36} />
      <div className={styles.avatarText}>
        <SkeletonLine width={120} height={13} />
        <SkeletonLine width={80} height={10} />
      </div>
    </div>
  )
}

export function SkeletonChart({ height = 200 }) {
  return <div className={styles.chart} style={{ height }} />
}
