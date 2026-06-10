import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import logoSrc from '../../assets/logo.svg'
import LineAnimation from './LineAnimation'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const { signInWithEmail, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signInWithEmail(email, password)
    if (result.error) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }
    if (result.isAdmin) {
      navigate('/admin/dashboard')
    }
    setLoading(false)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setResetLoading(true)

    const result = await resetPassword(resetEmail)
    if (result.error) {
      setError('Could not send reset email. Please check the email address.')
      setResetLoading(false)
    } else {
      setResetSent(true)
      setResetLoading(false)
    }
  }

  if (resetSent) {
    return (
      <motion.div
        className={styles.page}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.left}>
          <div className={styles.card}>
            <div className={styles.logo}>
              <img src={logoSrc} alt="VI" className={styles.logoImg} />
              <span className={styles.logoText}>
                <span className={styles.logoAccent}>Cloud</span>
              </span>
            </div>
            <h1 className={styles.title}>Check your inbox</h1>
            <p className={styles.subtitle}>
              We sent a password reset link to <strong>{resetEmail}</strong>.
            </p>
            <button
              className={styles.submitBtn}
              onClick={() => { setShowReset(false); setResetSent(false) }}
            >
              Back to login
            </button>
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

  if (showReset) {
    return (
      <motion.div
        className={styles.page}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.left}>
          <div className={styles.card}>
            <div className={styles.logo}>
              <img src={logoSrc} alt="VI" className={styles.logoImg} />
              <span className={styles.logoText}>
                <span className={styles.logoAccent}>Cloud</span>
              </span>
            </div>
            <h1 className={styles.title}>Reset your password</h1>
            <p className={styles.subtitle}>
              Enter your email and we'll send you a reset link.
            </p>

            {error && <div className={styles.errorMsg}>{error}</div>}

            <form className={styles.loginForm} onSubmit={handleResetPassword}>
              <input
                type="email"
                className={styles.emailInput}
                placeholder="you@company.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                disabled={resetLoading}
              />
              <button type="submit" className={styles.submitBtn} disabled={resetLoading}>
                {resetLoading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <button
              className={styles.backLink}
              onClick={() => { setShowReset(false); setError('') }}
            >
              ← Back to login
            </button>
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
    <motion.div
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className={styles.left}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <img src={logoSrc} alt="VI" className={styles.logoImg} />
            <span className={styles.logoText}>
              <span className={styles.logoAccent}>Cloud</span>
            </span>
          </div>

          <h1 className={styles.title}>Continue to VICloud</h1>
          <p className={styles.subtitle}>Sign in with your email and password</p>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <form className={styles.loginForm} onSubmit={handleLogin}>
            <input
              type="email"
              className={styles.emailInput}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <input
              type="password"
              className={styles.emailInput}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          <button
            className={styles.forgotLink}
            onClick={() => setShowReset(true)}
          >
            Forgot password?
          </button>
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
