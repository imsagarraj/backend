import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { verifyAdmin } from '../lib/api'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function checkAdmin(user) {
    try {
      const result = await verifyAdmin()
      setIsAdmin(result.is_admin)
    } catch {
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        checkAdmin(session.user)
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
        setIsAdmin(false)
        setLoading(false)
      }
    })
    return () => listener?.subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    setUser(data.user)
    setLoading(true)
    try {
      const result = await verifyAdmin()
      setIsAdmin(result.is_admin)
    } catch {
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
    return { data }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }

  return (
    <AdminAuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
