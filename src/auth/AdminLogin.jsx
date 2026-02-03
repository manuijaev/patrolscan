import { useState } from 'react'
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconLogin,
  IconAlertCircle,
  IconLoader2,
} from '@tabler/icons-react'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'
import { saveAuth } from './authStore'
import LoginLayout from '../components/layout/LoginLayout'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/admin/login', { email, password })
      saveAuth(res.data.token, { role: 'admin' })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginLayout
      title="Admin Login"
      subtitle="Sign in to manage patrol operations."
      icon={<IconLogin size={20} />}
      footer="Need access? Contact your system admin."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 
            border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
            <IconAlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)]">
            Email
          </label>
          <div className="relative group">
            <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] 
              group-focus-within:text-[color:var(--accent)] transition-colors" size={18} />
            <input
              type="email"
              placeholder="admin@patrolscan.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[color:var(--bg-muted)]
                border border-[color:var(--border)] focus:outline-none focus:border-[color:var(--accent)]
                focus:ring-2 focus:ring-[color:var(--accent)]/20 transition-all text-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)]">
            Password
          </label>
          <div className="relative group">
            <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] 
              group-focus-within:text-[color:var(--accent)] transition-colors" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-lg bg-[color:var(--bg-muted)]
                border border-[color:var(--border)] focus:outline-none focus:border-[color:var(--accent)]
                focus:ring-2 focus:ring-[color:var(--accent)]/20 transition-all text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]
                hover:text-[color:var(--text)] transition"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[color:var(--border)] 
                text-[color:var(--accent)] focus:ring-[color:var(--accent)]
                cursor-pointer"
            />
            <span className="text-xs text-[color:var(--text-muted)] group-hover:text-[color:var(--text)] transition">
              Remember me
            </span>
          </label>
          <button
            type="button"
            className="text-xs text-[color:var(--accent)] hover:text-[color:var(--accent-strong)] transition"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-[color:var(--accent)] text-white
            hover:bg-[color:var(--accent-strong)] transition-all font-medium text-sm
            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </LoginLayout>
  )
}
