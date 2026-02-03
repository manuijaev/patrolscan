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

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/guard-login" element={<GuardLogin />} />

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
  )
}
