import { Navigate } from 'react-router-dom'
import { getUser } from './authStore'

function matchesRole(userRole, expectedRole) {
  if (!expectedRole) return true
  if (expectedRole === 'admin') {
    return userRole === 'admin' || userRole === 'super-admin'
  }
  return userRole === expectedRole
}

export default function RequireAuth({
  children,
  role,
  loginPath = '/admin-login',
}) {
  const user = getUser()

  if (!user) {
    return <Navigate to={loginPath} replace />
  }

  if (role) {
    const roles = Array.isArray(role) ? role : [role]
    const allowed = roles.some(expected => matchesRole(user.role, expected))
    if (!allowed) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}
