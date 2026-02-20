import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'

import Dashboard from './pages/Dashboard'
import Patrols from './pages/Patrols'
import Guards from './pages/Guards'
import Checkpoints from './pages/Checkpoints'
import Reports from './pages/Reports'
import ScanQR from './pages/ScanQR'

import AdminLogin from './auth/AdminLogin'
import GuardLogin from './auth/GuardLogin'
import RequireAuth from './auth/RequireAuth'
import { getUser } from './auth/authStore'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import DynamicManifest from './components/DynamicManifest'

function GuardLoginPage() {
  const user = getUser()
  
  // If guard is already logged in, stay on guard login (PWA behavior)
  if (user?.role === 'guard') {
    return <GuardLogin />
  }
  
  // If admin is logged in, redirect to dashboard
  if (user?.role === 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  
  // Not logged in, show guard login
  return <GuardLogin />
}

export default function App() {
  return (
    <>
      <DynamicManifest />
      <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/guard-login" replace />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/guard-login" element={<GuardLoginPage />} />

      {/* Protected */}
      {/* Admin App */}
      <Route
        element={
          <RequireAuth role="admin" loginPath="/admin-login">
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="guards" element={<Guards />} />
        <Route path="checkpoints" element={<Checkpoints />} />
        <Route path="patrols" element={<Patrols />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Guard App */}
      <Route
        path="scan"
        element={
          <RequireAuth role="guard" loginPath="/guard-login">
            <ScanQR />
          </RequireAuth>
        }
      />
      </Routes>
      <PWAInstallPrompt />
    </>
  )
}
