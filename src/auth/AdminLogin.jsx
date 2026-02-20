import { useState, useEffect } from 'react'
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconLoader2,
  IconShield,
  IconCheck,
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
  const [isSuccess, setIsSuccess] = useState(false)

  // Handle keyboard submission
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && email && password && !loading) {
        handleSubmit(e)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [email, password, loading])

  async function handleSubmit(e) {
    e?.preventDefault()
    if (loading) return
    
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/admin/login', { email, password })
      saveAuth(res.data.token, { role: 'admin' })
      setIsSuccess(true)
      setTimeout(() => navigate('/dashboard'), 600)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginLayout
      title="Admin Portal"
      subtitle="Secure access for administrators"
      icon={<IconShield size={24} />}
      footer={
        <div className="space-y-2">
          <p>Need access? Contact your system administrator</p>
          <button
            type="button"
            onClick={() => window.location.href = '/guard-login?browser=true'}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Switch to Guard Login
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 
            border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            <IconAlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {isSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 
            border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm">
            <IconCheck size={16} />
            <span>Login successful. Redirecting...</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wide">
            Email Address
          </label>
          <div className="relative group">
            <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] 
              group-focus-within:text-[color:var(--accent)] transition-colors" size={20} />
            <input
              type="email"
              placeholder="admin@patrolscan.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              className="w-full pl-11 pr-4 py-3 rounded-lg bg-[color:var(--bg-muted)]
                border border-[color:var(--border)] focus:outline-none focus:border-[color:var(--accent)]
                focus:ring-2 focus:ring-[color:var(--accent)]/20 transition-all text-sm
                placeholder:text-[color:var(--text-muted)]"
              required
              disabled={loading || isSuccess}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wide">
            Password
          </label>
          <div className="relative group">
            <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] 
              group-focus-within:text-[color:var(--accent)] transition-colors" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              className="w-full pl-11 pr-11 py-3 rounded-lg bg-[color:var(--bg-muted)]
                border border-[color:var(--border)] focus:outline-none focus:border-[color:var(--accent)]
                focus:ring-2 focus:ring-[color:var(--accent)]/20 transition-all text-sm
                placeholder:text-[color:var(--text-muted)]"
              required
              disabled={loading || isSuccess}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]
                hover:text-[color:var(--text)] transition p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[color:var(--border)] 
                text-[color:var(--accent)] focus:ring-[color:var(--accent)]
                cursor-pointer transition-colors"
            />
            <span className="text-sm text-[color:var(--text-muted)] group-hover:text-[color:var(--text)] transition">
              Remember me
            </span>
          </label>
          <button
            type="button"
            className="text-sm text-[color:var(--accent)] hover:text-[color:var(--accent-strong)] transition"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || isSuccess || !email || !password}
          className="w-full py-3 rounded-lg bg-[color:var(--accent)] text-white
            hover:bg-[color:var(--accent-strong)] transition-all font-medium text-sm
            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
            shadow-lg shadow-[color:var(--accent)]/20"
        >
          {loading ? (
            <>
              <IconLoader2 size={18} className="animate-spin" />
              Authenticating...
            </>
          ) : isSuccess ? (
            <>
              <IconCheck size={18} />
              Welcome Back
            </>
          ) : (
            'Sign In to Admin Portal'
          )}
        </button>
      </form>
    </LoginLayout>
  )
}
