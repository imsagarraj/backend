import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(undefined)

  async function checkAdminStatus(user) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS
      const isAdminByEmail = ADMIN_EMAILS && user?.email
        ? ADMIN_EMAILS.split(',').map(e => e.trim()).includes(user.email)
        : false

      setIsAdmin(isAdminByEmail)
    } catch {
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setIsAdmin(false)
        setLoading(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        checkAdminStatus(session.user)
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }

    const ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS
    const isAdminByEmail = ADMIN_EMAILS
      ? ADMIN_EMAILS.split(',').map(e => e.trim()).includes(email)
      : false

    if (isAdminByEmail) {
      setIsAdmin(true)
    }

    return { data, isAdmin: isAdminByEmail }
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    })
    if (error) return { error }
    return { success: true }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        signInWithEmail,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
