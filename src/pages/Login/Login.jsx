import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import logoSrc from '../../assets/logo.svg'
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
    if (result.isAdmin) navigate('/admin/dashboard')
    setLoading(false)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setResetLoading(true)
    const result = await resetPassword(resetEmail)
    if (result.error) {
      setError('Could not send reset email.')
      setResetLoading(false)
    } else {
      setResetSent(true)
      setResetLoading(false)
    }
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
  }

  return (
    <motion.div className={styles.page} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className={styles.left} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <AnimatePresence mode="wait">
          {resetSent ? (
            <motion.div key="sent" className={styles.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <motion.div className={styles.logo} variants={fadeUp}>
                <img src={logoSrc} alt="Cloud" className={styles.logoImg} />
                <span className={styles.logoText}><span className={styles.logoAccent}>Cloud</span></span>
              </motion.div>
              <motion.div className={styles.checkCircle} variants={fadeUp}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </motion.div>
              <motion.h1 className={styles.title} variants={fadeUp}>Check your inbox</motion.h1>
              <motion.p className={styles.subtitle} variants={fadeUp}>We sent a reset link to <strong>{resetEmail}</strong>.</motion.p>
              <motion.button className={styles.submitBtn} onClick={() => { setShowReset(false); setResetSent(false) }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                Back to login
              </motion.button>
            </motion.div>
          ) : showReset ? (
            <motion.div key="reset" className={styles.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <motion.div className={styles.logo} variants={fadeUp}>
                <img src={logoSrc} alt="Cloud" className={styles.logoImg} />
                <span className={styles.logoText}><span className={styles.logoAccent}>Cloud</span></span>
              </motion.div>
              <motion.h1 className={styles.title} variants={fadeUp}>Reset password</motion.h1>
              <motion.p className={styles.subtitle} variants={fadeUp}>Enter your email and we'll send a reset link.</motion.p>
              <AnimatePresence>
                {error && <motion.div className={styles.errorMsg} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>{error}</motion.div>}
              </AnimatePresence>
              <motion.form className={styles.loginForm} onSubmit={handleResetPassword} variants={fadeUp}>
                <input type="email" className={styles.emailInput} placeholder="you@company.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required disabled={resetLoading} />
                <motion.button type="submit" className={styles.submitBtn} disabled={resetLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  {resetLoading ? 'Sending...' : 'Send reset link'}
                </motion.button>
              </motion.form>
              <motion.button className={styles.backLink} onClick={() => { setShowReset(false); setError('') }} whileHover={{ x: -2 }}>← Back to login</motion.button>
            </motion.div>
          ) : (
            <motion.div key="login" className={styles.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <motion.div className={styles.logo} variants={fadeUp}>
                <img src={logoSrc} alt="Cloud" className={styles.logoImg} />
                <span className={styles.logoText}><span className={styles.logoAccent}>Cloud</span></span>
              </motion.div>
              <motion.h1 className={styles.title} variants={fadeUp}>Welcome back</motion.h1>
              <motion.p className={styles.subtitle} variants={fadeUp}>Sign in to your account</motion.p>
              <AnimatePresence>
                {error && <motion.div className={styles.errorMsg} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>{error}</motion.div>}
              </AnimatePresence>
              <motion.form className={styles.loginForm} onSubmit={handleLogin} variants={fadeUp}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Email</label>
                  <input type="email" className={styles.emailInput} placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Password</label>
                  <input type="password" className={styles.emailInput} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
                </div>
                <motion.button type="submit" className={styles.submitBtn} disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  {loading ? 'Signing in...' : 'Log in'}
                </motion.button>
              </motion.form>
              <motion.button className={styles.forgotLink} onClick={() => setShowReset(true)} whileHover={{ opacity: 0.7 }}>Forgot password?</motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div className={styles.right} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <div className={styles.glow} />
        <div className={styles.gridBg} />
        <div className={styles.overlay}>
          <motion.div className={styles.overlayLogo} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <img src={logoSrc} alt="Cloud" className={styles.overlayLogoImg} />
            <span className={styles.overlayTitle}>Cloud</span>
          </motion.div>
          <motion.p className={styles.overlaySub} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>intelligent voice infrastructure</motion.p>
        </div>
      </motion.div>
    </motion.div>
  )
}
