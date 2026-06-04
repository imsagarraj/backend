import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Businesses from './pages/Businesses'
import BusinessDetail from './pages/BusinessDetail'
import Pipeline from './pages/Pipeline'
import Agents from './pages/Agents'

function ProtectedRoute({ children }) {
  const { user, isAdmin, loading } = useAdminAuth()
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!user || !isAdmin) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AdminAuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/businesses" element={<ProtectedRoute><Businesses /></ProtectedRoute>} />
          <Route path="/businesses/:id" element={<ProtectedRoute><BusinessDetail /></ProtectedRoute>} />
          <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
          <Route path="/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AdminAuthProvider>
  )
}
