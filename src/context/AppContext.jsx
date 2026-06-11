import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  fetchCustomers, addCustomer as dbAdd,
  updateCustomer as dbUpdate, deleteCustomer as dbDelete,
  fetchBusinessProfile, upsertBusinessProfile as dbUpsertBusiness,
} from '../lib/db'
import { getDashboard, listAgents } from '../lib/api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { user: authUser } = useAuth()
  const [user, setUser] = useState(null)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [business, setBusiness] = useState(null)
  const [businessLoading, setBusinessLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [agents, setAgents] = useState([])
  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [viPaused, setViPaused] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')

  useEffect(() => {
    if (!authUser) {
      setCustomers([])
      setCustomersLoading(false)
      setBusiness(null)
      setBusinessLoading(false)
      setDashboardData(null)
      setAgents([])
      return
    }
    setCustomersLoading(true)
    fetchCustomers()
      .then(data => setCustomers(data || []))
      .catch(() => setCustomers([]))
      .finally(() => setCustomersLoading(false))

    setBusinessLoading(true)
    fetchBusinessProfile()
      .then(data => setBusiness(data || null))
      .catch(() => setBusiness(null))
      .finally(() => setBusinessLoading(false))

    listAgents()
      .then(data => setAgents(data || []))
      .catch(() => setAgents([]))
  }, [authUser])

  useEffect(() => {
    if (business?.id) {
      setDashboardLoading(true)
      getDashboard(business.id)
        .then(data => setDashboardData(data))
        .catch(() => setDashboardData(null))
        .finally(() => setDashboardLoading(false))
    } else {
      setDashboardData(null)
    }
  }, [business?.id])

  const addCustomer = useCallback(async (customerData) => {
    const newCustomer = await dbAdd({ ...customerData, user_id: authUser.id, business_id: business?.id })
    setCustomers(prev => [newCustomer, ...prev])
    return newCustomer
  }, [authUser, business])

  const updateCustomer = useCallback(async (id, updates) => {
    const updated = await dbUpdate(id, updates)
    setCustomers(prev => prev.map(c => c.id === id ? updated : c))
    return updated
  }, [])

  const deleteCustomer = useCallback(async (id) => {
    await dbDelete(id)
    setCustomers(prev => prev.filter(c => c.id !== id))
  }, [])

  const saveBusiness = useCallback(async (profileData) => {
    const saved = await dbUpsertBusiness({ ...profileData, user_id: authUser.id })
    setBusiness(saved)
    return saved
  }, [authUser])

  const refreshDashboard = useCallback(async () => {
    if (!business?.id) return
    setDashboardLoading(true)
    try {
      const data = await getDashboard(business.id)
      setDashboardData(data)
    } catch {
      setDashboardData(null)
    } finally {
      setDashboardLoading(false)
    }
  }, [business?.id])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }, [])

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <AppContext.Provider value={{
      user: authUser || user, setUser,
      onboardingComplete, setOnboardingComplete,
      business, setBusiness,
      businessLoading,
      saveBusiness,
      customers, setCustomers,
      customersLoading,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      notifications, unreadCount, markAllRead,
      agents,
      dashboardData, dashboardLoading, refreshDashboard,
      viPaused, setViPaused,
      autoRefresh, setAutoRefresh,
      currentPage, setCurrentPage,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
