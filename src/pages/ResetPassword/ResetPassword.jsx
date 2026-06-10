import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import logoSrc from '../../assets/logo.svg'
import LineAnimation from '../Login/LineAnimation'
import styles from '../Login/Login.module.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setChecking(false)
      }
    })
    const timer = setTimeout(() => setChecking(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('Could not reset password. The link may have expired.')
    } else {
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  if (done) {
    return (
      <motion.div className={styles.page} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className={styles.left}>
          <div className={styles.card}>
            <div className={styles.logo}>
              <img src={logoSrc} alt="VI" className={styles.logoImg} />
              <span className={styles.logoText}><span className={styles.logoAccent}>Cloud</span></span>
            </div>
            <h1 className={styles.title}>Password updated</h1>
            <p className={styles.subtitle}>
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.glow} />
          <LineAnimation />
          <div className={styles.overlay}>
            <h2 className={styles.overlayTitle}>VICloud</h2>
            <p className={styles.overlaySub}>intelligent voice infrastructure</p>
          </div>
        </div>
      </motion.div>
    )
  }

  if (checking) {
    return (
      <motion.div className={styles.page} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className={styles.left}>
          <div className={styles.card}>
            <div className={styles.logo}>
              <img src={logoSrc} alt="VI" className={styles.logoImg} />
              <span className={styles.logoText}><span className={styles.logoAccent}>Cloud</span></span>
            </div>
            <h1 className={styles.title}>Checking...</h1>
            <p className={styles.subtitle}>Verifying your reset link...</p>
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.glow} />
          <LineAnimation />
          <div className={styles.overlay}>
            <h2 className={styles.overlayTitle}>VICloud</h2>
            <p className={styles.overlaySub}>intelligent voice infrastructure</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div className={styles.page} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={styles.left}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <img src={logoSrc} alt="VI" className={styles.logoImg} />
            <span className={styles.logoText}><span className={styles.logoAccent}>Cloud</span></span>
          </div>
          <h1 className={styles.title}>Set new password</h1>
          <p className={styles.subtitle}>Enter your new password below.</p>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <form className={styles.loginForm} onSubmit={handleSubmit}>
            <input
              type="password"
              className={styles.emailInput}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
            <input
              type="password"
              className={styles.emailInput}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Updating...' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.glow} />
        <LineAnimation />
        <div className={styles.overlay}>
          <h2 className={styles.overlayTitle}>VICloud</h2>
          <p className={styles.overlaySub}>intelligent voice infrastructure</p>
        </div>
      </div>
    </motion.div>
  )
}
