import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'

import Dashboard from './pages/Dashboard'
import Patrols from './pages/Patrols'
import Guards from './pages/Guards'
import Checkpoints from './pages/Checkpoints'
import IncidentReports from './pages/IncidentReports'
import ScanQR from './pages/ScanQR'
import UpcomingPatrols from './pages/UpcomingPatrols'
import SupervisorDashboard from './pages/SupervisorDashboard'
import Settings from './pages/Settings'

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

  if (user?.role === 'supervisor') {
    return <Navigate to="/supervisor-dashboard" replace />
  }

  // Not logged in, show guard login
  return <GuardLogin />
}

export default function App() {
  const user = getUser()
  const defaultRoute = user?.role === 'supervisor' ? '/supervisor-dashboard' : '/dashboard'
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
          <RequireAuth role={["admin", "supervisor"]} loginPath="/admin-login">
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to={defaultRoute} replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="supervisor-dashboard" element={<SupervisorDashboard />} />
        <Route path="guards" element={<Guards />} />
        <Route path="checkpoints" element={<Checkpoints />} />
        <Route path="patrols" element={<Patrols />} />
        <Route path="upcoming-patrols" element={<UpcomingPatrols />} />
        <Route path="reports" element={<IncidentReports />} />
        <Route path="settings" element={<Settings />} />
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
