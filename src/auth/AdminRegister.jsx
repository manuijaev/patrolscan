import { useEffect, useState } from 'react'
import {
  IconAlertCircle,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconKey,
  IconLoader2,
  IconLock,
  IconMail,
  IconShieldPlus,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { saveAuth } from './authStore'
import LoginLayout from '../components/layout/LoginLayout'

export default function AdminRegister() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [registrationKey, setRegistrationKey] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [switchClass, setSwitchClass] = useState('')
  const [entryClass, setEntryClass] = useState('')

  useEffect(() => {
    const direction = sessionStorage.getItem('login_flip_in')
    if (direction === 'left' || direction === 'right') {
      setEntryClass(`login-flip-in-${direction}`)
      sessionStorage.removeItem('login_flip_in')
      const timer = setTimeout(() => setEntryClass(''), 650)
      return () => clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e) {
    e?.preventDefault()
    if (loading) return

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError('')
    setLoading(true)

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password,
      }

      if (registrationKey.trim()) {
        payload.registrationKey = registrationKey.trim()
      }

      const res = await api.post('/auth/admin/register', payload)
      const userRole = res.data.role || 'admin'
      saveAuth(res.data.token, { role: userRole }, rememberMe)
      setSuccess(true)
      const nextRoute = userRole === 'supervisor' ? '/supervisor-dashboard' : '/dashboard'
      setTimeout(() => navigate(nextRoute), 700)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register admin')
    } finally {
      setLoading(false)
    }
  }

  function switchToAdminLogin() {
    if (loading || success || switchClass) return
    setSwitchClass('login-flip-out-right')
    sessionStorage.setItem('login_flip_in', 'right')
    setTimeout(() => navigate('/admin-login'), 420)
  }

  return (
    <LoginLayout
      title="Register Admin"
      subtitle="Create a persistent administrator account"
      icon={<IconShieldPlus size={24} />}
      transitionClass={`${entryClass} ${switchClass}`.trim()}
      footer={
        <div className="space-y-2">
          <p>Need to sign in instead?</p>
          <button
            type="button"
            onClick={switchToAdminLogin}
            className="text-sm text-[color:var(--accent)] hover:text-[color:var(--accent-strong)] hover:underline transition"
            disabled={!!switchClass}
          >
            Back to Admin Login
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 login-form">
        {error && (
          <div className="login-alert login-alert-error flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            <IconAlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="login-alert login-alert-success flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm">
            <IconCheck size={16} />
            <span>Registration successful. Redirecting...</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wide">
            Email Address
          </label>
          <div className="relative group login-input-wrap">
            <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] group-focus-within:text-[color:var(--accent)] transition-colors" size={20} />
            <input
              type="email"
              placeholder="admin@patrolscan.com"
              value={email}
              onChange={e => {
                setEmail(e.target.value)
                setError('')
              }}
              className="login-input w-full pl-11 pr-4 py-3 rounded-lg bg-[color:var(--bg-muted)] border border-[color:var(--border)] focus:outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/20 transition-all text-sm placeholder:text-[color:var(--text-muted)]"
              required
              disabled={loading || success}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wide">
            Password
          </label>
          <div className="relative group login-input-wrap">
            <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] group-focus-within:text-[color:var(--accent)] transition-colors" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                setError('')
              }}
              className="login-input w-full pl-11 pr-11 py-3 rounded-lg bg-[color:var(--bg-muted)] border border-[color:var(--border)] focus:outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/20 transition-all text-sm placeholder:text-[color:var(--text-muted)]"
              required
              disabled={loading || success}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wide">
            Confirm Password
          </label>
          <div className="relative group login-input-wrap">
            <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] group-focus-within:text-[color:var(--accent)] transition-colors" size={20} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value)
                setError('')
              }}
              className="login-input w-full pl-11 pr-11 py-3 rounded-lg bg-[color:var(--bg-muted)] border border-[color:var(--border)] focus:outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/20 transition-all text-sm placeholder:text-[color:var(--text-muted)]"
              required
              disabled={loading || success}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition p-1"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wide">
            Registration Key (Optional)
          </label>
          <div className="relative group login-input-wrap">
            <IconKey className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] group-focus-within:text-[color:var(--accent)] transition-colors" size={20} />
            <input
              type="text"
              placeholder="Required after the first admin"
              value={registrationKey}
              onChange={e => {
                setRegistrationKey(e.target.value)
                setError('')
              }}
              className="login-input w-full pl-11 pr-4 py-3 rounded-lg bg-[color:var(--bg-muted)] border border-[color:var(--border)] focus:outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/20 transition-all text-sm placeholder:text-[color:var(--text-muted)]"
              disabled={loading || success}
              autoComplete="off"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-[color:var(--border)] text-[color:var(--accent)] focus:ring-[color:var(--accent)] cursor-pointer transition-colors"
          />
          <span className="text-sm text-[color:var(--text-muted)] group-hover:text-[color:var(--text)] transition">
            Keep me signed in
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || success || !email || !password || !confirmPassword}
          className="login-cta w-full py-3 rounded-lg bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-strong)] transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[color:var(--accent)]/20"
        >
          {loading ? (
            <>
              <IconLoader2 size={18} className="animate-spin" />
              Creating Admin...
            </>
          ) : success ? (
            <>
              <IconCheck size={18} />
              Account Created
            </>
          ) : (
            'Create Admin Account'
          )}
        </button>
      </form>
    </LoginLayout>
  )
}
