import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SkeletonLine, SkeletonCircle, SkeletonBlock } from './components/Skeleton/Skeleton'
import Login from './pages/Login/Login'
import ResetPassword from './pages/ResetPassword/ResetPassword'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import Customers from './pages/Customers/Customers'
import CustomerProfile from './pages/Customers/CustomerProfile'
import AIAssistant from './pages/AIAssistant/AIAssistant'
import Campaigns from './pages/Campaigns/Campaigns'
import Insights from './pages/Insights/Insights'
import BusinessProfile from './pages/BusinessProfile/BusinessProfile'
import Billing from './pages/Billing/Billing'
import Settings from './pages/Settings/Settings'
import Onboarding from './components/Onboarding/Onboarding'
import AdminLayout from './components/AdminLayout/AdminLayout'
import AdminDashboard from './pages/Admin/AdminDashboard'
import AdminBusinesses from './pages/Admin/AdminBusinesses'
import AdminBusinessDetail from './pages/Admin/AdminBusinessDetail'
import AdminPipeline from './pages/Admin/AdminPipeline'
import AdminAgents from './pages/Admin/AdminAgents'

function ProtectedRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()

  if (loading || isAdmin === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: 240 }}>
          <SkeletonCircle size={48} />
          <SkeletonLine width={160} height={16} />
          <SkeletonLine width={120} height={12} />
          <SkeletonBlock width={200} height={80} style={{ marginTop: 8 }} />
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()

  if (loading || isAdmin === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: 240 }}>
          <SkeletonCircle size={48} />
          <SkeletonLine width={160} height={16} />
          <SkeletonLine width={120} height={12} />
          <SkeletonBlock width={200} height={80} style={{ marginTop: 8 }} />
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()

  if (loading || isAdmin === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: 240 }}>
          <SkeletonCircle size={48} />
          <SkeletonLine width={160} height={16} />
          <SkeletonLine width={120} height={12} />
          <SkeletonBlock width={200} height={80} style={{ marginTop: 8 }} />
        </div>
      </div>
    )
  }

  if (user) {
    if (isAdmin) return <Navigate to="/admin/dashboard" replace />
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerProfile />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="insights" element={<Insights />} />
        <Route path="business-profile" element={<BusinessProfile />} />
        <Route path="billing" element={<Billing />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="businesses" element={<AdminBusinesses />} />
        <Route path="businesses/:id" element={<AdminBusinessDetail />} />
        <Route path="pipeline" element={<AdminPipeline />} />
        <Route path="agents" element={<AdminAgents />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AppProvider>
    </AuthProvider>
  )
}
