import { Navigate } from 'react-router-dom'
import { getUser } from './authStore'

export default function RequireAuth({
  children,
  role,
  loginPath = '/admin-login',
}) {
  const user = getUser()

  if (!user) {
    return <Navigate to={loginPath} replace />
  }

  if (role && user.role !== role) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
